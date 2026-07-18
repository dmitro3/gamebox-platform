import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  MAHJONG_BASE_BET,
  MAHJONG_CASCADE_MULTIPLIERS,
  MAHJONG_FREE_SPIN_MULTIPLIERS,
  MAHJONG_PAY_SYMBOLS,
  MAHJONG_PAYTABLE,
  mahjongFreeSpinsFromScatters,
  type MahjongCascadeStepDTO,
  type MahjongGridPosDTO,
  type MahjongPaySymbolId,
  type MahjongSpinRequestDTO,
  type MahjongSpinResultDTO,
  type MahjongSymbolId,
  type MahjongTileDTO,
} from '@gamebox/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { RiskService } from '../risk/risk.service';
import { businessNo } from './business-id';
import { deriveRandom, genServerSeed, weightedPick } from './fairness.util';
import { GameConfigCache } from './game-config.cache';

const GAME_CODE = 'slots-mahjong';
const COLS = 5;
const TOTAL_ROWS = 6;
const VISIBLE_ROWS = [1, 2, 3, 4] as const;
const GOLDEN_REELS = new Set([1, 2, 3]);
const MAX_CASCADES = 20;
const REBATE_RATE = 0.005;

const DEFAULT_SYMBOL_WEIGHTS: Record<MahjongSymbolId, number> = {
  '2t': 16, '2s': 16, '5t': 12, '5s': 12,
  '8w': 9, bai: 7, zhong: 6, fa: 5, wild: 2, hu: 2.5,
};

interface MahjongConfig {
  symbolWeights?: Partial<Record<MahjongSymbolId, number>>;
  goldenChance?: number;
}

interface EvaluatedWin {
  totalWin: number;
  winCells: MahjongGridPosDTO[];
  scatterCount: number;
}

