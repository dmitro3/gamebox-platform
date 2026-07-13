import http from './http'

export interface GameItem {
  id: string
  code: string
  name: string
  category: string
  status: string
  coverUrl: string | null
  sortOrder: number
  minBet: number
  maxBet: number
  configs: Array<{ version: number; rtp: number; payTable: unknown }>
}

export interface SpinResult {
  gameCode: string
  category: string
  refType: string
  refId: string
  totalFlow: number
  outcome: { prize: { label: string; multiplier: number }; index: number }
  bets: Array<{ betId: string; amount: number; payout: number; multiplier: number; won: boolean }>
  balance: number
}

export interface FruitSpinResult {
  gameCode: string
  roundId: string
  awardType: string
  stopIndex: number
  hitIndexes: number[]
  wins: Array<{ symbol: string; mult: number; amount: number; cellIndex: number }>
  bets: Array<{ position: string; amount: number; payout: number; won: boolean }>
  totalBet: number
  totalWin: number
  totalPayout: number
  balance: number
}

export interface FruitGambleResult {
  roll: number
  choice: 'big' | 'small'
  result: 'win' | 'lose' | 'push'
  amount: number
  payout: number
  balance: number
}

export const gamesApi = {
  list: () => http.get<GameItem[], GameItem[]>('/games'),

  spin: (gameCode: string, amount: number, clientSeed?: string) =>
    http.post<SpinResult, SpinResult>('/bet/spin', { gameCode, amount, clientSeed }),

  fruitSpin: (bets: Record<string, number>, clientSeed?: string) =>
    http.post<FruitSpinResult, FruitSpinResult>('/bet/fruit', {
      gameCode: 'fruit-machine',
      bets,
      clientSeed,
    }),

  fruitGamble: (amount: number, choice: 'big' | 'small') =>
    http.post<FruitGambleResult, FruitGambleResult>('/bet/fruit/gamble', { amount, choice }),

  betHistory: () =>
    http.get<any[], any[]>('/bet/history'),
}
