/**
 * TableService — 棋牌桌面状态机（Redis 多实例协调）
 *
 * 状态机循环：BETTING(30s) → DRAWING(3s) → SETTLED(5s) → BETTING...
 *
 * 协调策略：
 *   - Redis 保存相位 / phaseEndsAt / 种子承诺 / 展示汇总
 *   - 每房间 leader 锁保证仅一个实例推进相位
 *   - Pub/Sub 同步快照到各 Gateway 实例
 *   - DB 保持资金与注单权威；结算/退款使用 CAS
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { genServerSeed } from '../game-core/fairness.util';
import { businessNo } from '../game-core/business-id';
import { drawCards, calcPayout } from './dragon-tiger.game';
import type { TableBetPayload, TableSnapshot } from './table.types';
import {
  TABLE_BROADCAST_CHANNEL,
  roomKey,
  roomLeaderKey,
  secondsLeftOf,
  type RedisRoomState,
} from './table.redis-state';

const BETTING_MS = 30_000;
const DRAWING_MS = 3_000;
const SETTLED_MS = 5_000;
const REBATE_RATE = 0.005;
const LEADER_TTL_MS = 3_000;
const TICK_MS = 1_000;
/** 超过完整周期 + 缓冲仍 PLAYING 且 Redis 无活跃相位 → 孤儿退款 */
const ORPHAN_GRACE_MS = BETTING_MS + DRAWING_MS + SETTLED_MS + 60_000;

