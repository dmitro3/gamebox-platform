/**
 * TableService — 棋牌桌面状态机
 *
 * 每个 gameCode 对应一个独立"房间"。
 * 状态机循环：BETTING(30s) → DRAWING(3s) → SETTLED(5s) → BETTING...
 *
 * 持久化策略：
 *   - 每局首笔投注时创建 GameRound(PLAYING)，公布 serverSeedHash
 *   - 每笔投注写 Bet(PENDING)，与扣款同一事务
 *   - 结算时按 DB 中的 Bet 记录派彩，更新 Bet/GameRound 状态
 *   - 服务重启时，对 PLAYING 状态的桌局退款（防止扣了钱却丢局）
 *   - 开新局前对漏结算的 PENDING 投注兜底退款
 */
import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PointsService, PLATFORM_OWNER_ID } from '../points/points.service';
import { CommissionService } from '../agents/commission.service';
import { genServerSeed } from '../game-core/fairness.util';
import { drawCards, calcPayout } from './dragon-tiger.game';
import type { TablePhase, TableBetPayload, TableSnapshot, DragonTigerOutcome } from './table.types';

const BETTING_SECS = 30;
const DRAWING_SECS = 3;
const SETTLED_SECS = 5;
const REBATE_RATE  = 0.005;

export interface RoomState {
  gameCode: string;
  gameId: string;
  gameName: string;
  minBet: number;
  maxBet: number;
  roundId: string | null;
  roundNo: string;
  phase: TablePhase;
  secondsLeft: number;
  outcome: DragonTigerOutcome | null;
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
  /** 仅用于实时展示的下注汇总（真实数据以 DB Bet 为准） */
  bets: Map<string, { playerId: string; side: string; amount: number }>;
  history: Array<{ roundNo: string; outcome: DragonTigerOutcome; createdAt: string }>;
  timer: ReturnType<typeof setInterval> | null;
}

