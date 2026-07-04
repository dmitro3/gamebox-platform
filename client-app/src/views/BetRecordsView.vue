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
      <div class="title">{{ pageTitle }}</div>
      <div class="right"></div>
    </div>

    <div class="page-body">
      <h1 class="br-title">竞 猜 记 录</h1>

      <div class="time-tabs">
        <button
          v-for="t in RANGES"
          :key="t.key"
          :class="['tt-item', range === t.key ? 'active' : '']"
          @click="onRangeChange(t.key)"
        >{{ t.label }}</button>
      </div>

      <div class="br-list">
        <div v-if="loading" class="br-empty">
          <div class="br-empty-icon">◇</div>
          <div class="br-empty-text">加 载 中 …</div>
        </div>
        <template v-else-if="hasSscGroups">
          <div
            v-for="g in sscGroupsInRange"
            :key="g.issue"
            class="br-fold"
            :class="{ 'is-open': expandedIssue === g.issue }"
          >
            <button
              type="button"
              class="br-fold__head"
              :aria-expanded="expandedIssue === g.issue"
              @click="toggleExpand(g.issue)"
            >
              <span class="ssc-bet-record-issue">{{ g.issue }}</span>
              <span class="br-fold__meta">{{ g.bets.length }} 注 · {{ fmt(g.totalAmount) }}</span>
              <span :class="['br-fold__result', g.settled ? (g.totalProfit >= 0 ? 'pos' : 'neg') : 'wait']">
                {{ g.settled ? fmtProfit(g.totalProfit) : '待开奖' }}
              </span>
              <span class="br-fold__arrow" aria-hidden="true">▼</span>
            </button>

            <div v-show="expandedIssue === g.issue" class="br-fold__body">
              <ul class="br-detail">
                <li v-for="(b, idx) in g.bets" :key="idx" class="br-detail-row">
                  <span class="br-detail-play">{{ b.play }}/{{ b.amount }}</span>
                  <span class="br-detail-mid">{{ betDetailMid(b, g.settled) }}</span>
                  <span :class="['br-detail-profit', detailProfitClass(b, g.settled)]">
                    {{ detailProfitText(b, g.settled) }}
                  </span>
                </li>
              </ul>
              <div v-if="g.settled && g.drawSummary" class="br-draw-line">
                开奖 {{ g.drawSummary }}
              </div>
            </div>
          </div>
        </template>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '@/api/http'
import { useBodyClass } from '@/composables/useBodyClass'
import TabBar from '@/components/TabBar.vue'
import '@/assets/bet-records.css'

useBodyClass('deco-bg')

const route = useRoute()
const router = useRouter()

interface BetRecord {
  id: string
  amount: number
  payout: number
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED'
  createdAt: string
}

interface SscBetItem {
  play: string
  amount: number
  status: string
  profit: number
  winAmount: number
  hit: string
}

interface SscBetGroup {
  game: string
  issue: string
  createdAt: string
  settledAt?: string
  settled: boolean
  drawSummary?: string
  bets: SscBetItem[]
  totalAmount: number
  totalProfit: number
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
const sscLog = ref<SscBetGroup[]>([])
const expandedIssue = ref<string | null>(null)
let sscPollTimer: ReturnType<typeof setInterval> | null = null

function sscBetLogStorageKey() {
  try {
    const raw = localStorage.getItem('gamebox_user')
    if (!raw) return null
    const u = JSON.parse(raw)
    return u?.uid ? 'ssc_bet_log_' + u.uid : null
  } catch {
    return null
  }
}

function onSscLogStorage(e: StorageEvent) {
  const key = sscBetLogStorageKey()
  if (key && e.key && e.key !== key) return
  loadSscBetLog()
}

function onSscLogVisible() {
  if (document.visibilityState === 'visible') loadSscBetLog()
}

function startSscPollIfNeeded() {
  if (sscPollTimer) return
  sscPollTimer = setInterval(() => {
    if (route.query.game !== 'ssc') return
    if (sscLog.value.some(g => !g.settled)) loadSscBetLog()
  }, 1200)
}

function stopSscPoll() {
  if (!sscPollTimer) return
  clearInterval(sscPollTimer)
  sscPollTimer = null
}

const pageTitle = computed(() => (route.query.game === 'ssc' ? '快乐时时彩注单' : '竞猜记录'))

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

function groupInRange(g: SscBetGroup, from: number, to: number) {
  const t = new Date(g.settledAt || g.createdAt).getTime()
  return t >= from && t < to
}

const sscGroupsInRange = computed(() => {
  const [from, to] = rangeBounds(range.value)
  return sscLog.value.filter(g => groupInRange(g, from, to))
})

const hasSscGroups = computed(() => sscGroupsInRange.value.length > 0)

const summary = computed(() => {
  if (hasSscGroups.value) return null
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
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtProfit(n: number) {
  return (n >= 0 ? '+' : '') + fmt(n)
}

function toggleExpand(issue: string) {
  expandedIssue.value = expandedIssue.value === issue ? null : issue
}

function onRangeChange(key: RangeKey) {
  range.value = key
  expandedIssue.value = null
}

function betDetailMid(b: SscBetItem, settled: boolean) {
  if (!settled) return '待开'
  if (b.status === 'WON') return b.hit || '中奖'
  return '未中'
}

function detailProfitText(b: SscBetItem, settled: boolean) {
  if (!settled) return '—'
  return fmtProfit(b.profit)
}

function detailProfitClass(b: SscBetItem, settled: boolean) {
  if (!settled) return ''
  return b.profit >= 0 ? 'pos' : 'neg'
}

function loadSscBetLog() {
  try {
    const raw = localStorage.getItem('gamebox_user')
    if (!raw) return
    const u = JSON.parse(raw)
    if (!u?.uid) return
    const logRaw = localStorage.getItem('ssc_bet_log_' + u.uid)
    sscLog.value = logRaw ? JSON.parse(logRaw) : []
  } catch {
    sscLog.value = []
  }
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/lobby')
}

onMounted(async () => {
  loadSscBetLog()
  startSscPollIfNeeded()
  window.addEventListener('storage', onSscLogStorage)
  window.addEventListener('ssc-bet-log-updated', loadSscBetLog)
  document.addEventListener('visibilitychange', onSscLogVisible)
  try {
    records.value = await http.get<BetRecord[], BetRecord[]>('/bet/history')
  } catch { /* 静默 */ } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  stopSscPoll()
  window.removeEventListener('storage', onSscLogStorage)
  window.removeEventListener('ssc-bet-log-updated', loadSscBetLog)
  document.removeEventListener('visibilitychange', onSscLogVisible)
})
</script>

<style scoped>
/* 快乐时时彩注单 · 期号（独立样式，不共用 br-fold__issue） */
.ssc-bet-record-issue {
  font-size: 12px;
  font-weight: 600;
  font-family: ui-monospace, Consolas, monospace;
  color: #f4d36b;
  letter-spacing: -0.3px;
  white-space: nowrap;
}
</style>
