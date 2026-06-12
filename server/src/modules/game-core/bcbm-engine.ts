/**
 * 奔驰宝马（bcbm）街机引擎。
 *
 * 玩法：转盘上有 大众/奥迪/奔驰/宝马 + 空门 五种格子，
 *       玩家可同时押多个品牌，转盘停在哪个品牌、押中该品牌的注按倍率赔付，
 *       停在空门则全输。
 *
 * 与 SLOT 的区别：一次 spin 可包含多个仓位（每仓位一条 Bet），
 * 整个 下注+开奖+结算 在一个事务内完成（即时游戏）。
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { genServerSeed, deriveRandom, weightedPick } from './fairness.util';

interface PayItem { label: string; multiplier: number; weight: number; }

const REBATE_RATE = 0.005;

export interface BcbmSpinInput {
  playerId: string;
  gameCode: string;
  /** 品牌 → 押注额（只允许 payTable 中 multiplier>0 的仓位） */
  bets: Record<string, number>;
  clientSeed?: string;
}

@Injectable()
export class BcbmEngine {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
  ) {}

  async spin(input: BcbmSpinInput) {
    const { playerId, gameCode, bets, clientSeed = 'default' } = input;

    const entries = Object.entries(bets ?? {}).filter(([, amt]) => amt > 0);
    if (entries.length === 0) throw new BadRequestException('请至少押一个仓位');
    for (const [, amt] of entries) {
      if (!Number.isInteger(amt) || amt < 1) throw new BadRequestException('押注额必须是正整数');
    }
    const totalAmount = entries.reduce((s, [, amt]) => s + amt, 0);

    const game = await this.prisma.game.findUnique({
      where: { code: gameCode },
      include: { configs: { where: { active: true }, take: 1 } },
    });
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏不存在或已下架');
    if (game.category !== 'ARCADE') throw new BadRequestException('该游戏不是街机品类');
    const config = game.configs[0];
    if (!config) throw new BadRequestException('游戏未配置 payTable');
    if (totalAmount < game.minBet || totalAmount > game.maxBet) {
      throw new BadRequestException(`总押注须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const payTable = config.payTable as unknown as PayItem[];
    const betablePositions = new Set(
      payTable.filter(p => p.multiplier > 0).map(p => p.label),
    );
    for (const [pos] of entries) {
      if (!betablePositions.has(pos)) throw new BadRequestException(`无效仓位：${pos}`);
    }

    const { seed: serverSeed, hash: serverSeedHash } = genServerSeed();
    const rnd = deriveRandom(serverSeed, clientSeed, 1);
    const winIdx = weightedPick(payTable.map(p => p.weight), rnd);
    const winner = payTable[winIdx];

    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: { id: true, agentPath: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const roundNo = `BCBM${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const round = await tx.gameRound.create({
        data: {
          roundNo, gameId: game.id, category: 'ARCADE',
          playerId, configVer: config.version,
          state: 'PLAYING', serverSeed, serverSeedHash, clientSeed, nonce: 1,
        },
      });

      // 总扣款：玩家 → 平台池
      await this.points.creditInTx(tx, 'PLAYER', playerId, -totalAmount, 'BET', {
        refType: 'round', refId: round.id,
        remark: `${game.name} 押注`,
        idempotencyKey: `bcbm_bet_player_${round.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, totalAmount, 'BET', {
        refType: 'round', refId: round.id,
        idempotencyKey: `bcbm_bet_plat_${round.id}`,
      });

      // 每个仓位一条 Bet，押中的赔付
      const betResults = [];
      let totalPayout = 0;
      for (const [pos, amt] of entries) {
        const won = pos === winner.label;
        const payout = won ? Math.floor(amt * winner.multiplier) : 0;
        totalPayout += payout;

        const bet = await tx.bet.create({
          data: {
            betNo: `BB${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            playerId, gameId: game.id, roundId: round.id,
            betType: pos, amount: amt,
            status: won ? 'WON' : 'LOST',
            payout,
            multiplier: won ? winner.multiplier : 0,
            odds: won ? winner.multiplier : 0,
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
            remark: `${game.name} 命中 ${winner.label}`,
            idempotencyKey: `bcbm_win_player_${bet.id}`,
          });
        }

        betResults.push({ position: pos, amount: amt, payout, won });
      }

      // 回水（按总流水）
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

      // 多级佣金
      if (player?.agentPath) {
        await this.commission.distributeInTx(tx, player, totalAmount, round.id);
      }

      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          state: 'SETTLED', endedAt: new Date(), totalFlow: totalAmount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outcome: { winner: winner.label, index: winIdx, rnd: rnd.toFixed(8) } as any,
        },
      });

      return { roundId: round.id, betResults, totalPayout };
    });

    const account = await this.prisma.pointsAccount.findUnique({
      where: { ownerId: playerId },
      select: { balance: true },
    });

    return {
      gameCode,
      winner: winner.label,
      winnerIndex: winIdx,
      multiplier: winner.multiplier,
      bets: result.betResults,
      totalBet: totalAmount,
      totalPayout: result.totalPayout,
      balance: account?.balance ?? 0,
      serverSeed,
      serverSeedHash,
    };
  }
}
