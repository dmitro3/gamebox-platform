<template>
  <div class="page table-page">
    <div class="table-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">龙虎斗</span>
      <span class="balance">{{ walletStore.balance.toLocaleString() }} 分</span>
    </div>

    <!-- 连接状态 -->
    <div v-if="!connected" class="conn-bar">
      <span class="conn-dot" :class="connected ? 'ok' : 'off'"></span>
      {{ connected ? '已连接' : '连接中…' }}
    </div>

    <!-- 主桌面 -->
    <div class="main-table">
      <!-- 牌面展示 -->
      <div class="cards-row">
        <div class="side-block dragon">
          <div class="side-label">龙</div>
          <div class="card-face" :class="{ revealed: !!snapshot?.outcome }">
            <template v-if="snapshot?.outcome">
              <span class="card-suit" :class="snapshot.outcome.dragon.suit">
                {{ suitSymbol(snapshot.outcome.dragon.suit) }}
              </span>
              <span class="card-rank">{{ rankLabel(snapshot.outcome.dragon.rank) }}</span>
            </template>
            <span v-else class="card-back">?</span>
          </div>
        </div>

        <!-- 中间倒计时 -->
        <div class="center-info">
          <div class="phase-badge" :class="snapshot?.phase?.toLowerCase()">
            {{ phaseLabel }}
          </div>
          <div class="countdown">{{ snapshot?.secondsLeft ?? '--' }}</div>
          <div class="round-no">{{ snapshot?.roundNo }}</div>
        </div>

        <div class="side-block tiger">
          <div class="side-label">虎</div>
          <div class="card-face" :class="{ revealed: !!snapshot?.outcome }">
            <template v-if="snapshot?.outcome">
              <span class="card-suit" :class="snapshot.outcome.tiger.suit">
                {{ suitSymbol(snapshot.outcome.tiger.suit) }}
              </span>
              <span class="card-rank">{{ rankLabel(snapshot.outcome.tiger.rank) }}</span>
            </template>
            <span v-else class="card-back">?</span>
          </div>
        </div>
      </div>

      <!-- 结果展示 -->
      <transition name="fade">
        <div v-if="snapshot?.outcome" class="result-banner"
          :class="snapshot.outcome.winner.toLowerCase()">
          {{ winnerLabel(snapshot.outcome.winner) }} 胜出！
        </div>
      </transition>

      <!-- 下注汇总 -->
      <div class="bet-summary">
        <div class="bs-item dragon" v-for="s in ['DRAGON','TIE','TIGER']" :key="s">
          <span class="bs-label">{{ sideLabel(s) }}</span>
          <span class="bs-total">{{ (snapshot?.betSummary?.[s] ?? 0).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- 下注区 -->
    <div class="bet-area">
      <div class="bet-title">选择下注方向</div>
      <div class="side-btns">
        <button v-for="s in sides" :key="s.value"
          class="side-btn" :class="[s.cls, { active: chosenSide === s.value }]"
          :disabled="snapshot?.phase !== 'BETTING'"
          @click="chosenSide = s.value">
          <span class="sb-label">{{ s.label }}</span>
          <span class="sb-odds">{{ s.odds }}</span>
        </button>
      </div>

      <div class="chip-row">
        <button v-for="c in chips" :key="c"
          class="chip-btn" :class="{ active: betAmount === c }"
          @click="betAmount = c">{{ c }}</button>
      </div>

      <button class="place-btn"
        :disabled="!chosenSide || betAmount < 1 || snapshot?.phase !== 'BETTING' || placing"
        @click="doBet">
        {{ placing ? '下注中…' : '确认下注' }}
      </button>
    </div>

    <!-- 历史结果 -->
    <div class="history-section">
      <div class="section-title">近期开奖</div>
      <div class="history-list">
        <div v-for="(h, i) in snapshot?.history ?? []" :key="i"
          class="history-item" :class="h.outcome.winner.toLowerCase()">
          <span class="hi-winner">{{ winnerLabel(h.outcome.winner) }}</span>
          <span class="hi-cards">
            {{ rankLabel(h.outcome.dragon.rank) }}{{ suitSymbol(h.outcome.dragon.suit) }}
            vs
            {{ rankLabel(h.outcome.tiger.rank) }}{{ suitSymbol(h.outcome.tiger.suit) }}
          </span>
        </div>
      </div>
    </div>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io, Socket } from 'socket.io-client'
import { useWalletStore } from '@/stores/wallet'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import TabBar from '@/components/TabBar.vue'

const route   = useRoute()
const router  = useRouter()
const walletStore = useWalletStore()
const userStore   = useUserStore()
const { success: toastOk, error: toastErr } = useToast()

const gameCode = computed(() => route.params.gameCode as string)

interface Card { suit: string; rank: number }
interface Outcome { dragon: Card; tiger: Card; winner: string }
interface TableSnapshot {
  roomId: string; gameCode: string; phase: string; roundNo: string
  secondsLeft: number; outcome?: Outcome
  betSummary: Record<string, number>
  history: Array<{ roundNo: string; outcome: Outcome; createdAt: string }>
}

const connected  = ref(false)
const snapshot   = ref<TableSnapshot | null>(null)
const chosenSide = ref('')
const betAmount  = ref(100)
const placing    = ref(false)

let socket: Socket | null = null

// 开发时经 Vite proxy 透传，生产时直接 same-origin
const WS_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_WS_URL ?? '')

