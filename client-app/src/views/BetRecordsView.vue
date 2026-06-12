<template>
  <div class="page bets-page">
    <div class="bets-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">投注记录</span>
      <span class="spacer"></span>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-row">
      <button v-for="f in FILTERS" :key="f.value"
        class="filter-btn" :class="{ active: filter === f.value }"
        @click="filter = f.value">{{ f.label }}</button>
    </div>

    <div v-if="loading" class="loading-tip">加载中…</div>

    <template v-else>
      <div v-if="filtered.length === 0" class="empty-tip">暂无投注记录</div>

      <div class="bet-list">
        <div v-for="b in filtered" :key="b.id" class="bet-card">
          <div class="bc-row">
            <span class="bc-game">{{ b.game.name }}</span>
            <span class="bc-status" :class="statusClass(b.status)">{{ statusLabel(b.status) }}</span>
          </div>
          <div class="bc-row">
            <span class="bc-detail">
              {{ b.betType === 'SPIN' ? '旋转' : b.betType }}
              · 押 {{ b.amount.toLocaleString() }}
            </span>
            <span class="bc-payout" :class="{ win: b.payout > 0 }">
              {{ b.payout > 0 ? `+${b.payout.toLocaleString()}` : '—' }}
            </span>
          </div>
          <div class="bc-time">{{ fmtTime(b.createdAt) }}</div>
        </div>
      </div>
    </template>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()

interface BetRecord {
  id: string
  betNo: string
  amount: number
  payout: number
  status: 'PENDING' | 'WON' | 'LOST' | 'CANCELLED'
  betType: string | null
  settledAt: string | null
  createdAt: string
  game: { name: string; code: string }
}

const FILTERS = [
  { value: 'ALL',  label: '全部' },
  { value: 'WON',  label: '已中奖' },
  { value: 'LOST', label: '未中奖' },
  { value: 'PENDING', label: '待开奖' },
] as const

const loading = ref(true)
const records = ref<BetRecord[]>([])
const filter  = ref<string>('ALL')

const filtered = computed(() =>
  filter.value === 'ALL'
    ? records.value
    : records.value.filter(b => b.status === filter.value))

function statusLabel(s: string) {
  return { PENDING: '待开奖', WON: '已中奖', LOST: '未中奖', CANCELLED: '已退款' }[s] ?? s
}
function statusClass(s: string) {
  return { PENDING: 'pending', WON: 'won', LOST: 'lost', CANCELLED: 'cancelled' }[s] ?? ''
}
function fmtTime(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

onMounted(async () => {
  try {
    records.value = await http.get<BetRecord[], BetRecord[]>('/bet/history')
  } catch { /* 静默 */ } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.bets-page { min-height: 100vh; background: #0a0a12; color: #fff; padding-bottom: 60px; }

.bets-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(14,14,26,0.96);
  border-bottom: 1px solid rgba(232,192,50,0.15);
}
.back-btn { background: none; border: none; color: #e8c032; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; }
.spacer { width: 28px; }

.filter-row { display: flex; gap: 8px; padding: 12px 16px; }
.filter-btn {
  flex: 1; padding: 8px 4px; border-radius: 18px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5); font-size: 13px; transition: all 0.15s;
}
.filter-btn.active {
  border-color: rgba(232,192,50,0.5); background: rgba(232,192,50,0.12);
  color: #e8c032; font-weight: 600;
}

.loading-tip, .empty-tip {
  text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.3); font-size: 13px;
}

.bet-list { padding: 0 16px; display: flex; flex-direction: column; gap: 8px; }
.bet-card {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(25,25,45,0.55); border: 1px solid rgba(255,255,255,0.06);
}
.bc-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.bc-game { font-size: 15px; font-weight: 600; }
.bc-status { font-size: 12px; padding: 2px 10px; border-radius: 12px; }
.bc-status.won       { background: rgba(46,204,113,0.15); color: #2ecc71; }
.bc-status.lost      { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); }
.bc-status.pending   { background: rgba(255,200,50,0.15); color: #ffd700; }
.bc-status.cancelled { background: rgba(255,100,100,0.12); color: #ff8f8f; }
.bc-detail { font-size: 13px; color: rgba(255,255,255,0.55); }
.bc-payout { font-size: 15px; color: rgba(255,255,255,0.35); }
.bc-payout.win { color: #2ecc71; font-weight: 700; }
.bc-time { font-size: 11px; color: rgba(255,255,255,0.28); }

.page-bottom-spacer { height: 80px; }
</style>
