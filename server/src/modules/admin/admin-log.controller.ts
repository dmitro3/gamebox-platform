import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/logs')
@Roles('ADMIN')
export class AdminLogController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    const [total, list] = await this.prisma.$transaction([
      this.prisma.adminLog.count(),
      this.prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { operator: { select: { uid: true, nickname: true } } },
      }),
    ]);
    return { total, page, pageSize, list };
  }
}
