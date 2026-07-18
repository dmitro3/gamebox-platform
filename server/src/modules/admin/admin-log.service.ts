/**
 * AdminLog 写入服务。
 * 在关键后台操作（审核/上下架/调配置）结束后调用 log()，记录操作人、动作、目标、详情。
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    operatorId: string,
    action: string,
    target?: string,
    detail?: object,
    ip?: string,
  ) {
    await this.prisma.adminLog.create({
      data: { operatorId, action, target, detail, ip },
    });
  }

  async logInTx(
    tx: Prisma.TransactionClient,
    operatorId: string,
    action: string,
    target?: string,
    detail?: object,
    ip?: string,
  ) {
    await tx.adminLog.create({
      data: { operatorId, action, target, detail, ip },
    });
  }
}
