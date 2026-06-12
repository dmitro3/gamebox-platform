/**
 * LotteryService：彩票核心业务逻辑
 *
 * 职责：
 *   1. 预创期号（由 scheduler 每批次调用）
 *   2. 封盘（到 lockAt 时设 LOCKED）
 *   3. 开奖（到 openAt 时摇号 → 结算所有 PENDING 注单）
 *   4. 投注（前置校验 + 写 Bet + 扣分）
 *   5. 查询（当前期 / 历史）
 */
import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { LotteryGameRegistry } from './lottery-game.registry';
import type { LotteryBetPayload, LotteryPayTable } from './lottery.types';
import type { Prisma } from '@prisma/client';

function genIssueNo(gameCode: string, openAt: Date): string {
  const y = openAt.getFullYear();
  const m = (openAt.getMonth() + 1).toString().padStart(2, '0');
  const d = openAt.getDate().toString().padStart(2, '0');
  const seq = Math.floor(openAt.getTime() / 1000).toString().slice(-6);
  return `${y}${m}${d}${seq}`;
}

function genSeedPair() {
  const serverSeed = randomBytes(16).toString('hex');
  const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex');
  return { serverSeed, serverSeedHash };
}

@Injectable()
export class LotteryService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
    private registry: LotteryGameRegistry,
  ) {}

  // ─── 期号管理 ─────────────────────────────────────────

  /**
   * 预创今后 N 期期号（scheduler 每分钟调用，保证总有待开期）
   * @param gameCode  游戏 code
   * @param intervalSec  开奖间隔秒数
   * @param ahead  预创多少期（默认 3）
   */
  async preCreateIssues(gameCode: string, intervalSec: number, ahead = 3) {
    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game) return;

    // 找最晚一期的 openAt
    const last = await this.prisma.lotteryIssue.findFirst({
      where: { gameId: game.id, status: { in: ['PENDING', 'LOCKED'] } },
      orderBy: { openAt: 'desc' },
    });

    let nextOpen = last
      ? new Date(last.openAt.getTime() + intervalSec * 1000)
      : this._nextAlignedTime(intervalSec);

    for (let i = 0; i < ahead; i++) {
      const lockAt = new Date(nextOpen.getTime() - 10_000); // 封盘提前 10s
      const issueNo = genIssueNo(gameCode, nextOpen);
      const { serverSeed, serverSeedHash } = genSeedPair();

      await this.prisma.lotteryIssue.upsert({
        where: { gameId_issueNo: { gameId: game.id, issueNo } },
        update: {},
        create: {
          gameId: game.id, issueNo, status: 'PENDING',
          openAt: nextOpen, lockAt, serverSeed, serverSeedHash,
        },
      });
      nextOpen = new Date(nextOpen.getTime() + intervalSec * 1000);
    }
  }

  /** 获取下一个整点对齐时间 */
  private _nextAlignedTime(intervalSec: number): Date {
    const now = Date.now();
    const intervalMs = intervalSec * 1000;
    return new Date(Math.ceil(now / intervalMs) * intervalMs);
  }

  /**
   * 执行开奖（scheduler 检查到期的 PENDING/LOCKED 期号后调用）
   */
  async draw(issueId: string) {
    const issue = await this.prisma.lotteryIssue.findUnique({
      where: { id: issueId },
      include: { game: { include: { configs: { where: { active: true }, take: 1 } } } },
    });
    if (!issue || issue.status === 'DRAWN' || issue.status === 'CANCELLED') return;

    const gameDef = this.registry.get(issue.game.code);
    if (!gameDef) return;

    const config = issue.game.configs[0];
    if (!config) return;

    const drawResult = gameDef.draw(
      issue.serverSeed!, 'server', 1,
    );

    const payTable = config.payTable as unknown as LotteryPayTable;

    // 在事务内结算所有注单
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const bets = await tx.bet.findMany({
        where: { issueId: issue.id, status: 'PENDING' },
        include: { player: { select: { id: true, agentPath: true } } },
      });

      for (const bet of bets) {
        const payload = bet.payload as unknown as LotteryBetPayload;
        const hitKey = gameDef.judge(payload, drawResult, payTable);
        const odds = hitKey ? (payTable[hitKey]?.multiplier ?? 0) : 0;
        const payout = hitKey ? Math.floor(bet.amount * odds) : 0;
        const won = payout > 0;

        if (won) {
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
            refType: 'issue', refId: issue.id,
            idempotencyKey: `win_plat_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLAYER', bet.playerId, payout, 'WIN', {
            refType: 'issue', refId: issue.id,
            remark: `${issue.game.name} ${issue.issueNo} 开奖`,
            idempotencyKey: `win_player_${bet.id}`,
          });
        }

        await tx.bet.update({
          where: { id: bet.id },
          data: { status: won ? 'WON' : 'LOST', payout, odds, validFlow: bet.amount, settledAt: new Date() },
        });

        // 多级代理佣金
        if (bet.player?.agentPath) {
          await this.commission.distributeInTx(tx, bet.player, bet.amount, undefined);
        }
      }

      await tx.lotteryIssue.update({
        where: { id: issue.id },
        data: {
          status: 'DRAWN',
          drawNumbers: JSON.stringify(drawResult.numbers),
          drawnAt: new Date(),
          totalFlow: bets.reduce((s, b) => s + b.amount, 0),
        },
      });
    });
  }

  // ─── 投注 ─────────────────────────────────────────────

  async placeBet(
    playerId: string,
    gameCode: string,
    betType: string,
    betValue: string | undefined,
    amount: number,
  ) {
    if (!Number.isInteger(amount) || amount < 1) throw new BadRequestException('投注额无效');

    const game = await this.prisma.game.findUnique({
      where: { code: gameCode },
      include: { configs: { where: { active: true }, take: 1 } },
    });
    if (!game || game.status !== 'ONLINE') throw new NotFoundException('游戏未上架');
    if (amount < game.minBet || amount > game.maxBet) {
      throw new BadRequestException(`投注额须在 ${game.minBet}~${game.maxBet} 之间`);
    }

    const gameDef = this.registry.get(gameCode);
    if (!gameDef) throw new BadRequestException('游戏类型不支持');
    if (!gameDef.validateBet(betType, betValue)) throw new BadRequestException('玩法参数无效');

    // 找当前可投注期号（PENDING + lockAt 未到）
    const now = new Date();
    const issue = await this.prisma.lotteryIssue.findFirst({
      where: {
        gameId: game.id,
        status: 'PENDING',
        lockAt: { gt: now },
        openAt: { gt: now },
      },
      orderBy: { openAt: 'asc' },
    });
    if (!issue) throw new BadRequestException('当前无可投注期，请等待下期');

    const payload: LotteryBetPayload = { betType, value: betValue };

    // 扣款 + 平台入账 + 写注单（事务）
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
        refType: 'issue', refId: issue.id,
        idempotencyKey: `lottery_bet_player_${playerId}_${issue.id}_${Date.now()}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
        refType: 'issue', refId: issue.id,
        idempotencyKey: `lottery_bet_plat_${playerId}_${issue.id}_${Date.now()}`,
      });

      const bet = await tx.bet.create({
        data: {
          betNo: `B${Date.now()}`,
          playerId, gameId: game.id,
          issueId: issue.id,
          betType, payload: payload as never,
          amount, status: 'PENDING',
        },
      });

      return {
        betId: bet.id,
        issueNo: issue.issueNo,
        openAt: issue.openAt,
        gameCode,
        betType,
        betValue,
        amount,
      };
    });
  }

  // ─── 查询 ─────────────────────────────────────────────

  /** 当前期信息（不暴露 serverSeed） */
  async currentIssue(gameCode: string) {
    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game) throw new NotFoundException('游戏不存在');

    const now = new Date();
    const issue = await this.prisma.lotteryIssue.findFirst({
      where: { gameId: game.id, openAt: { gt: now } },
      orderBy: { openAt: 'asc' },
      select: { id: true, issueNo: true, status: true, openAt: true, lockAt: true, serverSeedHash: true },
    });
    return issue;
  }

  /** 历史开奖（最近 N 期） */
  async history(gameCode: string, limit = 10) {
    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game) throw new NotFoundException('游戏不存在');

    return this.prisma.lotteryIssue.findMany({
      where: { gameId: game.id, status: 'DRAWN' },
      orderBy: { openAt: 'desc' },
      take: limit,
      select: {
        id: true, issueNo: true, drawNumbers: true, drawnAt: true,
        openAt: true, serverSeed: true, serverSeedHash: true, totalFlow: true,
      },
    });
  }

  /** 玩家自己的投注记录 */
  async myBets(playerId: string, gameCode: string, page = 1, pageSize = 20) {
    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game) throw new NotFoundException('游戏不存在');

    const [total, list] = await this.prisma.$transaction([
      this.prisma.bet.count({ where: { playerId, gameId: game.id } }),
      this.prisma.bet.findMany({
        where: { playerId, gameId: game.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { issue: { select: { issueNo: true, drawNumbers: true, openAt: true } } },
      }),
    ]);
    return { total, page, pageSize, list };
  }
}
