import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type OwnerType = 'PLATFORM' | 'BRANCH' | 'AGENT' | 'PROXY' | 'PLAYER';
export type BizType =
  | 'RECHARGE'
  | 'WITHDRAW'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'BET'
  | 'WIN'
  | 'FEE'
  | 'COMMISSION'
  | 'REBATE'
  | 'ACTIVITY'
  | 'ADJUST';

export interface LedgerOpts {
  refType?: string;
  refId?: string;
  remark?: string;
  operatorId?: string;
  idempotencyKey?: string;
}

export const PLATFORM_OWNER_ID = 'PLATFORM';

/**
 * 积分账本 —— 全平台积分变动的唯一入口。
 * 规则：
 *   1. 任何余额变动必须经此服务，且必须写一条 PointsLedger
 *   2. 转账 = 同一事务内 出账 + 入账 两条流水
 *   3. 所有写入用 $transaction，禁止事务外更新 balance
 *   4. idempotencyKey 幂等，防重复扣/派彩
 *   5. PLATFORM 账户允许为负（代表已下发到生态的积分总量），其余禁止透支
 */
@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async credit(
    ownerType: OwnerType,
    ownerId: string,
    amount: number,
    bizType: BizType,
    opts: LedgerOpts = {},
  ) {
    if (amount === 0) throw new BadRequestException('金额不能为 0');
    return this.prisma.$transaction((tx) =>
      this.creditInTx(tx, ownerType, ownerId, amount, bizType, opts),
    );
  }

  /** 复用外部事务（供结算/分润批量调用） */
  async creditInTx(
    tx: Prisma.TransactionClient,
    ownerType: OwnerType,
    ownerId: string,
    amount: number,
    bizType: BizType,
    opts: LedgerOpts = {},
  ) {
    if (opts.idempotencyKey) {
      const existed = await tx.pointsLedger.findUnique({
        where: { idempotencyKey: opts.idempotencyKey },
      });
      if (existed) return existed;
    }

    let account = await tx.pointsAccount.findUnique({ where: { ownerId } });
    if (!account) {
      account = await tx.pointsAccount.create({ data: { ownerType: ownerType as never, ownerId } });
    }

    const newBalance = account.balance + amount;
    if (newBalance < 0 && ownerType !== 'PLATFORM') {
      throw new BadRequestException(`账户余额不足：${ownerType}/${ownerId}`);
    }

    await tx.pointsAccount.update({ where: { id: account.id }, data: { balance: newBalance } });

    return tx.pointsLedger.create({
      data: {
        accountId: account.id,
        bizType: bizType as never,
        amount,
        balanceAfter: newBalance,
        refType: opts.refType,
        refId: opts.refId,
        remark: opts.remark,
        operatorId: opts.operatorId,
        idempotencyKey: opts.idempotencyKey,
      },
    });
  }

  /** 标准转账：A 扣，B 加，同事务两条流水 */
  async transfer(
    from: { type: OwnerType; id: string },
    to: { type: OwnerType; id: string },
    amount: number,
    opts: LedgerOpts & { bizTypeOut?: BizType; bizTypeIn?: BizType } = {},
  ) {
    if (amount <= 0) throw new BadRequestException('转账金额必须 > 0');
    if (from.id === to.id) throw new BadRequestException('不能转给自己');
    const bizOut = opts.bizTypeOut ?? 'TRANSFER_OUT';
    const bizIn = opts.bizTypeIn ?? 'TRANSFER_IN';
    return this.prisma.$transaction(async (tx) => {
      const outKey = opts.idempotencyKey ? `${opts.idempotencyKey}:OUT` : undefined;
      const inKey = opts.idempotencyKey ? `${opts.idempotencyKey}:IN` : undefined;
      const out = await this.creditInTx(tx, from.type, from.id, -amount, bizOut, {
        ...opts,
        idempotencyKey: outKey,
      });
      const inn = await this.creditInTx(tx, to.type, to.id, amount, bizIn, {
        ...opts,
        idempotencyKey: inKey,
      });
      return { out, in: inn };
    });
  }
}
