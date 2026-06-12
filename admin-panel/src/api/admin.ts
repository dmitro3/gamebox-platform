import http from './http'

// ─── Dashboard ───────────────────────────────────────────────
export const dashboardApi = {
  stats: () => http.get<DashboardStats, DashboardStats>('/admin/dashboard/stats'),
  trend: (days = 7) => http.get<TrendPoint[], TrendPoint[]>(`/admin/dashboard/trend?days=${days}`),
}

export interface DashboardStats {
  totalPlayers: number
  todayNew: number
  activeToday: number
  platformBalance: number
  todayBetFlow: number
  todayPnl: number
  pendingRecharge: number
  pendingWithdraw: number
}
export interface TrendPoint { date: string; betFlow: number; pnl: number; newUsers: number }

// ─── Recharge / Withdraw review ──────────────────────────────
export const reviewApi = {
  list: (params?: { status?: string; type?: string; page?: number; pageSize?: number }) =>
    http.get<ReviewPage, ReviewPage>('/admin/recharge', { params }),
  approve: (id: string) => http.patch<{ ok: boolean }, { ok: boolean }>(`/recharge/${id}/approve`),
  reject: (id: string, reason: string) =>
    http.patch<{ ok: boolean }, { ok: boolean }>(`/recharge/${id}/reject`, { reason }),
}
export interface ReviewOrder {
  id: string; orderNo: string; type: string; amount: number; status: string
  channel: string; rejectReason: string | null; createdAt: string; reviewedAt: string | null
  player: { uid: string; nickname: string }
}
export interface ReviewPage { total: number; page: number; pageSize: number; list: ReviewOrder[] }

// ─── Games management ────────────────────────────────────────
export const gameAdminApi = {
  list: () => http.get<GameAdmin[], GameAdmin[]>('/admin/games'),
  setStatus: (code: string, status: string) =>
    http.patch<{ ok: boolean }, { ok: boolean }>(`/admin/games/${code}/status`, { status }),
  createConfig: (code: string, data: { rtp: number; payTable: unknown }) =>
    http.post<{ ok: boolean }, { ok: boolean }>(`/admin/games/${code}/config`, data),
  listConfigs: (code: string) =>
    http.get<GameConfigAdmin[], GameConfigAdmin[]>(`/admin/games/${code}/configs`),
  activateConfig: (code: string, version: number) =>
    http.patch<{ ok: boolean }, { ok: boolean }>(`/admin/games/${code}/config/${version}/activate`),
}
export interface GameAdmin {
  id: string; code: string; name: string; category: string
  status: string; minBet: number; maxBet: number
  configs: { version: number; rtp: number; active: boolean }[]
}
export interface GameConfigAdmin {
  id: string; version: number; rtp: number; active: boolean
  payTable: unknown; params: unknown; createdAt: string
}

// ─── Agents management ───────────────────────────────────────
export const agentApi = {
  tree: () => http.get<AgentNode[], AgentNode[]>('/admin/agents/tree'),
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get<AgentPage, AgentPage>('/admin/agents', { params }),
  setLevel: (userId: string, levelCode: string) =>
    http.patch<{ ok: boolean }, { ok: boolean }>(`/admin/agents/${userId}/level`, { levelCode }),
  issue: (userId: string, amount: number) =>
    http.post<{ ok: boolean }, { ok: boolean }>(`/admin/agents/${userId}/issue`, { amount }),
}
export interface AgentNode {
  id: string; uid: string; nickname: string; role: string; depth: number
  balance: number; children?: AgentNode[]
}
export interface AgentPage { total: number; page: number; pageSize: number; list: AgentNode[] }

// ─── Risk events ─────────────────────────────────────────────
export const riskApi = {
  list: (params?: { handled?: boolean; level?: string; page?: number; pageSize?: number }) =>
    http.get<RiskPage, RiskPage>('/admin/risk', { params }),
  handle: (id: string) => http.patch<{ ok: boolean }, { ok: boolean }>(`/admin/risk/${id}/handle`),
}
export interface RiskEvent {
  id: string; type: string; level: string; targetId: string | null
  detail: unknown; handled: boolean; createdAt: string
}
export interface RiskPage { total: number; page: number; pageSize: number; list: RiskEvent[] }

// ─── Admin log ───────────────────────────────────────────────
export const adminLogApi = {
  list: (params?: { page?: number; pageSize?: number }) =>
    http.get<LogPage, LogPage>('/admin/logs', { params }),
}
export interface AdminLogItem {
  id: string; action: string; target: string | null
  detail: unknown; ip: string | null; createdAt: string
  operator: { uid: string; nickname: string }
}
export interface LogPage { total: number; page: number; pageSize: number; list: AdminLogItem[] }
