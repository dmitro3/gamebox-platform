<template>
  <div class="page bcbm-page">
    <div class="bcbm-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">{{ gameName || '奔驰宝马' }}</span>
      <span class="balance">{{ walletStore.balance.toLocaleString() }} 分</span>
    </div>

    <!-- 仓位区（含空门展示） -->
    <div class="position-grid">
      <div v-for="p in positions" :key="p.label"
        class="pos-card"
        :class="{
          lit: litLabel === p.label,
          winner: !spinning && lastWinner === p.label,
          empty: p.multiplier === 0,
        }"
        @click="p.multiplier > 0 && addChip(p.label)">
        <div class="pc-name">{{ p.label }}</div>
        <div class="pc-mult" v-if="p.multiplier > 0">×{{ p.multiplier }}</div>
        <div class="pc-mult zero" v-else>全输</div>
        <div class="pc-chip" v-if="myBets[p.label]">{{ myBets[p.label] }}</div>
      </div>
    </div>

    <!-- 结果横幅 -->
    <div class="result-bar">
      <template v-if="lastResult">
        <span class="rb-winner">开出 {{ lastResult.winner }}</span>
        <span class="rb-payout" :class="{ win: lastResult.totalPayout > 0 }">
          {{ lastResult.totalPayout > 0 ? `派彩 +${lastResult.totalPayout.toLocaleString()}` : '未中奖' }}
        </span>
      </template>
      <span v-else class="rb-idle">点击品牌下注，押中按倍率赔付</span>
    </div>

    <!-- 筹码选择 -->
    <div class="chip-row">
      <button v-for="c in chips" :key="c"
        class="chip-btn" :class="{ active: chipValue === c }"
        @click="chipValue = c">{{ c }}</button>
      <button class="chip-btn clear" @click="clearBets">清空</button>
    </div>

    <div class="total-row">
      <span>本局合计：<b>{{ totalBet.toLocaleString() }}</b> 分</span>
    </div>

    <button class="spin-btn" :disabled="spinning || totalBet === 0" @click="doSpin">
      {{ spinning ? '开奖中…' : '开 始' }}
    </button>

    <!-- 历史 -->
    <div class="history-section">
      <div class="section-title">近期开出</div>
      <div class="history-dots">
        <span v-for="(h, i) in history" :key="i"
          class="hd" :class="brandClass(h)">{{ h }}</span>
      </div>
    </div>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'
import { gamesApi } from '@/api/games'
import http from '@/api/http'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()
const { error: toastErr } = useToast()

const gameCode = computed(() => (route.params.gameCode as string) || 'bcbm')

interface PayItem { label: string; multiplier: number }
interface SpinResult {
  winner: string; totalPayout: number; totalBet: number
  bets: Array<{ position: string; amount: number; payout: number; won: boolean }>
  balance: number
}

const gameName  = ref('')
const positions = ref<PayItem[]>([])
const myBets    = ref<Record<string, number>>({})
const chipValue = ref(10)
const chips     = [10, 50, 100, 500, 1000]
const spinning  = ref(false)
const litLabel  = ref('')
const lastWinner = ref('')
const lastResult = ref<SpinResult | null>(null)
const history    = ref<string[]>([])

let lightTimer: ReturnType<typeof setInterval> | null = null

const totalBet = computed(() =>
  Object.values(myBets.value).reduce((s, v) => s + v, 0))

function addChip(label: string) {
  if (spinning.value) return
  myBets.value[label] = (myBets.value[label] ?? 0) + chipValue.value
}
function clearBets() {
  if (spinning.value) return
  myBets.value = {}
}
function brandClass(label: string) {
  return { '大众': 'vw', '奥迪': 'audi', '奔驰': 'benz', '宝马': 'bmw', '空门': 'none' }[label] ?? ''
}

async function loadGame() {
  try {
    const games = await gamesApi.list()
    const g = games.find(x => x.code === gameCode.value)
    if (!g) return
    gameName.value = g.name
    const pt = g.configs?.[0]?.payTable
    if (Array.isArray(pt)) positions.value = pt as PayItem[]
  } catch { /* 静默 */ }
}

/** 跑灯动画：先快速循环，收到结果后停在赢家 */
function startLights() {
  const bettable = positions.value.map(p => p.label)
  let i = 0
  lightTimer = setInterval(() => {
    litLabel.value = bettable[i % bettable.length]
    i++
  }, 90)
}
function stopLightsAt(winner: string) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      if (lightTimer) clearInterval(lightTimer)
      litLabel.value = winner
      setTimeout(() => { litLabel.value = ''; resolve() }, 700)
    }, 1200)
  })
}

