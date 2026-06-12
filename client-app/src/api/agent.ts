import http from './http'

export interface AgentOverview {
  promoCode: string
  directCount: number
  teamCount: number
  totalCommission: number
  todayCommission: number
}

export interface TeamMember {
  uid: string
  nickname: string
  createdAt: string
  lastLoginAt: string | null
  totalFlow: number
  myCommission: number
}

export interface CommissionItem {
  id: string
  level: number
  baseFlow: number
  rate: number
  amount: number
  settledAt: string
  sourceUser: { uid: string; nickname: string }
}

interface Paged<T> { list: T[]; total: number; page: number }

export const agentApi = {
  overview: () => http.get<AgentOverview, AgentOverview>('/agent/overview'),
  team: (page = 1) => http.get<Paged<TeamMember>, Paged<TeamMember>>('/agent/team', { params: { page } }),
  commissions: (page = 1) =>
    http.get<Paged<CommissionItem>, Paged<CommissionItem>>('/agent/commissions', { params: { page } }),
  transfer: (targetUid: string, amount: number) =>
    http.post('/agent/transfer', { targetUid, amount }),
}