const phaseLabel = computed(() => {
  const m: Record<string, string> = {
    BETTING: '下注中', DRAWING: '开牌中', SETTLED: '已结算', PAUSED: '暂停',
  }
  return m[snapshot.value?.phase ?? ''] ?? '--'
})

const sides = [
  { value: 'DRAGON', label: '龙',    cls: 'dragon', odds: '赔 1:1' },
  { value: 'TIE',    label: '和',    cls: 'tie',    odds: '赔 1:8' },
  { value: 'TIGER',  label: '虎',    cls: 'tiger',  odds: '赔 1:1' },
]
const chips = [10, 50, 100, 500, 1000, 5000]

function suitSymbol(s: string) {
  return { S: '♠', H: '♥', D: '♦', C: '♣' }[s] ?? s
}
function rankLabel(r: number) {
  return { 1:'A', 11:'J', 12:'Q', 13:'K' }[r] ?? String(r)
}
function winnerLabel(w: string) {
  return { DRAGON: '龙', TIGER: '虎', TIE: '和' }[w] ?? w
}
function sideLabel(s: string) {
  return { DRAGON: '龙', TIE: '和', TIGER: '虎' }[s] ?? s
}

function connect() {
  socket = io(`${WS_URL}/table`, {
    auth: { userId: userStore.profile?.id ?? '' },
    transports: ['websocket'],
  })
  socket.on('connect', () => {
    connected.value = true
    socket?.emit('table:join', { gameCode: gameCode.value })
  })
  socket.on('disconnect', () => { connected.value = false })
  socket.on('table:snapshot', (snap: TableSnapshot) => {
    snapshot.value = snap
  })
  socket.on('table:betOk', () => {
    toastOk('下注成功！')
    placing.value = false
    walletStore.fetchBalance()
  })
  socket.on('table:error', (e: { message: string }) => {
    toastErr(e.message)
    placing.value = false
  })
}

async function doBet() {
  if (!chosenSide.value || betAmount.value < 1) return
  placing.value = true
  socket?.emit('table:bet', {
    roomId: gameCode.value,
    side: chosenSide.value,
    amount: betAmount.value,
  })
}

onMounted(() => {
  walletStore.fetchBalance()
  connect()
})
onBeforeUnmount(() => {
  socket?.disconnect()
})
</script>

