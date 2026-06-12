/** 棋牌实时桌面共用类型 */

/** 龙虎斗牌面 */
export interface Card {
  suit: 'S' | 'H' | 'D' | 'C'; // 黑桃 / 红心 / 方块 / 梅花
  rank: number;                  // 1(A)~13(K)
}

/** 龙虎斗结果 */
export interface DragonTigerOutcome {
  dragon: Card;
  tiger: Card;
  winner: 'DRAGON' | 'TIGER' | 'TIE'; // TIE=和
}

/** 桌面状态 */
export type TablePhase = 'BETTING' | 'DRAWING' | 'SETTLED' | 'PAUSED';

/** 前端收到的桌面快照 */
export interface TableSnapshot {
  roomId: string;
  gameCode: string;
  phase: TablePhase;
  roundNo: string;
  /** 本局剩余秒数（下注倒计时） */
  secondsLeft: number;
  /** 本局结果（仅 DRAWING/SETTLED 阶段非空） */
  outcome?: DragonTigerOutcome;
  /** 本局各位置下注汇总 */
  betSummary: Record<string, number>; // side → totalAmount
  /** 最近 10 局历史 */
  history: Array<{ roundNo: string; outcome: DragonTigerOutcome; createdAt: string }>;
}

/** 玩家下注 payload */
export interface TableBetPayload {
  roomId: string;
  side: 'DRAGON' | 'TIGER' | 'TIE';
  amount: number;
}
