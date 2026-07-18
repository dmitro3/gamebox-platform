/**
 * 经典水果机（玛丽机）引擎。
 *
 * 玩法：24 格跑灯 + 8 仓位多符号下注；开奖可为单格或特殊大奖多格命中。
 * 本引擎是该类街机的标准实现，不套用其它游戏结构。
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { GameConfigCache } from './game-config.cache';
import { genServerSeed, deriveRandom, weightedPick } from './fairness.util';
import {
  FRUIT_RING,
  FRUIT_BET_SYMBOLS,
  FRUIT_DEFAULT_AWARD_WEIGHTS,
  FRUIT_AWARD_TYPES,
  fruitAppleIndexes,
  fruitBigIndexes,
  fruitLuckIndexes,
  fruitNonLuckIndexes,
  isFruitBetSymbolId,
  type FruitAwardType,
  type FruitBetSymbolId,
} from '@gamebox/shared';
import { businessNo } from './business-id';
import { RiskService } from '../risk/risk.service';

const GAME_CODE = 'fruit-machine';

interface FruitConfigPayTable {
  awardWeights?: Partial<Record<FruitAwardType, number>>;
}

export interface FruitSpinInput {
  playerId: string;
  gameCode?: string;
  /** 符号仓位 → 押注额 */
  bets: Record<string, number>;
  clientSeed?: string;
}

export interface FruitWinLine {
  symbol: FruitBetSymbolId;
  mult: number;
  amount: number;
  cellIndex: number;
}

