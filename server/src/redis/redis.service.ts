import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private sub!: Redis;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(url, { maxRetriesPerRequest: 3 });
    this.sub = this.client.duplicate();
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.sub.on('error', (err) => this.logger.error(`Redis sub error: ${err.message}`));
    await this.client.ping();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.sub?.quit(), this.client?.quit()]);
  }

  get raw(): Redis {
    return this.client;
  }

  get subscriber(): Redis {
    return this.sub;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (ttlSec && ttlSec > 0) {
      await this.client.set(key, value, 'EX', ttlSec);
      return;
    }
    await this.client.set(key, value);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    await this.sub.subscribe(channel);
    this.sub.on('message', (ch, message) => {
      if (ch === channel) handler(message);
    });
  }

  /** SET key token NX PX ttlMs —— 成功返回 true */
  async tryLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const res = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  /** 仅当 token 匹配时续期 */
  async renewLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const res = await this.client.eval(script, 1, key, token, String(ttlMs));
    return Number(res) === 1;
  }

  /** 仅当 token 匹配时释放 */
  async releaseLock(key: string, token: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.client.eval(script, 1, key, token);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
