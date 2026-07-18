import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.ping(),
    ]);

    const status = dbOk && redisOk ? 'ok' : 'degraded';
    const body = {
      status,
      db: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      ts: new Date().toISOString(),
    };

    if (status !== 'ok') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