@Injectable()
export class TableService implements OnModuleInit, OnModuleDestroy {
  private rooms = new Map<string, RoomState>();
  private broadcastFn: ((gameCode: string, snap: TableSnapshot) => void) | null = null;

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private commission: CommissionService,
  ) {}

  /** 启动恢复：上次进程退出时未结算的桌局，全部退款作废 */
  async onModuleInit() {
    const orphanRounds = await this.prisma.gameRound.findMany({
      where: { category: 'TABLE', state: 'PLAYING' },
      select: { id: true, roundNo: true },
    });
    for (const round of orphanRounds) {
      await this.refundRound(round.id, '服务重启，桌局作废退款');
      console.warn(`[TableService] 恢复退款桌局 ${round.roundNo}`);
    }
  }

  /** 将某局的所有 PENDING 投注退款并作废 */
  private async refundRound(roundId: string, reason: string) {
    const pendingBets = await this.prisma.bet.findMany({
      where: { roundId, status: 'PENDING' },
    });
    if (pendingBets.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const bet of pendingBets) {
          await this.points.creditInTx(tx, 'PLAYER', bet.playerId, bet.amount, 'ADJUST', {
            refType: 'round', refId: roundId, remark: reason,
            idempotencyKey: `table_refund_player_${bet.id}`,
          });
          await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -bet.amount, 'ADJUST', {
            refType: 'round', refId: roundId, remark: reason,
            idempotencyKey: `table_refund_plat_${bet.id}`,
          });
          await tx.bet.update({
            where: { id: bet.id },
            data: { status: 'CANCELLED', settledAt: new Date() },
          });
        }
      });
    }
    await this.prisma.gameRound.update({
      where: { id: roundId },
      data: { state: 'CANCELLED', endedAt: new Date() },
    });
  }

  setBroadcast(fn: (gameCode: string, snap: TableSnapshot) => void) {
    this.broadcastFn = fn;
  }

  /**
   * 初始化或获取房间。
   * gameCode 必须对应 DB 中 ONLINE 的 TABLE 游戏，否则拒绝（防恶意刷房间）。
   */
  async getOrCreateRoom(gameCode: string): Promise<RoomState> {
    const existing = this.rooms.get(gameCode);
    if (existing) return existing;

    const game = await this.prisma.game.findUnique({ where: { code: gameCode } });
    if (!game || game.category !== 'TABLE' || game.status !== 'ONLINE') {
      throw new BadRequestException('桌面游戏不存在或未上线');
    }

    // 并发竞态下可能已被其他请求创建
    if (this.rooms.has(gameCode)) return this.rooms.get(gameCode)!;

    const { seed, hash } = genServerSeed();
    const room: RoomState = {
      gameCode,
      gameId: game.id,
      gameName: game.name,
      minBet: game.minBet,
      maxBet: game.maxBet,
      roundId: null,
      roundNo: this.genRoundNo(gameCode),
      phase: 'BETTING',
      secondsLeft: BETTING_SECS,
      outcome: null,
      serverSeed: seed,
      serverSeedHash: hash,
      nonce: 1,
      bets: new Map(),
      history: [],
      timer: null,
    };
    this.rooms.set(gameCode, room);
    this.tick(room);
    return room;
  }

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
      // 兜底：结算瞬间挤进来的投注（极小概率竞态）退款，不让钱凭空消失
      if (room.roundId) {
        const stragglers = await this.prisma.bet.count({
          where: { roundId: room.roundId, status: 'PENDING' },
        });
        if (stragglers > 0) {
          await this.refundRoundBetsOnly(room.roundId, '投注晚于封盘，退款');
        }
      }
      // 开新局
      room.phase = 'BETTING';
      room.secondsLeft = BETTING_SECS;
      const { seed, hash } = genServerSeed();
      room.serverSeed = seed;
      room.serverSeedHash = hash;
      room.nonce += 1;
      room.roundNo = this.genRoundNo(room.gameCode);
      room.roundId = null;
      room.outcome = null;
      room.bets.clear();
    }
  }

  /** 仅退 PENDING 投注，不改 GameRound 状态（已 SETTLED 的局） */
  private async refundRoundBetsOnly(roundId: string, reason: string) {
    const pendingBets = await this.prisma.bet.findMany({
      where: { roundId, status: 'PENDING' },
    });
    await this.prisma.$transaction(async (tx) => {
      for (const bet of pendingBets) {
        await this.points.creditInTx(tx, 'PLAYER', bet.playerId, bet.amount, 'ADJUST', {
          refType: 'round', refId: roundId, remark: reason,
          idempotencyKey: `table_refund_player_${bet.id}`,
        });
        await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -bet.amount, 'ADJUST', {
          refType: 'round', refId: roundId, remark: reason,
          idempotencyKey: `table_refund_plat_${bet.id}`,
        });
        await tx.bet.update({
          where: { id: bet.id },
          data: { status: 'CANCELLED', settledAt: new Date() },
        });
      }
    });
  }

  private async settle(room: RoomState) {
    const outcome = room.outcome;
    if (!outcome || !room.roundId) return;
    const roundId = room.roundId;

    try {
      // 以 DB 为准读取本局所有待结算投注
      const bets = await this.prisma.bet.findMany({
        where: { roundId, status: 'PENDING' },
      });
      const totalFlow = bets.reduce((s, b) => s + b.amount, 0);

      await this.prisma.$transaction(async (tx) => {
        for (const bet of bets) {
          const payout = calcPayout(bet.betType ?? '', outcome, bet.amount);
          const won = bet.betType === outcome.winner;

          if (payout > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -payout, 'WIN', {
              refType: 'round', refId: roundId,
              remark: `${room.gameName} ${outcome.winner} 派彩`,
              idempotencyKey: `table_win_plat_${bet.id}`,
            });
            await this.points.creditInTx(tx, 'PLAYER', bet.playerId, payout, 'WIN', {
              refType: 'round', refId: roundId,
              remark: `${room.gameName} ${outcome.winner}`,
              idempotencyKey: `table_win_player_${bet.id}`,
            });
          }

          // 回水
          const rebateAmt = Math.floor(bet.amount * REBATE_RATE);
          if (rebateAmt > 0) {
            await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, -rebateAmt, 'REBATE', {
              refType: 'round', refId: roundId,
              idempotencyKey: `table_rebate_plat_${bet.id}`,
            });
            const rebateLedger = await this.points.creditInTx(tx, 'PLAYER', bet.playerId, rebateAmt, 'REBATE', {
              refType: 'round', refId: roundId, remark: '回水',
              idempotencyKey: `table_rebate_player_${bet.id}`,
            });
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

          // 佣金（幂等作用域用 bet.id，全局唯一）
          const player = await tx.user.findUnique({
            where: { id: bet.playerId },
            select: { id: true, agentPath: true },
          });
          if (player?.agentPath) {
            await this.commission.distributeInTx(
              tx, player, bet.amount, roundId, `table_${bet.id}`,
            );
          }

          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: won ? 'WON' : 'LOST',
              payout,
              odds: bet.amount > 0 ? payout / bet.amount : 0,
              validFlow: bet.amount,
              settledAt: new Date(),
            },
          });
        }

        // 公布种子，关局
        await tx.gameRound.update({
          where: { id: roundId },
          data: {
            state: 'SETTLED',
            endedAt: new Date(),
            totalFlow,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            outcome: outcome as any,
            serverSeed: room.serverSeed,
          },
        });
      });

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

  /** 玩家下注：建局（懒）+ 写 Bet + 扣款，全部在一个事务内 */
  async placeBet(playerId: string, payload: TableBetPayload) {
    const { roomId, side, amount } = payload;
    const room = this.rooms.get(roomId);
    if (!room) throw new BadRequestException('房间不存在');
    if (room.phase !== 'BETTING') throw new BadRequestException('当前不在下注阶段');
    if (!Number.isInteger(amount) || amount < room.minBet || amount > room.maxBet) {
      throw new BadRequestException(`下注额须在 ${room.minBet}~${room.maxBet} 之间`);
    }
    if (!['DRAGON', 'TIGER', 'TIE'].includes(side)) {
      throw new BadRequestException('投注方向无效');
    }

    await this.prisma.$transaction(async (tx) => {
      // 懒创建本局 GameRound（公布 serverSeedHash，开奖后公布 serverSeed）
      if (!room.roundId) {
        const round = await tx.gameRound.create({
          data: {
            roundNo: room.roundNo,
            gameId: room.gameId,
            category: 'TABLE',
            state: 'PLAYING',
            serverSeedHash: room.serverSeedHash,
            nonce: room.nonce,
          },
        });
        room.roundId = round.id;
      }

      const bet = await tx.bet.create({
        data: {
          betNo: `TB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          playerId,
          gameId: room.gameId,
          roundId: room.roundId,
          betType: side,
          amount,
          status: 'PENDING',
        },
      });

      await this.points.creditInTx(tx, 'PLAYER', playerId, -amount, 'BET', {
        refType: 'round', refId: room.roundId,
        remark: `${room.gameName}下注 ${side}`,
        idempotencyKey: `table_bet_player_${bet.id}`,
      });
      await this.points.creditInTx(tx, 'PLATFORM', PLATFORM_OWNER_ID, amount, 'BET', {
        refType: 'round', refId: room.roundId,
        remark: `${room.gameName} 注资 ${room.roundNo}`,
        idempotencyKey: `table_bet_plat_${bet.id}`,
      });
    });

    // 实时展示用内存汇总
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

  async snapshot(gameCode: string): Promise<TableSnapshot> {
    const room = await this.getOrCreateRoom(gameCode);
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

  private genRoundNo(gameCode: string): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `T_${gameCode}_${stamp}`;
  }

  onModuleDestroy() {
    for (const room of this.rooms.values()) {
      if (room.timer) clearInterval(room.timer);
    }
  }
}
