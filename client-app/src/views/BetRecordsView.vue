<template>
  <div class="screen-deco" aria-hidden="true">
    <img class="cd cd-tl" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-tr" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-bl" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-br" src="/images/corner-flourish.png" alt="">
  </div>

  <div class="page br-page">
    <div class="app-bar">
      <div class="back" @click="goBack">‹</div>
      <div class="title">竞猜记录</div>
      <div class="right"></div>
    </div>

    <div class="page-body">
      <h1 class="br-title">竞 猜 记 录</h1>

      <div class="time-tabs">
        <button
          v-for="t in RANGES"
          :key="t.key"
          :class="['tt-item', range === t.key ? 'active' : '']"
          @click="range = t.key"
        >{{ t.label }}</button>
      </div>

      <div class="br-list">
        <div v-if="loading" class="br-empty">
          <div class="br-empty-icon">◇</div>
          <div class="br-empty-text">加 载 中 …</div>
        </div>
        <div v-else-if="!summary" class="br-empty">
          <div class="br-empty-icon">◇</div>
          <div class="br-empty-text">该 时 段 暂 无 记 录</div>
        </div>
        <div v-else class="br-card">
          <div class="br-time">{{ summary.start }}  ~  {{ summary.end }}</div>
          <div class="br-kpi">
            <div class="br-kpi-cell">
              <span class="br-kpi-num">{{ summary.orders }}</span>
              <span class="br-kpi-label">总 注 单</span>
            </div>
            <div class="br-kpi-cell">
              <span class="br-kpi-num">{{ fmt(summary.amount) }}</span>
              <span class="br-kpi-label">总 金 额</span>
            </div>
            <div class="br-kpi-cell">
              <span class="br-kpi-num">{{ fmt(summary.rebate) }}</span>
              <span class="br-kpi-label">总 反 点</span>
            </div>
          </div>
          <div class="br-summary">
            <div class="br-summary-cell">
              游戏总结过 <span :class="['br-summary-num', summary.gameSettle >= 0 ? 'pos' : 'neg']">{{ fmt(summary.gameSettle) }}</span>
            </div>
            <div class="br-summary-cell">
              玩家总结过 <span :class="['br-summary-num', summary.playerSettle >= 0 ? 'pos' : 'neg']">{{ fmt(summary.playerSettle) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lobby-spacer"></div>
    </div>
  </div>

  <TabBar />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import { useBodyClass } from '@/composables/useBodyClass'
import TabBar from '@/components/TabBar.vue'
import '@/assets/bet-records.css'

useBodyClass('deco-bg')

const router = useRouter()

interface BetRecord {
  id: string
  amount: number
  payout: number
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED'
  createdAt: string
}

const RANGES = [
  { key: 'today',     label: '今 日' },
  { key: 'yesterday', label: '昨 日' },
  { key: 'thisweek',  label: '本 周' },
  { key: 'lastweek',  label: '上 周' },
  { key: 'thismonth', label: '本 月' },
  { key: 'lastmonth', label: '上 个 月' },
] as const

type RangeKey = typeof RANGES[number]['key']

const range = ref<RangeKey>('today')
const loading = ref(true)
const records = ref<BetRecord[]>([])

function rangeBounds(key: RangeKey): [number, number] {
  const now = new Date()
  const DAY = 86400000
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekday = (now.getDay() + 6) % 7
  const week0 = today0 - weekday * DAY
  const month0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const lastMonth0 = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  switch (key) {
    case 'today':     return [today0, today0 + DAY]
    case 'yesterday': return [today0 - DAY, today0]
    case 'thisweek':  return [week0, week0 + 7 * DAY]
    case 'lastweek':  return [week0 - 7 * DAY, week0]
    case 'thismonth': return [month0, Date.now() + DAY]
    case 'lastmonth': return [lastMonth0, month0]
  }
}

const summary = computed(() => {
  const [from, to] = rangeBounds(range.value)
  const list = records.value.filter(r => {
    const t = new Date(r.createdAt).getTime()
    return t >= from && t < to && r.status !== 'CANCELLED'
  })
  if (!list.length) return null
  const amount = list.reduce((s, r) => s + r.amount, 0)
  const payout = list.reduce((s, r) => s + r.payout, 0)
  const fmtD = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return {
    start: fmtD(from),
    end: fmtD(Math.min(to - 60000, Date.now())),
    orders: list.length,
    amount,
    rebate: 0,
    gameSettle: amount - payout,
    playerSettle: payout - amount,
  }
})

function fmt(n: number) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/settings')
}

onMounted(async () => {
  try {
    records.value = await http.get<BetRecord[], BetRecord[]>('/bet/history')
  } catch { /* 静默 */ } finally {
    loading.value = false
  }
})
</script>