<style scoped>
.table-page { min-height: 100vh; background: #071a0f; color: #fff; padding-bottom: 60px; }

.table-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(4,20,12,0.95);
  border-bottom: 1px solid rgba(0,180,90,0.2);
}
.back-btn { background: none; border: none; color: #00c85a; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; color: #00e567; }
.balance { font-size: 13px; color: #408060; }

.conn-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 16px; background: rgba(255,200,0,0.1); font-size: 12px; color: #ffd700;
}
.conn-dot { width: 8px; height: 8px; border-radius: 50%; }
.conn-dot.ok { background: #00e567; }
.conn-dot.off { background: #ff4444; animation: blink 1s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

.main-table { padding: 16px; }

.cards-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.side-block { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.side-label { font-size: 22px; font-weight: 700; }
.side-block.dragon .side-label { color: #e5232f; }
.side-block.tiger  .side-label { color: #1e6fff; }
.card-face {
  width: 72px; height: 100px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(20,40,28,0.8);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  font-size: 28px; font-weight: 700;
  transition: all 0.4s;
}
.card-face.revealed { background: #fff; }
.card-back { font-size: 32px; color: rgba(255,255,255,0.3); }
.card-suit { line-height: 1; }
.card-rank { font-size: 22px; color: #111; }
.card-suit.S, .card-suit.C { color: #111; }
.card-suit.H, .card-suit.D { color: #e5232f; }

.center-info { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.phase-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: rgba(255,255,255,0.1);
}
.phase-badge.betting { background: rgba(0,200,90,0.25); color: #00e567; }
.phase-badge.drawing { background: rgba(255,200,0,0.25); color: #ffd700; }
.phase-badge.settled { background: rgba(100,100,100,0.25); color: #aaa; }
.countdown { font-size: 48px; font-weight: 700; color: #ffd700; line-height: 1; }
.round-no { font-size: 10px; color: rgba(255,255,255,0.3); }

.result-banner {
  text-align: center; padding: 10px; border-radius: 8px;
  font-size: 20px; font-weight: 700; margin-bottom: 12px;
  background: rgba(255,215,0,0.15); color: #ffd700;
  border: 1px solid rgba(255,215,0,0.3);
}
.result-banner.dragon { background: rgba(229,35,47,0.2); color: #ff6b6b; border-color: rgba(229,35,47,0.4); }
.result-banner.tiger  { background: rgba(30,111,255,0.2); color: #6baaff; border-color: rgba(30,111,255,0.4); }
.result-banner.tie    { background: rgba(255,215,0,0.2); color: #ffd700; border-color: rgba(255,215,0,0.4); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.bet-summary {
  display: flex; gap: 8px;
}
.bs-item {
  flex: 1; padding: 8px; border-radius: 8px;
  background: rgba(20,40,28,0.6); text-align: center;
  border: 1px solid rgba(255,255,255,0.08);
}
.bs-label { display: block; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
.bs-total { font-size: 16px; font-weight: 600; color: #00e567; }

.bet-area { padding: 16px; }
.bet-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
.side-btns { display: flex; gap: 10px; margin-bottom: 14px; }
.side-btn {
  flex: 1; padding: 14px 8px; border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(20,40,28,0.8); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  transition: all 0.2s;
}
.side-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.side-btn.dragon { border-color: rgba(229,35,47,0.4); }
.side-btn.dragon.active { border-color: #e5232f; background: rgba(229,35,47,0.2); box-shadow: 0 0 16px rgba(229,35,47,0.4); }
.side-btn.tiger  { border-color: rgba(30,111,255,0.4); }
.side-btn.tiger.active  { border-color: #1e6fff; background: rgba(30,111,255,0.2); box-shadow: 0 0 16px rgba(30,111,255,0.4); }
.side-btn.tie    { border-color: rgba(255,215,0,0.4); }
.side-btn.tie.active    { border-color: #ffd700; background: rgba(255,215,0,0.2); box-shadow: 0 0 16px rgba(255,215,0,0.4); }
.sb-label { font-size: 20px; font-weight: 700; color: #fff; }
.side-btn.dragon .sb-label { color: #ff6b6b; }
.side-btn.tiger  .sb-label { color: #6baaff; }
.side-btn.tie    .sb-label { color: #ffd700; }
.sb-odds { font-size: 11px; color: rgba(255,255,255,0.5); }

.chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.chip-btn {
  flex: 1; min-width: 50px; padding: 8px; border-radius: 8px;
  border: 1px solid rgba(0,200,90,0.3); background: rgba(0,40,20,0.7);
  color: #00e567; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.chip-btn.active { background: rgba(0,200,90,0.2); border-color: #00c85a; }

.place-btn {
  width: 100%; padding: 16px; border-radius: 12px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #00c85a, #006d30);
  color: #fff; font-size: 17px; font-weight: 700;
  transition: all 0.2s;
}
.place-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.history-section { padding: 0 16px; }
.section-title { font-size: 14px; font-weight: 600; color: #00c85a; margin: 16px 0 8px; border-left: 3px solid #00c85a; padding-left: 8px; }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(20,40,28,0.6); border: 1px solid rgba(255,255,255,0.06);
}
.history-item.dragon { border-left: 3px solid #e5232f; }
.history-item.tiger  { border-left: 3px solid #1e6fff; }
.history-item.tie    { border-left: 3px solid #ffd700; }
.hi-winner { font-size: 15px; font-weight: 700; }
.history-item.dragon .hi-winner { color: #ff6b6b; }
.history-item.tiger  .hi-winner { color: #6baaff; }
.history-item.tie    .hi-winner { color: #ffd700; }
.hi-cards { font-size: 12px; color: rgba(255,255,255,0.5); }

.page-bottom-spacer { height: 80px; }
</style>
