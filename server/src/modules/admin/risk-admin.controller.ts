import {
  Controller, Get, Patch, Query, Param,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/risk')
@Roles('ADMIN', 'BRANCH')
export class RiskAdminController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('handled') handledStr?: string,
    @Query('level') level?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const where: Record<string, unknown> = {};
    if (handledStr !== undefined) where['handled'] = handledStr === 'true';
    if (level) where['level'] = level;

    const [total, list] = await this.prisma.$transaction([
      this.prisma.riskEvent.count({ where }),
      this.prisma.riskEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, list };
  }

  @Patch(':id/handle')
  async handle(@Param('id') id: string) {
    await this.prisma.riskEvent.update({ where: { id }, data: { handled: true } });
    return { ok: true };
  }
}
