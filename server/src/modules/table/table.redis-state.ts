import type { DragonTigerOutcome, TablePhase } from './table.types';

/** Redis 持久化的房间相位（权威调度态，非资金真相） */
export interface RedisRoomState {
  gameCode: string;
  gameId: string;
  gameName: string;
  minBet: number;
  maxBet: number;
  roundId: string | null;
  roundNo: string;
  phase: TablePhase;
  /** 当前相位绝对截止时间（epoch ms） */
  phaseEndsAt: number;
  outcome: DragonTigerOutcome | null;
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
  /** side → totalAmount，仅展示用 */
  betSummary: Record<string, number>;
  history: Array<{ roundNo: string; outcome: DragonTigerOutcome; createdAt: string }>;
}

export const TABLE_BROADCAST_CHANNEL = 'table:broadcast';

export function roomKey(gameCode: string): string {
  return `table:room:${gameCode}`;
}

export function roomLeaderKey(gameCode: string): string {
  return `table:room:${gameCode}:leader`;
}

export function secondsLeftOf(state: RedisRoomState, now = Date.now()): number {
  return Math.max(0, Math.ceil((state.phaseEndsAt - now) / 1000));
}
