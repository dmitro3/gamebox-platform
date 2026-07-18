export type MahjongPaySymbolId =
  | 'fa'
  | 'zhong'
  | 'bai'
  | '8w'
  | '5t'
  | '5s'
  | '2t'
  | '2s';

export type MahjongSymbolId = MahjongPaySymbolId | 'wild' | 'hu';

export interface MahjongTileDTO {
  symbol: MahjongSymbolId;
  isGolden: boolean;
}

export interface MahjongGridPosDTO {
  col: number;
  row: number;
}

export interface MahjongRefillColumnDTO {
  col: number;
  tiles: MahjongTileDTO[];
}

export interface MahjongCascadeStepDTO {
  cascadeIndex: number;
  multiplier: number;
  winCells: MahjongGridPosDTO[];
  goldenToWild: MahjongGridPosDTO[];
  removeCells: MahjongGridPosDTO[];
  refillColumns: MahjongRefillColumnDTO[];
  gridAfter: MahjongTileDTO[][];
  stepWin: number;
}

export interface MahjongFreeSpinDTO {
  sessionId: string;
  triggered: boolean;
  retriggered: boolean;
  spinsAwarded: number;
  spinsRemaining: number;
  sessionTotalWin: number;
  lockedBetAmount: number;
}

export interface MahjongSpinRequestDTO {
  amount: number;
  clientSeed?: string;
  clientRequestId: string;
  sessionId?: string;
}

export interface MahjongSpinResultDTO {
  roundId: string;
  betId: string;
  balance: number;
  spinType: 'BASE' | 'FREE';
  initialGrid: MahjongTileDTO[][];
  cascades: MahjongCascadeStepDTO[];
  totalWin: number;
  serverSeed: string;
  serverSeedHash: string;
  freeSpin?: MahjongFreeSpinDTO;
}

export const MAHJONG_PAY_SYMBOLS: readonly MahjongPaySymbolId[] = [
  'fa',
  'zhong',
  'bai',
  '8w',
  '5t',
  '5s',
  '2t',
  '2s',
];

export const MAHJONG_PAYTABLE: Record<MahjongPaySymbolId, readonly [number, number, number]> = {
  fa: [15, 60, 100],
  zhong: [10, 40, 80],
  bai: [8, 20, 60],
  '8w': [6, 15, 40],
  '5t': [4, 10, 20],
  '5s': [4, 10, 20],
  '2t': [2, 5, 10],
  '2s': [2, 5, 10],
};

export const MAHJONG_CASCADE_MULTIPLIERS = [1, 2, 3, 5] as const;
export const MAHJONG_FREE_SPIN_MULTIPLIERS = [2, 4, 6, 10] as const;
export const MAHJONG_BASE_BET = 20;

export function mahjongFreeSpinsFromScatters(scatterCount: number): number {
  return scatterCount < 3 ? 0 : 12 + (scatterCount - 3) * 2;
}