@Injectable()
export class TableService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TableService.name);
  private readonly instanceId = randomUUID();
  private readonly leading = new Set<string>();
  private broadcastFn: ((gameCode: string, snap: TableSnapshot) => void) | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private knownRooms = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private points: PointsService,
    private commission: CommissionService,
  ) {}

  async onModuleInit() {
    await this.redis.subscribe(TABLE_BROADCAST_CHANNEL, (message) => {
      try {
        const snap = JSON.parse(message) as TableSnapshot;
        this.broadcastFn?.(snap.gameCode, snap);
      } catch (err) {
        this.logger.warn(`忽略非法广播: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    await this.discoverRooms();
    await this.recoverOrphanRounds();

    this.tickTimer = setInterval(() => {
      void this.leaderTick();
    }, TICK_MS);
  }

  /** 从 Redis 恢复本实例需要竞选 leader 的房间列表 */
  private async discoverRooms() {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.raw.scan(cursor, 'MATCH', 'table:room:*', 'COUNT', 50);
      cursor = next;
      for (const key of keys) {
        if (key.endsWith(':leader')) continue;
        const gameCode = key.slice('table:room:'.length);
        if (gameCode && !gameCode.includes(':')) this.knownRooms.add(gameCode);
      }
    } while (cursor !== '0');
  }

  onModuleDestroy() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    for (const gameCode of [...this.leading]) {
      void this.redis.releaseLock(roomLeaderKey(gameCode), this.instanceId);
    }
  }

  setBroadcast(fn: (gameCode: string, snap: TableSnapshot) => void) {
    this.broadcastFn = fn;
  }

  /**
   * 仅退款「无法从 Redis 恢复」的过期孤儿局。
   * 多实例下正常 PLAYING 局由 leader 接管，禁止启动时全量退款。
   */
  private async recoverOrphanRounds() {
    const cutoff = new Date(Date.now() - ORPHAN_GRACE_MS);
    const candidates = await this.prisma.gameRound.findMany({
      where: {
        category: 'TABLE',
        state: 'PLAYING',
        startedAt: { lt: cutoff },
      },
      select: { id: true, roundNo: true, game: { select: { code: true } } },
    });

    for (const round of candidates) {
      const gameCode = round.game.code;
      const room = await this.loadRoom(gameCode);
      if (room?.roundId === round.id && room.phaseEndsAt > Date.now() - ORPHAN_GRACE_MS) {
        continue;
      }
      this.logger.warn(`孤儿桌局退款 ${round.roundNo}`);
      await this.refundRound(round.id, '孤儿桌局超时，作废退款');
    }
  }

  private async refundRound(roundId: string, reason: string) {
    const pendingBets = await this.prisma.bet.findMany({
      where: { roundId, status: 'PENDING' },
    });
    if (pendingBets.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const bet of pendingBets) {
          const claimed = await tx.bet.updateMany({
            where: { id: bet.id, status: 'PENDING' },
            data: { status: 'CANCELLED', settledAt: new Date() },
          });
          if (claimed.count === 0) continue;
          await this.points.creditInTx(tx, 'PLAYER', bet.playerId, bet.amount, 'ADJUST', {
            refType: 'round',
            refId: roundId,
            remark: reason,
            idempotencyKey: `table_refund_player_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -bet.amount, 'ADJUST', {
            refType: 'round',
            refId: roundId,
            remark: reason,
            idempotencyKey: `table_refund_plat_${bet.id}`,
          });
        }
      });
    }
    await this.prisma.gameRound.updateMany({
      where: { id: roundId, state: 'PLAYING' },
      data: { state: 'CANCELLED', endedAt: new Date() },
    });
  }

  async getOrCreateRoom(gameCode: string): Promise<RedisRoomState> {
    const existing = await this.loadRoom(gameCode);
    if (existing) {
      this.knownRooms.add(gameCode);
      return existing;
    }

    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game || game.category !== 'TABLE' || game.status !== 'ONLINE') {
      throw new BadRequestException('桌面游戏不存在或未上线');
    }

    const raced = await this.loadRoom(gameCode);
    if (raced) {
      this.knownRooms.add(gameCode);
      return raced;
    }

    const { seed, hash } = genServerSeed();
    const room: RedisRoomState = {
      gameCode,
      gameId: game.id,
      gameName: game.name,
      minBet: game.minBet,
      maxBet: game.maxBet,
      roundId: null,
      roundNo: this.genRoundNo(gameCode),
      phase: 'BETTING',
      phaseEndsAt: Date.now() + BETTING_MS,
      outcome: null,
      serverSeed: seed,
      serverSeedHash: hash,
      nonce: 1,
      betSummary: {},
      history: [],
    };

    const created = await this.redis.raw.set(
      roomKey(gameCode),
      JSON.stringify(room),
      'NX',
    );
    if (created !== 'OK') {
      const again = await this.loadRoom(gameCode);
      if (again) {
        this.knownRooms.add(gameCode);
        return again;
      }
    }

    this.knownRooms.add(gameCode);
    await this.publishSnapshot(room);
    return room;
  }

  private async loadRoom(gameCode: string): Promise<RedisRoomState | null> {
    const raw = await this.redis.get(roomKey(gameCode));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RedisRoomState;
    } catch {
      return null;
    }
  }

  private async saveRoom(room: RedisRoomState): Promise<void> {
    await this.redis.set(roomKey(room.gameCode), JSON.stringify(room));
  }

  private async leaderTick() {
    for (const gameCode of this.knownRooms) {
      try {
        const lockKey = roomLeaderKey(gameCode);
        let isLeader = this.leading.has(gameCode);
        if (isLeader) {
          const renewed = await this.redis.renewLock(lockKey, this.instanceId, LEADER_TTL_MS);
          if (!renewed) {
            this.leading.delete(gameCode);
            isLeader = false;
          }
        }
        if (!isLeader) {
          const acquired = await this.redis.tryLock(lockKey, this.instanceId, LEADER_TTL_MS);
          if (!acquired) continue;
          this.leading.add(gameCode);
        }

        const room = await this.loadRoom(gameCode);
        if (!room) {
          this.knownRooms.delete(gameCode);
          this.leading.delete(gameCode);
          await this.redis.releaseLock(lockKey, this.instanceId);
          continue;
        }

        if (Date.now() >= room.phaseEndsAt) {
          await this.transition(room);
        } else {
          await this.publishSnapshot(room);
        }
      } catch (err) {
        this.logger.error(
          `leaderTick ${gameCode} 失败`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  private async transition(room: RedisRoomState) {
    if (room.phase === 'BETTING') {
      room.phase = 'DRAWING';
      room.phaseEndsAt = Date.now() + DRAWING_MS;
      room.outcome = drawCards(room.serverSeed, room.nonce);
      await this.saveRoom(room);
      await this.settle(room);
      await this.publishSnapshot(room);
      return;
    }

    if (room.phase === 'DRAWING') {
      room.phase = 'SETTLED';
      room.phaseEndsAt = Date.now() + SETTLED_MS;
      await this.saveRoom(room);
      await this.publishSnapshot(room);
      return;
    }

    if (room.phase === 'SETTLED') {
      if (room.roundId) {
        const stragglers = await this.prisma.bet.count({
          where: { roundId: room.roundId, status: 'PENDING' },
        });
        if (stragglers > 0) {
          await this.refundRoundBetsOnly(room.roundId, '投注晚于封盘，退款');
        }
      }

      const { seed, hash } = genServerSeed();
      room.phase = 'BETTING';
      room.phaseEndsAt = Date.now() + BETTING_MS;
      room.serverSeed = seed;
      room.serverSeedHash = hash;
      room.nonce += 1;
      room.roundNo = this.genRoundNo(room.gameCode);
      room.roundId = null;
      room.outcome = null;
      room.betSummary = {};
      await this.saveRoom(room);
      await this.publishSnapshot(room);
    }
  }

  private async refundRoundBetsOnly(roundId: string, reason: string) {
    const pendingBets = await this.prisma.bet.findMany({
      where: { roundId, status: 'PENDING' },
    });
    await this.prisma.$transaction(async (tx) => {
      for (const bet of pendingBets) {
        const claimed = await tx.bet.updateMany({
          where: { id: bet.id, status: 'PENDING' },
          data: { status: 'CANCELLED', settledAt: new Date() },
        });
        if (claimed.count === 0) continue;
        await this.points.creditInTx(tx, 'PLAYER', bet.playerId, bet.amount, 'ADJUST', {
          refType: 'round',
          refId: roundId,
          remark: reason,
          idempotencyKey: `table_refund_player_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -bet.amount, 'ADJUST', {
          refType: 'round',
          refId: roundId,
          remark: reason,
          idempotencyKey: `table_refund_plat_${bet.id}`,
        });
      }
    });
  }

  private async settle(room: RedisRoomState) {
    const outcome = room.outcome;
    if (!outcome || !room.roundId) return;
    const roundId = room.roundId;

    try {
      const bets = await this.prisma.bet.findMany({
        where: { roundId, status: 'PENDING' },
      });
      const totalFlow = bets.reduce((s, b) => s + b.amount, 0);

      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.gameRound.updateMany({
          where: { id: roundId, state: 'PLAYING' },
          data: {
            state: 'SETTLED',
            endedAt: new Date(),
            totalFlow,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            outcome: outcome as any,
            serverSeed: room.serverSeed,
          },
        });
        if (claimed.count === 0) return;

        for (const bet of bets) {
          const payout = calcPayout(bet.betType ?? '', outcome, bet.amount);
          const won = bet.betType === outcome.winner;

          const betClaimed = await tx.bet.updateMany({
            where: { id: bet.id, status: 'PENDING' },
            data: {
              status: won ? 'WON' : 'LOST',
              payout,
              odds: bet.amount > 0 ? payout / bet.amount : 0,
              validFlow: bet.amount,
              settledAt: new Date(),
            },
          });
          if (betClaimed.count === 0) continue;

          if (payout > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
              refType: 'round',
              refId: roundId,
              remark: `${room.gameName} ${outcome.winner} 派彩`,
              idempotencyKey: `table_win_plat_${bet.id}`,
            });
            await this.points.creditInTx(tx, 'PLAYER', bet.playerId, payout, 'WIN', {
              refType: 'round',
              refId: roundId,
              remark: `${room.gameName} ${outcome.winner}`,
              idempotencyKey: `table_win_player_${bet.id}`,
            });
          }

          const rebateAmt = Math.floor(bet.amount * REBATE_RATE);
          if (rebateAmt > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
              refType: 'round',
              refId: roundId,
              idempotencyKey: `table_rebate_plat_${bet.id}`,
            });
            const rebateLedger = await this.points.creditInTx(
              tx,
              'PLAYER',
              bet.playerId,
              rebateAmt,
              'REBATE',
              {
                refType: 'round',
                refId: roundId,
                remark: '回水',
                idempotencyKey: `table_rebate_player_${bet.id}`,
              },
            );
            await tx.rebateRecord.create({
              data: {
                playerId: bet.playerId,
                sourceRoundId: roundId,
                personalFlow: bet.amount,
                rate: REBATE_RATE,
                amount: rebateAmt,
                ledgerId: rebateLedger.id,
              },
            });
          }

          const player = await tx.user.findUnique({
            where: { id: bet.playerId },
            select: { id: true, agentPath: true },
          });
          if (player?.agentPath) {
            await this.commission.distributeInTx(
              tx,
              player,
              bet.amount,
              roundId,
              `table_${bet.id}`,
            );
          }
        }
      });

      room.history.unshift({
        roundNo: room.roundNo,
        outcome,
        createdAt: new Date().toISOString(),
      });
      if (room.history.length > 20) room.history.pop();
      await this.saveRoom(room);
    } catch (err) {
      this.logger.error(
        `结算失败 ${room.gameCode} round=${roundId}，尝试退款作废`,
        err instanceof Error ? err.stack : String(err),
      );
      try {
        await this.refundRound(roundId, '结算异常，本局作废退款');
      } catch (refundErr) {
        this.logger.error(
          `退款兜底也失败 round=${roundId}`,
          refundErr instanceof Error ? refundErr.stack : String(refundErr),
        );
      }
    }
  }

  /** 玩家下注：复核 Redis 相位 + DB PLAYING CAS */
  async placeBet(playerId: string, payload: TableBetPayload) {
    const { roomId, side, amount } = payload;
    const room = await this.getOrCreateRoom(roomId);
    if (room.phase !== 'BETTING' || Date.now() >= room.phaseEndsAt) {
      throw new BadRequestException('当前不在下注阶段');
    }
    if (!Number.isInteger(amount) || amount < room.minBet || amount > room.maxBet) {
      throw new BadRequestException(`下注额须在 ${room.minBet}~${room.maxBet} 之间`);
    }
    if (!['DRAGON', 'TIGER', 'TIE'].includes(side)) {
      throw new BadRequestException('投注方向无效');
    }

    let roundId = room.roundId;
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!roundId) {
          try {
            const created = await tx.gameRound.create({
              data: {
                roundNo: room.roundNo,
                gameId: room.gameId,
                category: 'TABLE',
                state: 'PLAYING',
                serverSeedHash: room.serverSeedHash,
                nonce: room.nonce,
              },
            });
            roundId = created.id;
          } catch (err) {
            if (
              !(err instanceof Prisma.PrismaClientKnownRequestError) ||
              err.code !== 'P2002'
            ) {
              throw err;
            }
            const existing = await tx.gameRound.findUnique({
              where: { roundNo: room.roundNo },
              select: { id: true, state: true },
            });
            if (!existing || existing.state !== 'PLAYING') {
              throw new BadRequestException('本局已封盘');
            }
            roundId = existing.id;
          }
        } else {
          const live = await tx.gameRound.findUnique({
            where: { id: roundId },
            select: { state: true },
          });
          if (!live || live.state !== 'PLAYING') {
            throw new BadRequestException('本局已封盘');
          }
        }

        // 事务内再读 Redis，降低封盘竞态
        const fresh = await this.loadRoom(roomId);
        if (!fresh || fresh.phase !== 'BETTING' || Date.now() >= fresh.phaseEndsAt) {
          throw new BadRequestException('当前不在下注阶段');
        }
        if (fresh.roundNo !== room.roundNo) {
          throw new BadRequestException('局号已切换，请重试');
        }

        const bet = await tx.bet.create({
          data: {
            betNo: businessNo('TB'),
            playerId,
            gameId: room.gameId,
            roundId: roundId!,
            betType: side,
            amount,
            status: 'PENDING',
          },
        });

        await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
          refType: 'round',
          refId: roundId!,
          remark: `${room.gameName}下注 ${side}`,
          idempotencyKey: `table_bet_player_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
          refType: 'round',
          refId: roundId!,
          remark: `${room.gameName} 注资 ${room.roundNo}`,
          idempotencyKey: `table_bet_plat_${bet.id}`,
        });
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw err;
    }

    const latest = (await this.loadRoom(roomId)) ?? room;
    if (!latest.roundId && roundId) latest.roundId = roundId;
    latest.betSummary[side] = (latest.betSummary[side] ?? 0) + amount;
    await this.saveRoom(latest);
    await this.publishSnapshot(latest);

    return { roomId, side, amount };
  }

  async snapshot(gameCode: string): Promise<TableSnapshot> {
    const room = await this.getOrCreateRoom(gameCode);
    return this.buildSnapshot(room);
  }

  private buildSnapshot(room: RedisRoomState): TableSnapshot {
    return {
      roomId: room.gameCode,
      gameCode: room.gameCode,
      phase: room.phase,
      roundNo: room.roundNo,
      secondsLeft: secondsLeftOf(room),
      outcome: room.outcome ?? undefined,
      betSummary: { ...room.betSummary },
      history: room.history.slice(0, 10),
    };
  }

  private async publishSnapshot(room: RedisRoomState) {
    const snap = this.buildSnapshot(room);
    this.broadcastFn?.(room.gameCode, snap);
    await this.redis.publish(TABLE_BROADCAST_CHANNEL, JSON.stringify(snap));
  }

  private genRoundNo(gameCode: string): string {
    return businessNo(`T_${gameCode}_`);
  }
}
