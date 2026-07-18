import http from './http'
import type { LedgerItemDTO } from '@gamebox/shared'

export type LedgerItem = LedgerItemDTO

export const walletApi = {
  balance: () => http.get<{ balance: number }, { balance: number }>('/wallet/balance'),

  ledger: (page = 1, pageSize = 20) =>
    http.get<{ total: number; list: LedgerItem[] }, { total: number; list: LedgerItem[] }>(
      '/wallet/ledger',
      { params: { page, pageSize } },
    ),
}
