/**
 * 奔驰宝马街机引擎。
 *
 * 12 仓位（4 车×3 色）+ YoPlay YBEN ResultBonus 六大奖：
 * 大三元 / 大四喜 / 极速狂飙 / U型弯道 / 霹雳闪电 / 全民漂移。
 * 盘面与赔率以 @gamebox/shared bcbm 为准。
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { GameConfigCache } from './game-config.cache';
import { genServerSeed, deriveRandom, weightedPick } from './fairness.util';
import {
  BCBM_RING,
  BCBM_BET_SLOTS,
  BCBM_DEFAULT_AWARD_WEIGHTS,
  BCBM_AWARD_TYPES,
  bcbmBetSlot,
  bcbmIndexesOfBrand,
  bcbmIndexesOfColor,
  bcbmNonFreeIndexes,
  isBcbmBetId,
  type BcbmAwardType,
  type BcbmBetId,
  type BcbmBrandId,
  type BcbmColorId,
} from '@gamebox/shared';
import { businessNo } from './business-id';

const GAME_CODE = 'bcbm';
const REBATE_RATE = 0.005;

interface BcbmConfigPayTable {
  awardWeights?: Partial<Record<BcbmAwardType, number>>;
}

export interface BcbmSpinInput {
  playerId: string;
  gameCode?: string;
  /** 仓位 id → 押注额，如 benz_red */
  bets: Record<string, number>;
  clientSeed?: string;
}

export interface BcbmWinLine {
  position: BcbmBetId;
  mult: number;
  amount: number;
  cellIndex: number;
}

