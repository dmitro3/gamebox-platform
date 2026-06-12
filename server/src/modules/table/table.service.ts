/**
 * TableService — 棋牌桌面状态机
 *
 * 每个 gameCode 对应一个独立"房间"（房间只有一桌，无需分组）。
 * 状态机循环：BETTING(30s) → DRAWING(3s) → SETTLED(5s) → BETTING...
 *
 * 所有下注/结算通过 PointsService 走账本，多级佣金通过 CommissionService 分润。
 */
import { Injectable, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { genServerSeed } from '../game-core/fairness.util';
import { drawCards, calcPayout } from './dragon-tiger.game';
import type { TablePhase, TableBetPayload, TableSnapshot, DragonTigerOutcome } from './table.types';

const BETTING_SECS = 30;
const DRAWING_SECS = 3;
const SETTLED_SECS = 5;
const REBATE_RATE   = 0.005;

export interface RoomState {
  gameCode: string;
  roundId: string | null;
  roundNo: string;
  phase: TablePhase;
  secondsLeft: number;
  outcome: DragonTigerOutcome | null;
  serverSeed: string;
  nonce: number;
  bets: Map<string, { playerId: string; side: string; amount: number }>; // betId → bet
  history: Array<{ roundNo: string; outcome: DragonTigerOutcome; createdAt: string }>;
  timer: ReturnType<typeof setInterval> | null;
}

@Injectable()
export class TableService implements OnModuleDestroy {
  private rooms = new Map<string, RoomState>();
  /** 外部注册的广播回调（由 Gateway 注入） */
  private broadcastFn: ((gameCode: string, snap: TableSnapshot) => void) | null = null;

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
  ) {}

  setBroadcast(fn: (gameCode: string, snap: TableSnapshot) => void) {
    this.broadcastFn = fn;
  }

  /** 初始化或获取一个房间，并启动状态机 */
  getOrCreateRoom(gameCode: string): RoomState {
    if (!this.rooms.has(gameCode)) {
      const { seed } = genServerSeed();
      const room: RoomState = {
        gameCode,
        roundId: null,
        roundNo: this.genRoundNo(),
        phase: 'BETTING',
        secondsLeft: BETTING_SECS,
        outcome: null,
        serverSeed: seed,
        nonce: 1,
        bets: new Map(),
        history: [],
        timer: null,
      };
      this.rooms.set(gameCode, room);
      this.tick(room);
    }
    return this.rooms.get(gameCode)!;
  }

  /** 内部每秒滴答 */
  private tick(room: RoomState) {
    room.timer = setInterval(async () => {
      room.secondsLeft -= 1;
      if (room.secondsLeft <= 0) {
        await this.transition(room);
      }
      this.broadcast(room);
    }, 1000);
  }

  private async transition(room: RoomState) {
    if (room.phase === 'BETTING') {
      room.phase = 'DRAWING';
      room.secondsLeft = DRAWING_SECS;
      room.outcome = drawCards(room.serverSeed, room.nonce);
      await this.settle(room);
    } else if (room.phase === 'DRAWING') {
      room.phase = 'SETTLED';
      room.secondsLeft = SETTLED_SECS;
    } else if (room.phase === 'SETTLED') {
      // 新局
      room.phase = 'BETTING';
      room.secondsLeft = BETTING_SECS;
      const { seed } = genServerSeed();
      room.serverSeed = seed;
      room.nonce += 1;
      room.roundNo = this.genRoundNo();
      room.roundId = null;
      room.outcome = null;
      room.bets.clear();
    }
  }

  private async settle(room: RoomState) {
    if (!room.outcome || room.bets.size === 0) return;
    const outcome = room.outcome;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const [, bet] of room.bets) {
          const payout = calcPayout(bet.side, outcome, bet.amount);
          const won = payout >= bet.amount; // 全赔或超出本金
          const validFlow = bet.amount;

          if (payout > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
              refType: 'round', remark: `龙虎 ${outcome.winner} 派彩`,
              idempotencyKey: `table_win_plat_${room.roundNo}_${bet.playerId}`,
            });
            await this.points.creditInTx(tx, 'PLAYER', bet.playerId, payout, 'WIN', {
              refType: 'round', remark: `龙虎斗 ${outcome.winner}`,
              idempotencyKey: `table_win_player_${room.roundNo}_${bet.playerId}`,
            });
          }

          // 回水
          const rebateAmt = Math.floor(validFlow * REBATE_RATE);
          if (rebateAmt > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
              refType: 'round',
              idempotencyKey: `table_rebate_plat_${room.roundNo}_${bet.playerId}`,
            });
            await this.points.creditInTx(tx, 'PLAYER', bet.playerId, rebateAmt, 'REBATE', {
              refType: 'round', remark: '回水',
              idempotencyKey: `table_rebate_player_${room.roundNo}_${bet.playerId}`,
            });
          }

          // 佣金
          const player = await tx.user.findUnique({
            where: { id: bet.playerId },
            select: { id: true, agentPath: true },
          });
          if (player?.agentPath) {
            await this.commission.distributeInTx(
              tx, player, validFlow, undefined,
              `table_${room.roundNo}_${bet.playerId}`,
            );
          }

          void won; // suppress lint
        }
      });

      // 保存历史
      room.history.unshift({
        roundNo: room.roundNo,
        outcome,
        createdAt: new Date().toISOString(),
      });
      if (room.history.length > 20) room.history.pop();
    } catch (err) {
      console.error('[TableService] settle error', err);
    }
  }

  /** 玩家下注 */
  async placeBet(playerId: string, payload: TableBetPayload) {
    const { roomId, side, amount } = payload;
    const room = this.rooms.get(roomId);
    if (!room) throw new BadRequestException('房间不存在');
    if (room.phase !== 'BETTING') throw new BadRequestException('当前不在下注阶段');
    if (!Number.isInteger(amount) || amount < 1 || amount > 100_000) {
      throw new BadRequestException('下注额无效');
    }
    if (!['DRAGON', 'TIGER', 'TIE'].includes(side)) {
      throw new BadRequestException('投注方向无效');
    }

    const idemKey = `table_bet_${room.roundNo}_${playerId}_${side}_${Date.now()}`;
    await this.points.credit('PLAYER', playerId, -amount, 'BET', {
      remark: `龙虎斗下注 ${side}`,
      idempotencyKey: idemKey,
    });
    await this.points.credit('PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
      remark: `龙虎 注资 ${room.roundNo}`,
      idempotencyKey: `${idemKey}_plat`,
    });

    // 记录到内存（同一玩家同侧累加）
    const key = `${playerId}_${side}`;
    const existing = room.bets.get(key);
    if (existing) {
      existing.amount += amount;
    } else {
      room.bets.set(key, { playerId, side, amount });
    }

    this.broadcast(room);
    return { roomId, side, amount };
  }

  snapshot(gameCode: string): TableSnapshot {
    const room = this.getOrCreateRoom(gameCode);
    return this.buildSnapshot(room);
  }

  private buildSnapshot(room: RoomState): TableSnapshot {
    const betSummary: Record<string, number> = {};
    for (const bet of room.bets.values()) {
      betSummary[bet.side] = (betSummary[bet.side] ?? 0) + bet.amount;
    }
    return {
      roomId: room.gameCode,
      gameCode: room.gameCode,
      phase: room.phase,
      roundNo: room.roundNo,
      secondsLeft: room.secondsLeft,
      outcome: room.outcome ?? undefined,
      betSummary,
      history: room.history.slice(0, 10),
    };
  }

  private broadcast(room: RoomState) {
    if (this.broadcastFn) {
      this.broadcastFn(room.gameCode, this.buildSnapshot(room));
    }
  }

  private genRoundNo(): string {
    const now = new Date();
    return `DT${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  }

  onModuleDestroy() {
    for (const room of this.rooms.values()) {
      if (room.timer) clearInterval(room.timer);
    }
  }
}
