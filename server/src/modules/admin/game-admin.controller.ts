import {
  Controller, Get, Patch, Post, Param, Body, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminLogService } from './admin-log.service';
import { GameConfigCache } from '../game-core/game-config.cache';
import { validateGamePayTable } from '../game-core/game-config.validator';

@Controller('admin/games')
@Roles('ADMIN')
export class GameAdminController {
  constructor(
    private prisma: PrismaService,
    private adminLog: AdminLogService,
    private configCache: GameConfigCache,
  ) {}

  /** 游戏列表（含所有配置版本） */
  @Get()
  async list() {
    return this.prisma.game.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        configs: {
          select: { id: true, version: true, rtp: true, active: true },
          orderBy: { version: 'desc' },
        },
      },
    });
  }

  /** 上下架 */
  @Patch(':code/status')
  async setStatus(
    @Param('code') code: string,
    @Body('status') status: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!['ONLINE', 'OFFLINE', 'MAINTENANCE'].includes(status)) {
      throw new BadRequestException('无效状态');
    }
    const game = await this.prisma.game.findUnique({ where: { code } });
    if (!game) throw new NotFoundException('游戏不存在');

    await this.prisma.game.update({ where: { code }, data: { status: status as never } });
    this.configCache.invalidate(code);
    await this.adminLog.log(user.id, 'GAME_STATUS_CHANGE', code, { from: game.status, to: status });
    return { ok: true };
  }

  /** 查某游戏所有配置版本 */
  @Get(':code/configs')
  async listConfigs(@Param('code') code: string) {
    const game = await this.prisma.game.findUnique({ where: { code } });
    if (!game) throw new NotFoundException('游戏不存在');
    return this.prisma.gameConfig.findMany({
      where: { gameId: game.id },
      orderBy: { version: 'desc' },
    });
  }

  /** 新建爆率配置版本并激活 */
  @Post(':code/config')
  async createConfig(
    @Param('code') code: string,
    @Body() body: { rtp: number; payTable: unknown },
    @CurrentUser() user: { id: string },
  ) {
    const game = await this.prisma.game.findUnique({ where: { code } });
    if (!game) throw new NotFoundException('游戏不存在');
    if (body.rtp <= 0 || body.rtp >= 1) throw new BadRequestException('RTP 须在 0~1 之间');
    validateGamePayTable(game, body.payTable);

    // 最新版本号 + 1
    const last = await this.prisma.gameConfig.findFirst({
      where: { gameId: game.id }, orderBy: { version: 'desc' },
    });
    const newVersion = (last?.version ?? 0) + 1;

    await this.prisma.$transaction([
      this.prisma.gameConfig.updateMany({ where: { gameId: game.id, active: true }, data: { active: false } }),
      this.prisma.gameConfig.create({
        data: { gameId: game.id, version: newVersion, active: true, rtp: body.rtp, payTable: body.payTable as never },
      }),
    ]);

    this.configCache.invalidate(code);
    await this.adminLog.log(user.id, 'GAME_CONFIG_UPDATE', code, { version: newVersion, rtp: body.rtp });
    return { ok: true, version: newVersion };
  }

  /** 激活历史配置版本 */
  @Patch(':code/config/:version/activate')
  async activateConfig(
    @Param('code') code: string,
    @Param('version') versionStr: string,
    @CurrentUser() user: { id: string },
  ) {
    const version = parseInt(versionStr);
    const game = await this.prisma.game.findUnique({ where: { code } });
    if (!game) throw new NotFoundException('游戏不存在');

    const config = await this.prisma.gameConfig.findFirst({ where: { gameId: game.id, version } });
    if (!config) throw new NotFoundException('版本不存在');

    await this.prisma.$transaction([
      this.prisma.gameConfig.updateMany({ where: { gameId: game.id, active: true }, data: { active: false } }),
      this.prisma.gameConfig.update({ where: { id: config.id }, data: { active: true } }),
    ]);

    this.configCache.invalidate(code);
    await this.adminLog.log(user.id, 'GAME_CONFIG_ACTIVATE', code, { version });
    return { ok: true };
  }
}
