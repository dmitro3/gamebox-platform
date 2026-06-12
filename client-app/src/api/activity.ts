import http from './http'

export interface ActivityItem {
  id: string
  code: string
  type: string
  title: string
  bannerUrl?: string
  config: {
    reward?: number
    expiresHours?: number
    tiers?: Array<{ minDeposit: number; reward: number }>
  }
  claim: {
    id: string
    status: string
    rewardPoints: number
    claimedAt: string
  } | null
}

export interface ClaimResult {
  claim: { id: string; status: string; rewardPoints: number }
  reward: number
}

export const activityApi = {
  list: () => http.get<ActivityItem[], ActivityItem[]>('/activities'),
  claim: (id: string) => http.post<ClaimResult, ClaimResult>(`/activities/${id}/claim`),
}