@Injectable()
export class BcbmEngine {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
    private configCache: GameConfigCache,
  ) {}

  async spin(input: BcbmSpinInput) {
    const { playerId, bets, clientSeed = 'default' } = input;
    const gameCode = input.gameCode || GAME_CODE;

    if (Object.keys(bets ?? {}).length > BCBM_BET_SLOTS.length) {
      throw new BadRequestException('押注仓位数量超限');
    }
    const entries = Object.entries(bets ?? {}).filter(([, amt]) => amt > 0);
    if (entries.length === 0) throw new BadRequestException('请至少押一个仓位');
    for (const [pos, amt] of entries) {
      if (!isBcbmBetId(pos)) throw new BadRequestException(`无效仓位：${pos}`);
      if (!Number.isInteger(amt) || amt < 1) throw new BadRequestException('押注额必须是正整数');
    }
    const totalAmount = entries.reduce((s, [, amt]) => s + amt, 0);
    const betMap = Object.fromEntries(entries) as Record<BcbmBetId, number>;

    const game = await this.configCache.get(gameCode);
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏不存在或已下架');
    if (game.category !== 'ARCADE') throw new BadRequestException('该游戏不是街机品类');
    const config = game.configs[0];
    if (!config) throw new BadRequestException('游戏未配置');
    if (totalAmount < game.minBet || totalAmount > game.maxBet) {
      throw new BadRequestException(`总押注须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const rawPay = config.payTable;
    const payCfg = (!rawPay || Array.isArray(rawPay) ? {} : rawPay) as BcbmConfigPayTable;
    const awardWeights = { ...BCBM_DEFAULT_AWARD_WEIGHTS, ...(payCfg.awardWeights ?? {}) };

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();
    const rnd1 = deriveRandom(serverSeed, clientSeed, 1);
    const rnd2 = deriveRandom(serverSeed, clientSeed, 2);

    const rnd3 = deriveRandom(serverSeed, clientSeed, 3);
    const awardType = pickAwardType(awardWeights, rnd1);
    const { stopIndex, hitIndexes, freeStopIndex } = resolveHits(awardType, rnd2, rnd3);
    const wins = settleWins(hitIndexes, betMap);
    const totalPayout = wins.reduce((s, w) => s + w.amount, 0);

    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const roundNo = businessNo('BCBM');
      const round = await tx.gameRound.create({
        data: {
          roundNo, gameId: game.id, category: 'ARCADE',
          playerId, configVer: config.version,
          state: 'PLAYING', serverSeed, serverSeedHash, clientSeed, nonce: 1,
        },
      });

      await this.points.creditInTx(tx, 'PLAYER', playerId, -totalAmount, 'BET', {
        refType: 'round', refId: round.id,
        remark: `${game.name} 押注`,
        idempotencyKey: `bcbm_bet_player_${round.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, totalAmount, 'BET', {
        refType: 'round', refId: round.id,
        idempotencyKey: `bcbm_bet_plat_${round.id}`,
      });

      const betResults = [];
      for (const [pos, amt] of entries) {
        const posWins = wins.filter((w) => w.position === pos);
        const payout = posWins.reduce((s, w) => s + w.amount, 0);
        const won = payout > 0;
        const mult = won ? posWins[0].mult : 0;

        const bet = await tx.bet.create({
          data: {
            betNo: businessNo('BB'),
            playerId, gameId: game.id, roundId: round.id,
            betType: pos, amount: amt,
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
            refType: 'round', refId: round.id,
            idempotencyKey: `bcbm_win_plat_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLAYER', playerId, payout, 'WIN', {
            refType: 'round', refId: round.id,
            remark: `${game.name} ${pos}`,
            idempotencyKey: `bcbm_win_player_${bet.id}`,
          });
        }

        betResults.push({ position: pos, amount: amt, payout, won });
      }

      const rebateAmt = Math.floor(totalAmount * REBATE_RATE);
      if (rebateAmt > 0) {
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
          refType: 'round', refId: round.id,
          idempotencyKey: `bcbm_rebate_plat_${round.id}`,
        });
        const rebateLedger = await this.points.creditInTx(tx, 'PLAYER', playerId, rebateAmt, 'REBATE', {
          refType: 'round', refId: round.id, remark: '游戏回水',
          idempotencyKey: `bcbm_rebate_player_${round.id}`,
        });
        await tx.rebateRecord.create({
          data: {
            playerId, sourceRoundId: round.id,
            personalFlow: totalAmount, rate: REBATE_RATE,
            amount: rebateAmt, ledgerId: rebateLedger.id,
          },
        });
      }

      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, totalAmount, round.id);
      }

      const stopCell = BCBM_RING[stopIndex];
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED', endedAt: new Date(), totalFlow: totalAmount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: {
            awardType, stopIndex, hitIndexes, freeStopIndex,
            winner: stopCell.label, kind: stopCell.kind,
          } as any,
        },
      });

      return { roundId: round.id, betResults, totalPayout };
    });

    const account = await this.prisma.pointsAccount.findUnique({
      where: { ownerId: playerId },
      select: { balance: true },
    });

    const stopCell = BCBM_RING[stopIndex];
    return {
      gameCode,
      awardType,
      stopIndex,
      hitIndexes,
      freeStopIndex,
      winner: stopCell.label,
      winnerKind: stopCell.kind,
      multiplier: stopCell.mult,
      wins,
      bets: result.betResults,
      totalBet: totalAmount,
      totalPayout: result.totalPayout,
      balance: account?.balance ?? 0,
      serverSeed,
      serverSeedHash,
      slots: BCBM_BET_SLOTS.map((s) => ({ id: s.id, label: s.label, mult: s.mult, brand: s.brand, color: s.color })),
    };
  }
}

function pickAwardType(weights: Record<BcbmAwardType, number>, rnd: number): BcbmAwardType {
  const list = BCBM_AWARD_TYPES.map((t) => Math.max(0, weights[t] ?? 0));
  const idx = weightedPick(list, rnd);
  return BCBM_AWARD_TYPES[idx];
}

function pickNonFreeStop(rnd: number): number {
  const idxs = bcbmNonFreeIndexes();
  const weights = idxs.map((i) => BCBM_RING[i].weight);
  return idxs[weightedPick(weights, rnd)];
}

/**
 * 官方 getResultPositionSet(carPos, carResult) 命中扩展（落在现有灯环索引上）：
 * - 大三元 / 大四喜：品牌或颜色全中
 * - fast：连续 5 格
 * - uturn：停点与 ±5
 * - lightning / free：仅停点（特殊奖仪式）
 * - drift：全部非免费格
 */
function resolveHits(
  awardType: BcbmAwardType,
  rnd: number,
  rndBonus = 0.5,
): { stopIndex: number; hitIndexes: number[]; freeStopIndex: number | null } {
  if (awardType === 'free' || awardType === 'lightning') {
    const stopIndex = pickNonFreeStop(rnd);
    return { stopIndex, hitIndexes: [stopIndex], freeStopIndex: null };
  }
  if (awardType.startsWith('sanyuan_')) {
    const brand = awardType.replace('sanyuan_', '') as BcbmBrandId;
    const hits = bcbmIndexesOfBrand(brand);
    return { stopIndex: hits[0] ?? pickNonFreeStop(rnd), hitIndexes: hits, freeStopIndex: null };
  }
  if (awardType.startsWith('sixi_')) {
    const color = awardType.replace('sixi_', '') as BcbmColorId;
    const hits = bcbmIndexesOfColor(color);
    return { stopIndex: hits[0] ?? pickNonFreeStop(rnd), hitIndexes: hits, freeStopIndex: null };
  }
  if (awardType === 'fast') {
    // 官方 FURIOUS：停点起连续 5 格 (e+n)%24 → 映射到非免费环上邻格
    const ring = bcbmNonFreeIndexes();
    const start = weightedPick(ring.map((i) => BCBM_RING[i].weight), rnd);
    const hits: number[] = [];
    for (let n = 0; n < 5; n++) hits.push(ring[(start + n) % ring.length]!);
    return { stopIndex: hits[0]!, hitIndexes: hits, freeStopIndex: null };
  }
  if (awardType === 'uturn') {
    // 官方 UTURN：[(e-5), e, (e+5)]
    const ring = bcbmNonFreeIndexes();
    const mid = weightedPick(ring.map((i) => BCBM_RING[i].weight), rnd);
    const len = ring.length;
    const hits = [
      ring[(mid - 5 + len * 5) % len]!,
      ring[mid]!,
      ring[(mid + 5) % len]!,
    ];
    return { stopIndex: hits[1]!, hitIndexes: hits, freeStopIndex: null };
  }
  if (awardType === 'drift') {
    // 官方 DRIFT：整环全亮
    const hits = bcbmNonFreeIndexes();
    const stopIndex = hits[weightedPick(hits.map((i) => BCBM_RING[i].weight), rnd)]!;
    return { stopIndex, hitIndexes: hits, freeStopIndex: null };
  }
  // normal
  void rndBonus;
  const stopIndex = pickNonFreeStop(rnd);
  return { stopIndex, hitIndexes: [stopIndex], freeStopIndex: null };
}

function settleWins(hitIndexes: number[], betMap: Record<BcbmBetId, number>): BcbmWinLine[] {
  const wins: BcbmWinLine[] = [];
  const paid = new Set<string>();
  for (const i of hitIndexes) {
    const cell = BCBM_RING[i];
    if (cell.kind === 'free' || !cell.brand || !cell.color) continue;
    const pos = cell.kind;
    const amt = betMap[pos] ?? 0;
    if (amt <= 0) continue;
    const key = `${pos}@${i}`;
    if (paid.has(key)) continue;
    paid.add(key);
    // 同一仓位多格命中时只按仓位赔一次（官方是按仓位×倍率）
    if (wins.some((w) => w.position === pos)) continue;
    const slot = bcbmBetSlot(pos);
    wins.push({
      position: pos,
      mult: slot.mult,
      amount: Math.floor(amt * slot.mult),
      cellIndex: i,
    });
  }
  return wins;
}
