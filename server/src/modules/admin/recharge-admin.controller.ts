import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/recharge')
@Roles('ADMIN', 'BRANCH')
export class RechargeAdminController {
  constructor(private prisma: PrismaService) {}

  /** 全量订单列表（含玩家信息），供后台审核台使用 */
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (type)   where['type']   = type;

    const [total, list] = await this.prisma.$transaction([
      this.prisma.rechargeOrder.count({ where }),
      this.prisma.rechargeOrder.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { player: { select: { uid: true, nickname: true } } },
      }),
    ]);

    return { total, page, pageSize, list };
  }
}
