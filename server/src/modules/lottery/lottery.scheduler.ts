/**
 * LotteryScheduler：定时任务
 *
 *   preCreate  每分钟运行，确保各彩票游戏始终有 3 期待开号
 *   settle     每 5 秒运行，检查到期期号并开奖/结算
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { LotteryService } from './lottery.service';

/** 各彩票游戏的开奖间隔（秒） */
const GAME_INTERVALS: Record<string, number> = {
  ffc:           60,
  ssc:           120,
  kuai3:         60,
  bjsc:          300,
  'speed-racing': 60,
};

@Injectable()
export class LotteryScheduler {
  private readonly logger = new Logger(LotteryScheduler.name);

  constructor(
    private prisma: PrismaService,
    private lottery: LotteryService,
  ) {}

  /** 每分钟：预创各游戏待开期号 */
  @Cron(CronExpression.EVERY_MINUTE)
  async preCreate() {
    for (const [code, interval] of Object.entries(GAME_INTERVALS)) {
      const game = await this.prisma.game.findUnique({ where: { code } });
      if (!game || game.status !== 'ONLINE') continue;
      await this.lottery.preCreateIssues(code, interval, 3).catch(e =>
        this.logger.error(`preCreate[${code}] failed: ${e.message}`)
      );
    }
  }

  /** 每 5 秒：结算到期期号 */
  @Cron('*/5 * * * * *')
  async settle() {
    const now = new Date();
    const due = await this.prisma.lotteryIssue.findMany({
      where: {
        status: { in: ['PENDING', 'LOCKED'] },
        openAt: { lte: now },
      },
      take: 20,
    });

    for (const issue of due) {
      await this.lottery.draw(issue.id).catch(e =>
        this.logger.error(`settle[${issue.issueNo}] failed: ${e.message}`)
      );
    }

    // 封盘：lockAt 已过但仍 PENDING 的期号
    await this.prisma.lotteryIssue.updateMany({
      where: { status: 'PENDING', lockAt: { lte: now }, openAt: { gt: now } },
      data: { status: 'LOCKED' },
    });
  }
}