@Injectable()
export class FruitMachineEngine {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
    private configCache: GameConfigCache,
    private risk: RiskService,
  ) {}

  async spin(input: FruitSpinInput) {
    const { playerId, bets, clientSeed = 'default' } = input;
    const gameCode = input.gameCode || GAME_CODE;

    if (Object.keys(bets ?? {}).length > FRUIT_BET_SYMBOLS.length) {
      throw new BadRequestException('押注仓位数量超限');
    }
    const entries = Object.entries(bets ?? {}).filter(([, amt]) => amt > 0);
    if (entries.length === 0) throw new BadRequestException('请至少押一个符号');
    for (const [sym, amt] of entries) {
      if (!isFruitBetSymbolId(sym)) throw new BadRequestException(`无效仓位：${sym}`);
      if (!Number.isInteger(amt) || amt < 1) throw new BadRequestException('押注额必须是正整数');
    }
    const totalAmount = entries.reduce((s, [, amt]) => s + amt, 0);
    const betMap = Object.fromEntries(entries) as Record<FruitBetSymbolId, number>;

    const game = await this.configCache.get(gameCode);
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏不存在或已下架');
    if (game.category !== 'ARCADE') throw new BadRequestException('该游戏不是街机品类');
    const config = game.configs[0];
    if (!config) throw new BadRequestException('游戏未配置');
    if (totalAmount < game.minBet || totalAmount > game.maxBet) {
      throw new BadRequestException(`总押注须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const payCfg = (config.payTable ?? {}) as FruitConfigPayTable;
    const awardWeights = { ...FRUIT_DEFAULT_AWARD_WEIGHTS, ...(payCfg.awardWeights ?? {}) };

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();
    const rnd1 = deriveRandom(serverSeed, clientSeed, 1);
    const rnd2 = deriveRandom(serverSeed, clientSeed, 2);
    const rnd3 = deriveRandom(serverSeed, clientSeed, 3);
    const rnd4 = deriveRandom(serverSeed, clientSeed, 4);

    const awardType = pickAwardType(awardWeights, rnd1);
    const { stopIndex, hitIndexes } = resolveHits(awardType, rnd2, rnd3, rnd4);
    const wins = settleWins(hitIndexes, betMap);
    const totalPayout = wins.reduce((s, w) => s + w.amount, 0);

    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const roundNo = businessNo('FRU');
      const round = await tx.gameRound.create({
        data: {
          roundNo,
          gameId: game.id,
          category: 'ARCADE',
          playerId,
          configVer: config.version,
          state: 'PLAYING',
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 1,
        },
      });

      await this.points.creditInTx(tx, 'PLAYER', playerId, -totalAmount, 'BET', {
        refType: 'round',
        refId: round.id,
        remark: `${game.name} 押注`,
        idempotencyKey: `fruit_bet_player_${round.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, totalAmount, 'BET', {
        refType: 'round',
        refId: round.id,
        idempotencyKey: `fruit_bet_plat_${round.id}`,
      });

      const betResults = [];
      for (const [pos, amt] of entries) {
        const sym = pos as FruitBetSymbolId;
        const symWins = wins.filter((w) => w.symbol === sym);
        const payout = symWins.reduce((s, w) => s + w.amount, 0);
        const mult = symWins.length ? symWins.reduce((s, w) => s + w.mult, 0) : 0;
        const won = payout > 0;

        const bet = await tx.bet.create({
          data: {
            betNo: businessNo('FR'),
            playerId,
            gameId: game.id,
            roundId: round.id,
            betType: pos,
            amount: amt,
            status: won ? 'WON' : 'LOST',
            payout,
            multiplier: mult,
            odds: mult,
            validFlow: amt,
            settledAt: new Date(),
          },
        });

        if (payout > 0) {
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
            refType: 'round',
            refId: round.id,
            idempotencyKey: `fruit_win_plat_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLAYER', playerId, payout, 'WIN', {
            refType: 'round',
            refId: round.id,
            remark: `${game.name} 命中 ${sym}`,
            idempotencyKey: `fruit_win_player_${bet.id}`,
          });
        }

        betResults.push({ position: pos, amount: amt, payout, won });
      }

      // 水果机不设回水

      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, totalAmount, round.id);
      }

      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED',
          endedAt: new Date(),
          totalFlow: totalAmount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: {
            awardType,
            stopIndex,
            hitIndexes,
            wins,
            totalPayout,
          } as any,
        },
      });

      return { roundId: round.id, betResults, totalPayout };
    });

    if (result.totalPayout >= Math.max(totalAmount * 50, 100_000)) {
      await this.risk.record({
        type: 'BIG_WIN',
        level: 'WARN',
        targetId: result.roundId,
        detail: { playerId, totalAmount, totalPayout: result.totalPayout, gameCode },
      });
    }

    const account = await this.prisma.pointsAccount.findUnique({
      where: { ownerId: playerId },
      select: { balance: true },
    });

    return {
      gameCode,
      roundId: result.roundId,
      awardType,
      stopIndex,
      hitIndexes,
      wins,
      bets: result.betResults,
      totalBet: totalAmount,
      totalWin: result.totalPayout,
      totalPayout: result.totalPayout,
      balance: account?.balance ?? 0,
      serverSeed,
      serverSeedHash,
    };
  }

  /**
   * 当局赢分「大 / 小」再赌：点数 1–6 小、8–13 大、7 和（退回本金）。
   * 赢则再入账 amount（翻倍），输则扣回 amount。
   */
  async gamble(input: { playerId: string; amount: number; choice: 'big' | 'small' }) {
    const { playerId, amount, choice } = input;
    if (!Number.isInteger(amount) || amount < 1) {
      throw new BadRequestException('再赌金额无效');
    }
    if (choice !== 'big' && choice !== 'small') {
      throw new BadRequestException('请选择大或小');
    }

    const game = await this.configCache.get(GAME_CODE);
    const config = game?.configs[0];
    if (!game || game.status !== 'ONLINE' || !config) {
      throw new NotFoundException('水果机未上线或未配置');
    }

    const { seed, hash } = genServerSeed();
    const clientSeed = `${playerId}:${amount}:${businessNo('FGS')}`;
    const rnd = deriveRandom(seed, clientSeed, 1);
    const roll = 1 + Math.floor(rnd * 13); // 1..13
    let result: 'win' | 'lose' | 'push' = 'push';
    if (roll === 7) result = 'push';
    else if (roll <= 6) result = choice === 'small' ? 'win' : 'lose';
    else result = choice === 'big' ? 'win' : 'lose';

    // 净结算：win +amount / lose -amount / push 0。
    // 事务内先扣本金（账本层带余额条件保护，防并发透支），再按结果派彩；
    // 余额不足会在扣款处抛错回滚，玩家不会出现「只赢不输」的中间态。
    const payoutBack = result === 'win' ? amount * 2 : result === 'push' ? amount : 0;
    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });
    const audit = await this.prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.create({
        data: {
          roundNo: businessNo('FGR'),
          gameId: game.id,
          category: 'ARCADE',
          playerId,
          configVer: config.version,
          state: 'PLAYING',
          serverSeed: seed,
          serverSeedHash: hash,
          clientSeed,
          nonce: 1,
        },
      });
      const bet = await tx.bet.create({
        data: {
          betNo: businessNo('FGB'),
          playerId,
          gameId: game.id,
          roundId: round.id,
          betType: `GAMBLE_${choice.toUpperCase()}`,
          amount,
          status: 'PENDING',
        },
      });
      await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
        refType: 'round',
        refId: round.id,
        remark: `水果机大小再赌 ${choice} 押注`,
        idempotencyKey: `fruit_gamble_stake_${bet.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
        refType: 'round',
        refId: round.id,
        idempotencyKey: `fruit_gamble_stake_plat_${bet.id}`,
      });
      if (payoutBack > 0) {
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payoutBack, 'WIN', {
          refType: 'round',
          refId: round.id,
          idempotencyKey: `fruit_gamble_plat_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLAYER', playerId, payoutBack, 'WIN', {
          refType: 'round',
          refId: round.id,
          remark: `水果机大小再赌 ${choice} 点数${roll}`,
          idempotencyKey: `fruit_gamble_${bet.id}`,
        });
      }
      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: result === 'lose' ? 'LOST' : 'WON',
          payout: payoutBack,
          odds: payoutBack / amount,
          multiplier: payoutBack / amount,
          validFlow: amount,
          settledAt: new Date(),
          payload: { choice, roll, result },
        },
      });
      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, amount, round.id);
      }
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED',
          totalFlow: amount,
          endedAt: new Date(),
          outcome: { choice, roll, result, payout: payoutBack },
        },
      });
      return { roundId: round.id, betId: bet.id };
    });

    const after = await this.prisma.pointsAccount.findUnique({
      where: { ownerId: playerId },
      select: { balance: true },
    });

    return {
      roll,
      choice,
      result,
      amount,
      payout: payoutBack,
      balance: after?.balance ?? 0,
      roundId: audit.roundId,
      betId: audit.betId,
      serverSeed: seed,
      serverSeedHash: hash,
    };
  }
}

function pickAwardType(
  weights: Record<FruitAwardType, number>,
  rnd: number,
): FruitAwardType {
  const list = FRUIT_AWARD_TYPES.map((t) => weights[t] ?? 0);
  const idx = weightedPick(list, rnd);
  return FRUIT_AWARD_TYPES[idx];
}

function pickWeightedIndex(indexes: number[], weights: number[], rnd: number): number {
  if (indexes.length === 0) return 0;
  const w = indexes.map((i) => weights[i] ?? 1);
  const pick = weightedPick(w, rnd);
  return indexes[pick];
}

function resolveHits(
  awardType: FruitAwardType,
  rnd2: number,
  rnd3: number,
  rnd4: number,
): { stopIndex: number; hitIndexes: number[] } {
  const luckIdx = fruitLuckIndexes();
  const nonLuck = fruitNonLuckIndexes();
  const cellWeights = FRUIT_RING.map((c) => c.weight);

  if (awardType === 'luck_eat') {
    const stopIndex = pickWeightedIndex(luckIdx, cellWeights, rnd2);
    return { stopIndex, hitIndexes: [] };
  }

  if (awardType === 'luck_send') {
    const stopIndex = pickWeightedIndex(luckIdx, cellWeights, rnd2);
    const count = 1 + Math.floor(rnd3 * 5); // 1~5
    const hits = pickDistinct(nonLuck, count, rnd4, cellWeights);
    return { stopIndex, hitIndexes: hits };
  }

  if (awardType === 'train') {
    const start = pickWeightedIndex(nonLuck, cellWeights, rnd2);
    const len = 4 + Math.floor(rnd3 * 3); // 4~6
    const hits: number[] = [];
    for (let i = 0; i < len; i++) {
      const idx = (start + i) % FRUIT_RING.length;
      if (FRUIT_RING[idx].size !== 'luck') hits.push(idx);
    }
    return { stopIndex: start, hitIndexes: hits };
  }

  if (awardType === 'big3') {
    const hits = [
      pickOne(fruitBigIndexes('seven'), rnd2),
      pickOne(fruitBigIndexes('star'), rnd3),
      pickOne(fruitBigIndexes('melon'), rnd4),
    ];
    return { stopIndex: hits[0], hitIndexes: hits };
  }

  if (awardType === 'small3') {
    const hits = [
      pickOne(fruitBigIndexes('bell'), rnd2),
      pickOne(fruitBigIndexes('lemon'), rnd3),
      pickOne(fruitBigIndexes('orange'), rnd4),
    ];
    return { stopIndex: hits[0], hitIndexes: hits };
  }

  if (awardType === 'four') {
    const hits = fruitAppleIndexes();
    return { stopIndex: hits[0] ?? 0, hitIndexes: hits };
  }

  if (awardType === 'slam') {
    return { stopIndex: nonLuck[0] ?? 0, hitIndexes: [...nonLuck] };
  }

  // normal
  const stopIndex = pickWeightedIndex(
    [...Array(FRUIT_RING.length).keys()],
    cellWeights,
    rnd2,
  );
  if (FRUIT_RING[stopIndex].size === 'luck') {
    // 普通奖抽到 LUCK 格时，改为送灯 1~3
    const count = 1 + Math.floor(rnd3 * 3);
    const hits = pickDistinct(nonLuck, count, rnd4, cellWeights);
    return { stopIndex, hitIndexes: hits };
  }
  return { stopIndex, hitIndexes: [stopIndex] };
}

function pickOne(indexes: number[], rnd: number): number {
  if (indexes.length === 0) return 0;
  return indexes[Math.floor(rnd * indexes.length) % indexes.length];
}

function pickDistinct(
  pool: number[],
  count: number,
  rnd: number,
  weights: number[],
): number[] {
  const left = [...pool];
  const out: number[] = [];
  let seed = rnd;
  const n = Math.min(count, left.length);
  for (let i = 0; i < n; i++) {
    const w = left.map((idx) => weights[idx] ?? 1);
    const pick = weightedPick(w, seed);
    out.push(left[pick]);
    left.splice(pick, 1);
    seed = (seed * 9301 + 49297) % 233280 / 233280;
  }
  return out;
}

function settleWins(
  hitIndexes: number[],
  betMap: Record<FruitBetSymbolId, number>,
): FruitWinLine[] {
  const wins: FruitWinLine[] = [];
  for (const cellIndex of hitIndexes) {
    const cell = FRUIT_RING[cellIndex];
    if (!cell?.symbol || cell.mult <= 0) continue;
    const betAmt = betMap[cell.symbol] ?? 0;
    if (betAmt <= 0) continue;
    wins.push({
      symbol: cell.symbol,
      mult: cell.mult,
      amount: Math.floor(betAmt * cell.mult),
      cellIndex,
    });
  }
  return wins;
}

/** 供前端展示用的静态赔率表（也写入 seed 注释） */
export function fruitBetPayRows() {
  return FRUIT_BET_SYMBOLS.map((s) => ({
    id: s.id,
    label: s.label,
    bigMult: s.bigMult,
    smallMult: s.smallMult,
  }));
}
