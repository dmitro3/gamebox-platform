import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface RiskEventInput {
  type: string;
  level?: 'INFO' | 'WARN' | 'CRITICAL';
  targetId?: string;
  detail?: Record<string, unknown>;
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(private prisma: PrismaService) {}

  async record(input: RiskEventInput): Promise<void> {
    try {
      await this.recordInTx(this.prisma, input);
    } catch (error) {
      // 风控写入不能破坏资金主事务，但必须留下可观测日志。
      this.logger.error('写入风控事件失败', error instanceof Error ? error.stack : String(error));
    }
  }

  async recordInTx(
    tx: Prisma.TransactionClient | PrismaService,
    input: RiskEventInput,
  ): Promise<void> {
    await tx.riskEvent.create({
      data: {
        type: input.type,
        level: input.level ?? 'INFO',
        targetId: input.targetId,
        detail: input.detail as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
