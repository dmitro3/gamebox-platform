import http from './http'

export interface LedgerItem {
  id: string
  bizType: string
  amount: number
  balanceAfter: number
  remark: string | null
  createdAt: string
}

export const walletApi = {
  balance: () => http.get<{ balance: number }, { balance: number }>('/wallet/balance'),

  ledger: (page = 1, pageSize = 20) =>
    http.get<{ total: number; list: LedgerItem[] }, { total: number; list: LedgerItem[] }>(
      '/wallet/ledger',
      { params: { page, pageSize } },
    ),
}
