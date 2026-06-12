import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';

/**
 * 多级代理分润。
 * 当一笔有效流水产生后，沿玩家的代理链向上逐级分润：
 *   玩家 → 直属代理(level1) → 上级(level2) → ... 直到 COMMISSION_MAX_LEVEL
 * 每级按其佣金率从平台账户出账，写 CommissionRecord + 账本流水（幂等）。
 *
 * 代理链来源：User.agentPath（物化路径，形如 "/p_id/b_id/a_id/"）。
 */
@Injectable()
export class CommissionService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private cfg: ConfigService,
  ) {}

  /** 解析 agentPath 得到从直属到顶层的祖先 userId 列表 */
  private parseAncestors(agentPath: string): string[] {
    return agentPath.split('/').filter(Boolean).reverse(); // 直属在前
  }

  /**
   * 对一笔有效流水分润（在结算事务内调用）。
   * @param tx        外部事务
   * @param sourceUser 产生流水的下线（含 agentPath）
   * @param validFlow  有效流水
   * @param refRoundId 关联局（可空）
   */
  async distributeInTx(
    tx: Prisma.TransactionClient,
    sourceUser: { id: string; agentPath: string },
    validFlow: number,
    refRoundId?: string,
  ): Promise<void> {
    if (validFlow <= 0) return;
    const maxLevel = Number(this.cfg.get('COMMISSION_MAX_LEVEL') ?? 5);
    const ancestors = this.parseAncestors(sourceUser.agentPath).slice(0, maxLevel);

    for (let i = 0; i < ancestors.length; i++) {
      const beneficiaryUserId = ancestors[i];
      const agent = await tx.agent.findUnique({ where: { userId: beneficiaryUserId } });
      if (!agent || agent.commissionRate <= 0) continue;

      const amount = Math.floor(validFlow * agent.commissionRate);
      if (amount <= 0) continue;

      const key = `commission:${refRoundId ?? 'flow'}:${sourceUser.id}:${beneficiaryUserId}`;
      // 平台出账 → 代理入账
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -amount, 'COMMISSION', {
        refType: 'round',
        refId: refRoundId,
        idempotencyKey: `${key}:OUT`,
      });
      const ownerType = await this.ownerTypeOf(tx, beneficiaryUserId);
      const ledger = await this.points.creditInTx(
        tx,
        ownerType,
        beneficiaryUserId,
        amount,
        'COMMISSION',
        { refType: 'round', refId: refRoundId, idempotencyKey: `${key}:IN` },
      );

      await tx.commissionRecord.create({
        data: {
          beneficiaryId: beneficiaryUserId,
          sourceUserId: sourceUser.id,
          level: i + 1,
          sourceRoundId: refRoundId,
          baseFlow: validFlow,
          rate: agent.commissionRate,
          amount,
          ledgerId: ledger.id,
        },
      });
    }
  }

  private async ownerTypeOf(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<'BRANCH' | 'AGENT' | 'PROXY'> {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (u?.role === 'BRANCH') return 'BRANCH';
    if (u?.role === 'PROXY') return 'PROXY';
    return 'AGENT';
  }
}