@Injectable()
export class MahjongEngine {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
    private configCache: GameConfigCache,
    private risk: RiskService,
  ) {}

  async spin(
    playerId: string,
    request: MahjongSpinRequestDTO,
  ): Promise<MahjongSpinResultDTO> {
    if (!request.clientRequestId || request.clientRequestId.length > 100) {
      throw new BadRequestException('clientRequestId 无效');
    }

    const replay = await this.findReplay(playerId, request.clientRequestId);
    if (replay) return replay;

    const game = await this.configCache.get(GAME_CODE);
    const config = game?.configs[0];
    if (!game || game.status !== 'ONLINE' || !config) {
      throw new NotFoundException('麻将胡了未上线或未配置');
    }

    const feature = request.sessionId
      ? await this.prisma.slotFeatureSession.findUnique({ where: { id: request.sessionId } })
      : null;
    const isFree = Boolean(request.sessionId);
    if (isFree) {
      if (
        !feature ||
        feature.playerId !== playerId ||
        feature.gameId !== game.id ||
        feature.status !== 'ACTIVE' ||
        feature.spinsRemaining <= 0 ||
        feature.expiresAt <= new Date()
      ) {
        throw new BadRequestException('免费旋转会话无效或已结束');
      }
    }

    const amount = isFree ? feature!.lockedBetAmount : request.amount;
    if (!Number.isInteger(amount) || amount < game.minBet || amount > game.maxBet) {
      throw new BadRequestException(`下注额须为 ${game.minBet}~${game.maxBet} 的整数`);
    }

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();
    const clientSeed = request.clientSeed?.slice(0, 128) || request.clientRequestId;
    const generated = this.generateOutcome(
      serverSeed,
      clientSeed,
      amount,
      isFree,
      config.payTable as MahjongConfig,
    );
    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      if (feature) {
        const claimed = await tx.slotFeatureSession.updateMany({
          where: {
            id: feature.id,
            playerId,
            status: 'ACTIVE',
            version: feature.version,
            spinsRemaining: { gt: 0 },
            expiresAt: { gt: new Date() },
          },
          data: {
            spinsRemaining: { decrement: 1 },
            version: { increment: 1 },
          },
        });
        if (claimed.count === 0) throw new BadRequestException('免费旋转已被使用，请刷新状态');
      }

      const round = await tx.gameRound.create({
        data: {
          roundNo: businessNo('MJR'),
          gameId: game.id,
          category: 'SLOT',
          playerId,
          configVer: config.version,
          state: 'PLAYING',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: generated.nonce,
        },
      });
      const bet = await tx.bet.create({
        data: {
          betNo: businessNo('MJB'),
          clientRequestId: request.clientRequestId,
          playerId,
          gameId: game.id,
          roundId: round.id,
          betType: isFree ? 'FREE_SPIN' : 'SPIN',
          amount: isFree ? 0 : amount,
          status: 'PENDING',
        },
      });

      if (!isFree) {
        await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
          refType: 'round',
          refId: round.id,
          idempotencyKey: `mahjong_bet_player_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
          refType: 'round',
          refId: round.id,
          idempotencyKey: `mahjong_bet_plat_${bet.id}`,
        });
      }

      if (generated.totalWin > 0) {
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -generated.totalWin, 'WIN', {
          refType: 'round',
          refId: round.id,
          idempotencyKey: `mahjong_win_plat_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLAYER', playerId, generated.totalWin, 'WIN', {
          refType: 'round',
          refId: round.id,
          idempotencyKey: `mahjong_win_player_${bet.id}`,
        });
      }

      if (!isFree) {
        const rebate = Math.floor(amount * REBATE_RATE);
        if (rebate > 0) {
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebate, 'REBATE', {
            refType: 'round',
            refId: round.id,
            idempotencyKey: `mahjong_rebate_plat_${bet.id}`,
          });
          const ledger = await this.points.creditInTx(tx, 'PLAYER', playerId, rebate, 'REBATE', {
            refType: 'round',
            refId: round.id,
            idempotencyKey: `mahjong_rebate_player_${bet.id}`,
          });
          await tx.rebateRecord.create({
            data: {
              playerId,
              sourceRoundId: round.id,
              personalFlow: amount,
              rate: REBATE_RATE,
              amount: rebate,
              ledgerId: ledger.id,
            },
          });
        }
        if (player?.agentPath) {
          await this.commission.distributeInTx(tx, player, amount, round.id);
        }
      }

      const freeSpin = await this.updateFeatureSession(
        tx,
        playerId,
        game.id,
        feature?.id,
        amount,
        generated.spinsAwarded,
        generated.totalWin,
      );
      const spinType = isFree ? 'FREE' as const : 'BASE' as const;
      const outcome = {
        initialGrid: generated.initialGrid,
        cascades: generated.cascades,
        totalWin: generated.totalWin,
        spinType,
        freeSpin,
      };
      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: generated.totalWin > 0 ? 'WON' : 'LOST',
          payout: generated.totalWin,
          multiplier: amount > 0 ? generated.totalWin / amount : 0,
          odds: amount > 0 ? generated.totalWin / amount : 0,
          validFlow: isFree ? 0 : amount,
          settledAt: new Date(),
          payload: { sessionId: feature?.id, spinType: isFree ? 'FREE' : 'BASE' },
        },
      });
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED',
          totalFlow: isFree ? 0 : amount,
          endedAt: new Date(),
          outcome: outcome as unknown as Prisma.InputJsonValue,
        },
      });
      const account = await tx.pointsAccount.findUnique({
        where: { ownerId: playerId },
        select: { balance: true },
      });

      return {
        roundId: round.id,
        betId: bet.id,
        balance: account?.balance ?? 0,
        ...outcome,
        serverSeed,
        serverSeedHash,
      };
    });

    if (result.totalWin >= Math.max(amount * 50, 100_000)) {
      await this.risk.record({
        type: 'BIG_WIN',
        level: result.totalWin >= 1_000_000 ? 'CRITICAL' : 'WARN',
        targetId: result.roundId,
        detail: { playerId, gameCode: GAME_CODE, amount, payout: result.totalWin },
      });
    }
    return result;
  }

  private async findReplay(
    playerId: string,
    clientRequestId: string,
  ): Promise<MahjongSpinResultDTO | null> {
    const bet = await this.prisma.bet.findUnique({
      where: { clientRequestId },
      include: { round: true },
    });
    if (!bet) return null;
    if (bet.playerId !== playerId || !bet.round?.outcome) {
      throw new BadRequestException('clientRequestId 已被占用');
    }
    const account = await this.prisma.pointsAccount.findUnique({
      where: { ownerId: playerId },
      select: { balance: true },
    });
    const outcome = bet.round.outcome as unknown as Omit<
      MahjongSpinResultDTO,
      'roundId' | 'betId' | 'balance' | 'serverSeed' | 'serverSeedHash'
    >;
    return {
      roundId: bet.round.id,
      betId: bet.id,
      balance: account?.balance ?? 0,
      serverSeed: bet.round.serverSeed ?? '',
      serverSeedHash: bet.round.serverSeedHash ?? '',
      ...outcome,
    };
  }

  private generateOutcome(
    serverSeed: string,
    clientSeed: string,
    amount: number,
    isFree: boolean,
    rawConfig: MahjongConfig,
  ) {
    const config = (!rawConfig || Array.isArray(rawConfig) ? {} : rawConfig) as MahjongConfig;
    const weights = { ...DEFAULT_SYMBOL_WEIGHTS, ...(config.symbolWeights ?? {}) };
    const symbols = Object.keys(weights) as MahjongSymbolId[];
    const goldenChance = Math.min(1, Math.max(0, config.goldenChance ?? 0.14));
    let nonce = 0;
    const random = () => deriveRandom(serverSeed, clientSeed, ++nonce);
    const rollTile = (col: number): MahjongTileDTO => {
      const symbol = symbols[weightedPick(symbols.map((id) => weights[id] ?? 0), random())];
      const isGolden = MAHJONG_PAY_SYMBOLS.includes(symbol as MahjongPaySymbolId)
        && GOLDEN_REELS.has(col)
        && random() < goldenChance;
      return { symbol, isGolden };
    };
    const rollGrid = () => Array.from(
      { length: COLS },
      (_, col) => Array.from({ length: TOTAL_ROWS }, () => rollTile(col)),
    );

    const initialGrid = rollGrid();
    const grid = this.cloneGrid(initialGrid);
    const cascades: MahjongCascadeStepDTO[] = [];
    let totalWin = 0;
    let maxScatterCount = this.countScatters(grid);

    for (let index = 0; index < MAX_CASCADES; index++) {
      const evaluated = this.evaluate(grid, amount, index, isFree);
      maxScatterCount = Math.max(maxScatterCount, evaluated.scatterCount);
      if (evaluated.totalWin <= 0 || evaluated.winCells.length === 0) break;

      const goldenToWild = evaluated.winCells.filter(({ col, row }) => {
        const tile = grid[col]?.[row];
        return Boolean(tile?.isGolden && MAHJONG_PAY_SYMBOLS.includes(tile.symbol as MahjongPaySymbolId));
      });
      const goldenKeys = new Set(goldenToWild.map(({ col, row }) => `${col}:${row}`));
      const removeCells = evaluated.winCells.filter(
        ({ col, row }) => !goldenKeys.has(`${col}:${row}`),
      );
      for (const { col, row } of goldenToWild) {
        grid[col][row] = { symbol: 'wild', isGolden: false };
      }
      const refillColumns = this.dropAndRefill(grid, removeCells, rollTile);
      totalWin += evaluated.totalWin;
      cascades.push({
        cascadeIndex: index,
        multiplier: this.multiplier(index, isFree),
        winCells: evaluated.winCells,
        goldenToWild,
        removeCells,
        refillColumns,
        gridAfter: this.cloneGrid(grid),
        stepWin: evaluated.totalWin,
      });
    }

    return {
      initialGrid,
      cascades,
      totalWin,
      spinsAwarded: mahjongFreeSpinsFromScatters(maxScatterCount),
      nonce,
    };
  }

  private evaluate(
    grid: MahjongTileDTO[][],
    amount: number,
    cascadeIndex: number,
    isFree: boolean,
  ): EvaluatedWin {
    const winCells: MahjongGridPosDTO[] = [];
    let totalWin = 0;
    for (const symbol of MAHJONG_PAY_SYMBOLS) {
      const positionsByReel: MahjongGridPosDTO[][] = [];
      for (let col = 0; col < COLS; col++) {
        const positions = VISIBLE_ROWS
          .filter((row) => ['wild', symbol].includes(grid[col]?.[row]?.symbol))
          .map((row) => ({ col, row }));
        if (positions.length === 0) break;
        positionsByReel.push(positions);
      }
      if (positionsByReel.length < 3) continue;
      const ways = positionsByReel.reduce((product, positions) => product * positions.length, 1);
      const pay = MAHJONG_PAYTABLE[symbol][positionsByReel.length - 3];
      totalWin += Math.floor(
        (amount / MAHJONG_BASE_BET) * pay * ways * this.multiplier(cascadeIndex, isFree),
      );
      positionsByReel.forEach((positions) => winCells.push(...positions));
    }
    return {
      totalWin,
      winCells: this.dedupe(winCells),
      scatterCount: this.countScatters(grid),
    };
  }

  private multiplier(index: number, isFree: boolean): number {
    const ladder = isFree ? MAHJONG_FREE_SPIN_MULTIPLIERS : MAHJONG_CASCADE_MULTIPLIERS;
    return ladder[Math.min(index, ladder.length - 1)];
  }

  private countScatters(grid: MahjongTileDTO[][]): number {
    return grid.reduce(
      (sum, column) => sum + VISIBLE_ROWS.filter((row) => column[row]?.symbol === 'hu').length,
      0,
    );
  }

  private dedupe(cells: MahjongGridPosDTO[]): MahjongGridPosDTO[] {
    const seen = new Set<string>();
    return cells.filter(({ col, row }) => {
      const key = `${col}:${row}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private dropAndRefill(
    grid: MahjongTileDTO[][],
    removeCells: MahjongGridPosDTO[],
    rollTile: (col: number) => MahjongTileDTO,
  ) {
    const byColumn = new Map<number, Set<number>>();
    for (const { col, row } of removeCells) {
      const rows = byColumn.get(col) ?? new Set<number>();
      rows.add(row);
      byColumn.set(col, rows);
    }
    const refillColumns: Array<{ col: number; tiles: MahjongTileDTO[] }> = [];
    for (let col = 0; col < COLS; col++) {
      const rows = byColumn.get(col) ?? new Set<number>();
      if (rows.size === 0) continue;
      const kept = grid[col].filter((_, row) => !rows.has(row));
      const tiles = Array.from({ length: TOTAL_ROWS - kept.length }, () => rollTile(col));
      grid[col] = [...kept, ...tiles];
      refillColumns.push({ col, tiles });
    }
    return refillColumns;
  }

  private cloneGrid(grid: MahjongTileDTO[][]): MahjongTileDTO[][] {
    return grid.map((column) => column.map((tile) => ({ ...tile })));
  }

  private async updateFeatureSession(
    tx: Prisma.TransactionClient,
    playerId: string,
    gameId: string,
    sessionId: string | undefined,
    lockedBetAmount: number,
    spinsAwarded: number,
    spinWin: number,
  ) {
    if (!sessionId && spinsAwarded <= 0) return undefined;

    const session = sessionId
      ? await tx.slotFeatureSession.update({
          where: { id: sessionId },
          data: {
            spinsRemaining: { increment: spinsAwarded },
            totalWin: { increment: spinWin },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      : await tx.slotFeatureSession.create({
          data: {
            playerId,
            gameId,
            feature: 'FREE_SPIN',
            lockedBetAmount,
            spinsRemaining: spinsAwarded,
            totalWin: 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

    const completed = session.spinsRemaining <= 0
      ? await tx.slotFeatureSession.update({
          where: { id: session.id },
          data: { status: 'COMPLETED' },
        })
      : session;
    return {
      sessionId: completed.id,
      triggered: !sessionId && spinsAwarded > 0,
      retriggered: Boolean(sessionId && spinsAwarded > 0),
      spinsAwarded,
      spinsRemaining: completed.spinsRemaining,
      sessionTotalWin: completed.totalWin,
      lockedBetAmount: completed.lockedBetAmount,
    };
  }
}