async function doSpin() {
  if (spinning.value || totalBet.value === 0) return
  spinning.value = true
  lastWinner.value = ''
  lastResult.value = null
  startLights()
  try {
    const res = await http.post<SpinResult, SpinResult>('/bet/bcbm', {
      gameCode: gameCode.value,
      bets: myBets.value,
    })
    await stopLightsAt(res.winner)
    lastWinner.value = res.winner
    lastResult.value = res
    history.value.unshift(res.winner)
    if (history.value.length > 24) history.value.pop()
    myBets.value = {}
    walletStore.fetchBalance()
  } catch (e: unknown) {
    if (lightTimer) clearInterval(lightTimer)
    litLabel.value = ''
    toastErr((e as Error).message)
  } finally {
    spinning.value = false
  }
}

onMounted(() => {
  walletStore.fetchBalance()
  loadGame()
})
onBeforeUnmount(() => {
  if (lightTimer) clearInterval(lightTimer)
})
</script>

<style scoped>
.bcbm-page { min-height: 100vh; background: #0c0512; color: #fff; padding-bottom: 60px; }

.bcbm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(18,8,28,0.96);
  border-bottom: 1px solid rgba(170,90,255,0.25);
}
.back-btn { background: none; border: none; color: #b06aff; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; color: #c98fff; }
.balance { font-size: 13px; color: #6a4a90; }

.position-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
  padding: 18px 16px 8px;
}
.pos-card {
  position: relative;
  padding: 22px 10px; border-radius: 14px; text-align: center;
  border: 2px solid rgba(170,90,255,0.25); background: rgba(30,15,50,0.7);
  cursor: pointer; transition: all 0.12s; user-select: none;
}
.pos-card.empty { grid-column: span 2; padding: 10px; cursor: default; opacity: 0.55; }
.pos-card.lit {
  border-color: #ffd700; background: rgba(255,215,0,0.18);
  box-shadow: 0 0 18px rgba(255,215,0,0.55);
}
.pos-card.winner {
  border-color: #ff6b35; background: rgba(255,107,53,0.2);
  box-shadow: 0 0 22px rgba(255,107,53,0.6);
  animation: pulse 0.5s ease 3;
}
@keyframes pulse { 50% { transform: scale(1.04); } }
.pc-name { font-size: 20px; font-weight: 700; }
.pc-mult { font-size: 15px; font-weight: 600; color: #ffd700; margin-top: 4px; }
.pc-mult.zero { color: rgba(255,255,255,0.3); font-size: 12px; }
.pc-chip {
  position: absolute; top: 8px; right: 8px;
  min-width: 36px; padding: 3px 8px; border-radius: 14px;
  background: linear-gradient(135deg, #ffd700, #c8861e);
  color: #2a1a00; font-size: 13px; font-weight: 700;
}

.result-bar {
  display: flex; justify-content: center; gap: 16px; align-items: center;
  padding: 12px 16px; min-height: 44px;
}
.rb-idle { color: rgba(255,255,255,0.35); font-size: 13px; }
.rb-winner { font-size: 18px; font-weight: 700; color: #c98fff; }
.rb-payout { font-size: 15px; color: rgba(255,255,255,0.4); }
.rb-payout.win { color: #2ecc71; font-weight: 700; }

.chip-row { display: flex; gap: 8px; padding: 0 16px; margin-bottom: 10px; }
.chip-btn {
  flex: 1; padding: 9px 4px; border-radius: 8px;
  border: 1px solid rgba(170,90,255,0.3); background: rgba(30,15,50,0.8);
  color: #c98fff; font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.chip-btn.active { background: rgba(170,90,255,0.25); border-color: #b06aff; }
.chip-btn.clear { color: #ff7070; border-color: rgba(255,100,100,0.3); }

.total-row {
  padding: 0 16px 10px; font-size: 13px; color: rgba(255,255,255,0.55);
}
.total-row b { color: #ffd700; font-size: 16px; }

.spin-btn {
  display: block; width: calc(100% - 32px); margin: 0 16px;
  padding: 16px; border-radius: 12px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #b06aff, #5a1ea8);
  color: #fff; font-size: 18px; font-weight: 700; letter-spacing: 6px;
}
.spin-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.history-section { padding: 0 16px; }
.section-title { font-size: 14px; font-weight: 600; color: #b06aff; margin: 18px 0 8px; border-left: 3px solid #b06aff; padding-left: 8px; }
.history-dots { display: flex; flex-wrap: wrap; gap: 6px; }
.hd {
  padding: 5px 10px; border-radius: 14px; font-size: 12px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
}
.hd.vw   { color: #7dd4ff; border-color: rgba(125,212,255,0.4); }
.hd.audi { color: #ff8f8f; border-color: rgba(255,143,143,0.4); }
.hd.benz { color: #aaffc8; border-color: rgba(170,255,200,0.4); }
.hd.bmw  { color: #ffd700; border-color: rgba(255,215,0,0.4); }
.hd.none { color: rgba(255,255,255,0.3); }

.page-bottom-spacer { height: 80px; }
</style>
