/**
 * 电子/街机类游戏结算引擎（SlotEngine）
 *
 * 资金流向（账目守恒）：
 *   下注：PLAYER -bet → PLATFORM +bet     （玩家把钱押入平台池）
 *   派彩：PLATFORM -payout → PLAYER +payout（平台池派彩给玩家）
 *   抽水：平台池里的利润自然留存（无需额外划账，payout < bet × 期望 → 平台净赚）
 *   佣金：PLATFORM -commission → 各级代理  （从平台池里分给代理链）
 *   回水：PLATFORM -rebate → PLAYER        （按有效流水返还一小部分给玩家）
 *
 * 每次 spin = 单事务内完成下注 + 开奖 + 结算（见 spin()），
 * placeBet/settle 保留以实现 IGameEngine 契约。
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { GameConfigCache } from './game-config.cache';
import { genServerSeed, deriveRandom, weightedPick } from './fairness.util';
import type { IGameEngine, PlaceBetInput, SettlementSummary } from './types';
import { businessNo } from './business-id';
import { RiskService } from '../risk/risk.service';

interface PayItem { label: string; multiplier: number; weight: number; }

/** 默认回水率（有效流水的 0.5%） */
const REBATE_RATE = 0.005;

@Injectable()
export class SlotEngine implements IGameEngine {
  readonly category = 'SLOT' as const;

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
    private configCache: GameConfigCache,
    private risk: RiskService,
  ) {}

  /**
   * 单事务 spin：下注 + 开奖 + 派彩 + 回水 + 佣金一次完成。
   * 任一步失败整体回滚，不会出现「已扣款未开奖」的中间态。
   */
  async spin(input: PlaceBetInput): Promise<SettlementSummary & { roundId: string }> {
    const { playerId, gameCode, amount, clientSeed = 'default' } = input;
    if (!Number.isInteger(amount) || amount < 1) throw new BadRequestException('下注额无效');

    const game = await this.configCache.get(gameCode);
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏不存在或已下架');
    if (amount < game.minBet || amount > game.maxBet) {
      throw new BadRequestException(`下注额须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const config = game.configs[0];
    if (!config) throw new BadRequestException('游戏未配置 payTable');
    const payTable = config.payTable as unknown as PayItem[];
    const weights = payTable.map(p => p.weight);

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();
    const rnd = deriveRandom(serverSeed, clientSeed, 1);
    const idx = weightedPick(weights, rnd);
    const prize = payTable[idx];

    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const roundNo = businessNo('R');
      const round = await tx.gameRound.create({
        data: {
          roundNo, gameId: game.id, category: 'SLOT',
          playerId, configVer: config.version,
          state: 'PLAYING', serverSeed, serverSeedHash, clientSeed, nonce: 1,
        },
      });
      const bet = await tx.bet.create({
        data: {
          betNo: businessNo('B'),
          playerId, gameId: game.id, roundId: round.id,
          amount, betType: 'SPIN', status: 'PENDING',
        },
      });

      // 玩家押注 → 平台池（幂等键基于 bet.id）
      await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
        refType: 'round', refId: round.id, remark: `下注 ${game.name}`,
        idempotencyKey: `bet_player_${bet.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
        refType: 'round', refId: round.id, remark: `${game.name} 注资`,
        idempotencyKey: `bet_plat_${bet.id}`,
      });

      const payout = Math.floor(amount * prize.multiplier);
      const won = payout > 0;

      if (won) {
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
          refType: 'round', refId: round.id,
          idempotencyKey: `win_plat_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLAYER', playerId, payout, 'WIN', {
          refType: 'round', refId: round.id,
          remark: `${game.name} 命中 ${prize.label}`,
          idempotencyKey: `win_player_${bet.id}`,
        });
      }

      const rebateAmt = Math.floor(amount * REBATE_RATE);
      if (rebateAmt > 0) {
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
          refType: 'round', refId: round.id,
          idempotencyKey: `rebate_plat_${bet.id}`,
        });
        const rebateLedger = await this.points.creditInTx(tx, 'PLAYER', playerId, rebateAmt, 'REBATE', {
          refType: 'round', refId: round.id, remark: '游戏回水',
          idempotencyKey: `rebate_player_${bet.id}`,
        });
        await tx.rebateRecord.create({
          data: {
            playerId, sourceRoundId: round.id,
            personalFlow: amount, rate: REBATE_RATE,
            amount: rebateAmt, ledgerId: rebateLedger.id,
          },
        });
      }

      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: won ? 'WON' : 'LOST', payout,
          multiplier: prize.multiplier, odds: prize.multiplier,
          validFlow: amount, settledAt: new Date(),
        },
      });

      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, amount, round.id);
      }

      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED', endedAt: new Date(), totalFlow: amount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: { prize, index: idx, rnd: rnd.toFixed(8) } as any,
        },
      });

      return {
        gameCode: game.code,
        category: 'SLOT' as const,
        refType: 'round' as const,
        refId: round.id,
        roundId: round.id,
        totalFlow: amount,
        outcome: { prize, index: idx },
        bets: [{
          betId: bet.id, playerId, amount, payout,
          multiplier: prize.multiplier, odds: prize.multiplier,
          won, validFlow: amount,
        }],
        serverSeed,
        serverSeedHash,
      };
    });
    const payout = result.bets[0]?.payout ?? 0;
    if (payout >= 100_000) {
      await this.risk.record({
        type: 'BIG_WIN',
        level: payout >= 1_000_000 ? 'CRITICAL' : 'WARN',
        targetId: result.roundId,
        detail: { playerId, gameCode, amount, payout },
      });
    }
    return result;
  }

  async placeBet(input: PlaceBetInput): Promise<{ betId: string; roundId: string }> {
    const { playerId, gameCode, amount, clientSeed = 'default' } = input;
    if (!Number.isInteger(amount) || amount < 1) throw new BadRequestException('下注额无效');

    const game = await this.prisma.game.findUnique({
      where: { code: gameCode },
      include: { configs: { where: { active: true }, take: 1 } },
    });
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏不存在或已下架');
    if (amount < game.minBet || amount > game.maxBet) {
      throw new BadRequestException(`下注额须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();

    return this.prisma.$transaction(async (tx) => {
      const roundNo = businessNo('R');
      const round = await tx.gameRound.create({
        data: {
          roundNo, gameId: game.id, category: 'SLOT',
          playerId, configVer: game.configs[0]?.version ?? 1,
          state: 'PLAYING', serverSeed, serverSeedHash, clientSeed, nonce: 1,
        },
      });

      const bet = await tx.bet.create({
        data: {
          betNo: businessNo('B'),
          playerId, gameId: game.id, roundId: round.id,
          amount, betType: 'SPIN', status: 'PENDING',
        },
      });

      // 玩家押注 → 平台池（幂等键基于 bet.id）
      await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
        refType: 'round', refId: round.id, remark: `下注 ${game.name}`,
        idempotencyKey: `bet_player_${bet.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
        refType: 'round', refId: round.id, remark: `${game.name} 注资`,
        idempotencyKey: `bet_plat_${bet.id}`,
      });

      return { betId: bet.id, roundId: round.id };
    });
  }

  async settle(roundId: string): Promise<SettlementSummary> {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
      include: {
        game: true,
      },
    });
    if (!round) throw new NotFoundException('局不存在');
    if (round.state !== 'PLAYING') throw new BadRequestException('该局已结算');

    const config = await this.prisma.gameConfig.findUnique({
      where: {
        gameId_version: {
          gameId: round.gameId,
          version: round.configVer,
        },
      },
    });
    if (!config) throw new BadRequestException('游戏未配置 payTable');
    const payTable = config.payTable as unknown as PayItem[];
    const weights = payTable.map(p => p.weight);

    const rnd = deriveRandom(round.serverSeed!, round.clientSeed ?? 'default', round.nonce);
    const idx = weightedPick(weights, rnd);
    const prize = payTable[idx];

    // 取玩家信息（用于佣金分润）
    const player = round.playerId
      ? await this.prisma.user.findUnique({
          where: { id: round.playerId },
          select: { id: true, agentPath: true },
        })
      : null;

    const settlement = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // CAS 抢占：防止并发 settle 双结算
      const claimed = await tx.gameRound.updateMany({
        where: { id: roundId, state: 'PLAYING' },
        data: { state: 'SETTLED', endedAt: new Date() },
      });
      if (claimed.count === 0) throw new BadRequestException('该局已结算');

      const pendingBets = await tx.bet.findMany({
        where: { roundId, status: 'PENDING' },
      });
      const totalFlow = pendingBets.reduce((sum, bet) => sum + bet.amount, 0);
      const results = [];

      for (const bet of pendingBets) {
        const payout = Math.floor(bet.amount * prize.multiplier);
        const won = payout > 0;

        if (won) {
          // 平台池 → 玩家
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
            refType: 'round', refId: roundId,
            idempotencyKey: `win_plat_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLAYER', bet.playerId, payout, 'WIN', {
            refType: 'round', refId: roundId,
            remark: `${round.game.name} 命中 ${prize.label}`,
            idempotencyKey: `win_player_${bet.id}`,
          });
        }

        // 回水（平台池 → 玩家，按有效流水百分比）
        const rebateAmt = Math.floor(bet.amount * REBATE_RATE);
        if (rebateAmt > 0) {
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
            refType: 'round', refId: roundId,
            idempotencyKey: `rebate_plat_${bet.id}`,
          });
          const rebateLedger = await this.points.creditInTx(tx, 'PLAYER', bet.playerId, rebateAmt, 'REBATE', {
            refType: 'round', refId: roundId,
            remark: '游戏回水',
            idempotencyKey: `rebate_player_${bet.id}`,
          });
          await tx.rebateRecord.create({
            data: {
              playerId: bet.playerId,
              sourceRoundId: roundId,
              personalFlow: bet.amount,
              rate: REBATE_RATE,
              amount: rebateAmt,
              ledgerId: rebateLedger.id,
            },
          });
        }

        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: won ? 'WON' : 'LOST',
            payout,
            multiplier: prize.multiplier,
            odds: prize.multiplier,
            validFlow: bet.amount,
            settledAt: new Date(),
          },
        });

        results.push({
          betId: bet.id, playerId: bet.playerId,
          amount: bet.amount, payout, multiplier: prize.multiplier,
          odds: prize.multiplier, won, validFlow: bet.amount,
        });
      }

      // 多级代理佣金（在同一事务内）
      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, totalFlow, roundId);
      }

      // 更新局状态，公布种子（可证明公平验证用）
      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          state: 'SETTLED', endedAt: new Date(), totalFlow,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: { prize, index: idx, rnd: rnd.toFixed(8) } as any,
        },
      });

      return { results, totalFlow };
    });

    return {
      gameCode: round.game.code,
      category: 'SLOT',
      refType: 'round',
      refId: roundId,
      totalFlow: settlement.totalFlow,
      outcome: { prize, index: idx },
      bets: settlement.results,
      serverSeed: round.serverSeed ?? undefined,
      serverSeedHash: round.serverSeedHash ?? undefined,
    };
  }
}
