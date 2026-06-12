import http from './http'

export interface LotteryIssue {
  id: string
  issueNo: string
  status: string
  openAt: string
  lockAt: string
  serverSeedHash: string
}

export interface DrawHistory {
  issueNo: string
  drawNumbers: string     // JSON 字符串 "[1,2,3,4,5]"
  drawnAt: string
  openAt: string
  serverSeed: string
  serverSeedHash: string
  totalFlow: number
}

export interface LotteryBet {
  id: string
  betType: string
  amount: number
  payout: number
  status: string
  createdAt: string
  issue: { issueNo: string; drawNumbers: string | null; openAt: string } | null
}

export const lotteryApi = {
  currentIssue: (gameCode: string) =>
    http.get<LotteryIssue | null, LotteryIssue | null>(`/lottery/${gameCode}/current`),

  history: (gameCode: string, limit = 10) =>
    http.get<DrawHistory[], DrawHistory[]>(`/lottery/${gameCode}/history?limit=${limit}`),

  myBets: (gameCode: string, page = 1, pageSize = 20) =>
    http.get<{ total: number; list: LotteryBet[] }, { total: number; list: LotteryBet[] }>(
      `/lottery/${gameCode}/my-bets?page=${page}&pageSize=${pageSize}`
    ),

  bet: (gameCode: string, data: { betType: string; betValue?: string; amount: number }) =>
    http.post<{ betId: string; issueNo: string; openAt: string }, { betId: string; issueNo: string; openAt: string }>(
      `/lottery/${gameCode}/bet`, data
    ),
}
