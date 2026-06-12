/**
 * 代理端接口（client-app 内的"代理中心"）。
 * 任何玩家都可以发展下线（全民代理模式）：
 *   - 我的推广码（首次访问自动生成）
 *   - 团队概览/直属下级列表
 *   - 佣金明细
 *   - 给直属下级上分（点对点转账）
 */
import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService } from '../points/points.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

export class AgentTransferDto {
  /** 下级的 9 位 UID */
  @IsString() targetUid!: string;
  @IsInt() @Min(1) @Max(10_000_000) @Type(() => Number) amount!: number;
}

@Controller('agent')
export class AgentController {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
  ) {}

  /** GET /api/agent/overview — 概览（推广码自动生成） */
  @Get('overview')
  async overview(@CurrentUser() u: { id: string }) {
    let user = await this.prisma.user.findUniqueOrThrow({
      where: { id: u.id },
      select: { id: true, promoCode: true },
    });

    // 首次访问生成推广码
    if (!user.promoCode) {
      for (let i = 0; i < 5; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        try {
          user = await this.prisma.user.update({
            where: { id: u.id },
            data: { promoCode: code },
            select: { id: true, promoCode: true },
          });
          break;
        } catch { /* 撞码重试 */ }
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [directCount, teamCount, totalAgg, todayAgg] = await Promise.all([
      this.prisma.user.count({ where: { parentId: u.id } }),
      this.prisma.user.count({ where: { agentPath: { contains: `/${u.id}/` } } }),
      this.prisma.commissionRecord.aggregate({
        where: { beneficiaryId: u.id },
        _sum: { amount: true },
      }),
      this.prisma.commissionRecord.aggregate({
        where: { beneficiaryId: u.id, settledAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
    ]);

    return {
      promoCode: user.promoCode,
      directCount,
      teamCount,
      totalCommission: totalAgg._sum.amount ?? 0,
      todayCommission: todayAgg._sum.amount ?? 0,
    };
  }

  /** GET /api/agent/team — 直属下级列表（含个人流水/贡献佣金） */
  @Get('team')
  async team(
    @CurrentUser() u: { id: string },
    @Query('page') page = '1',
  ) {
    const take = 20;
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { parentId: u.id },
        orderBy: { createdAt: 'desc' },
        skip, take,
        select: { id: true, uid: true, nickname: true, createdAt: true, lastLoginAt: true },
      }),
      this.prisma.user.count({ where: { parentId: u.id } }),
    ]);

    // 每个下级的累计有效流水 + 给我贡献的佣金
    const enriched = await Promise.all(members.map(async (m) => {
      const [flowAgg, commAgg] = await Promise.all([
        this.prisma.bet.aggregate({
          where: { playerId: m.id, status: { in: ['WON', 'LOST'] } },
          _sum: { validFlow: true },
        }),
        this.prisma.commissionRecord.aggregate({
          where: { beneficiaryId: u.id, sourceUserId: m.id },
          _sum: { amount: true },
        }),
      ]);
      return {
        uid: m.uid,
        nickname: m.nickname,
        createdAt: m.createdAt,
        lastLoginAt: m.lastLoginAt,
        totalFlow: flowAgg._sum.validFlow ?? 0,
        myCommission: commAgg._sum.amount ?? 0,
      };
    }));

    return { list: enriched, total, page: Number(page) };
  }

  /** GET /api/agent/commissions — 我的佣金明细 */
  @Get('commissions')
  async commissions(
    @CurrentUser() u: { id: string },
    @Query('page') page = '1',
  ) {
    const take = 20;
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const [records, total] = await Promise.all([
      this.prisma.commissionRecord.findMany({
        where: { beneficiaryId: u.id },
        orderBy: { settledAt: 'desc' },
        skip, take,
        select: {
          id: true, level: true, baseFlow: true, rate: true, amount: true, settledAt: true,
          sourceUser: { select: { uid: true, nickname: true } },
        },
      }),
      this.prisma.commissionRecord.count({ where: { beneficiaryId: u.id } }),
    ]);

    return { list: records, total, page: Number(page) };
  }

  /** POST /api/agent/transfer — 给直属下级上分（从我的余额转出） */
  @Post('transfer')
  async transfer(@CurrentUser() u: { id: string }, @Body() dto: AgentTransferDto) {
    const target = await this.prisma.user.findUnique({
      where: { uid: dto.targetUid },
      select: { id: true, uid: true, nickname: true, parentId: true, status: true },
    });
    if (!target) throw new BadRequestException('该 UID 不存在');
    if (target.parentId !== u.id) throw new BadRequestException('只能给自己的直属下级上分');
    if (target.status === 'DISABLED') throw new BadRequestException('对方账号已禁用');

    await this.points.transfer(
      { type: 'PLAYER', id: u.id },
      { type: 'PLAYER', id: target.id },
      dto.amount,
      { remark: `代理上分给 ${target.uid}` },
    );

    return { targetUid: target.uid, nickname: target.nickname, amount: dto.amount };
  }
}
