<template>
  <div class="cabinet-page" @pointerdown.once="onFirstInteract">
    <img
      class="cabinet-ambient"
      :src="cabinetAmbientUrl"
      alt=""
      draggable="false"
      aria-hidden="true"
    />

    <div class="cabinet-stage">
      <img
        class="cabinet-body"
        :src="cabinetBodyUrl"
        alt="水果机"
        draggable="false"
      />

      <!-- 「水果机」上方弧形槽：常灭跑马灯，报奖时追跑点亮 -->
      <div class="title-marquee" :class="{ on: titleMarqueeOn }" aria-hidden="true">
        <span
          v-for="(bulb, i) in titleMarqueeBulbs"
          :key="`tm${i}`"
          class="title-marquee-bulb"
          :class="{ lit: titleMarqueeLit(i) }"
          :style="titleMarqueeBulbStyle(bulb)"
        />
      </div>

      <!-- 电视屏：只在底图大金框内侧黑屏播放（不动 24 格） -->
      <FruitCenterStage
        class="fruit-tv-screen"
        :style="boxStyle(tvScreenBox)"
        :mode="stageMode"
        :mult="selectedMult"
        :total-stake="stakedScore"
        :win-amount="winScore"
        :gamble-result="gambleResultNum"
        :award-type="stageAwardType"
        :hit-symbol="centerHitSymbol"
        :hit-size="centerHitSize"
        :hit-kind="centerHitKind"
        :hit-label="centerHitLabel"
      />

      <img
        class="fruit-ring"
        :src="fruitRingUrl"
        alt="24格"
        draggable="false"
        :style="boxStyle(fruitRingBox)"
      />

      <!-- 跑灯 / 中奖格高亮（叠在 24 格上） -->
      <div
        v-for="(cell, i) in cellBoxes"
        :key="`c${i}`"
        class="ring-cell"
        :class="{
          active: cursorIndex === i,
          hit: hitLit.has(i),
          train: trainHead === i,
          flash: flashAll,
        }"
        :style="boxStyle(cell)"
      />

      <div class="led-score led-score--total" :style="boxStyle(totalScoreBox)">
        <SegDigit
          v-for="(d, i) in totalScoreDigits"
          :key="`t${i}`"
          :digit="d"
          tone="red"
        />
      </div>
      <div class="led-score led-score--win" :style="boxStyle(winScoreBox)">
        <SegDigit
          v-for="(d, i) in winScoreDigits"
          :key="`w${i}`"
          :digit="d"
          tone="red"
        />
      </div>

      <div
        v-for="led in betLeds"
        :key="led.id"
        class="led-bet"
        :style="boxStyle(led)"
      >
        <SegDigit
          v-for="(d, i) in betLedDigits(led.id)"
          :key="`${led.id}${i}`"
          :digit="d"
          tone="cyan"
        />
      </div>

      <button
        v-for="btn in controlButtons"
        :key="btn.id"
        type="button"
        class="ctrl-btn"
        :class="{
          disabled: busy,
          gambleHint:
            stageMode === 'gamble_roll' &&
            winScore > 0 &&
            !busy &&
            (btn.id === 'big' || btn.id === 'small'),
        }"
        :aria-label="btn.label"
        :style="boxStyle(btn)"
        :disabled="busy && btn.id !== 'refund'"
        @click="btn.id !== 'bet' && onControlClick(btn.id)"
        @pointerdown="btn.id === 'bet' && onBetHoldStart(selectedBet, $event)"
        @pointerup="btn.id === 'bet' && onBetHoldEnd()"
        @pointerleave="btn.id === 'bet' && onBetHoldEnd()"
        @pointercancel="btn.id === 'bet' && onBetHoldEnd()"
      >
        <img :src="btn.src" :alt="btn.label" draggable="false" />
      </button>

      <button
        v-for="btn in betButtons"
        :key="btn.id"
        type="button"
        class="bet-btn"
        :class="{ selected: selectedBet === btn.id, disabled: busy }"
        :aria-label="btn.label"
        :style="boxStyle(btn)"
        :disabled="busy"
        @pointerdown="onBetHoldStart(btn.id, $event)"
        @pointerup="onBetHoldEnd()"
        @pointerleave="onBetHoldEnd()"
        @pointercancel="onBetHoldEnd()"
      >
        <img :src="btn.src" :alt="btn.label" draggable="false" />
      </button>

      <button
        v-for="btn in multButtons"
        :key="btn.value"
        type="button"
        class="mult-btn"
        :class="{ active: selectedMult === btn.value, disabled: busy }"
        :aria-label="`倍数 x${btn.value}`"
        :aria-pressed="selectedMult === btn.value"
        :style="boxStyle(btn)"
        :disabled="busy"
        @click="onMultClick(btn.value)"
      >
        <img :src="btn.src" :alt="`x${btn.value}`" draggable="false" />
      </button>
    </div>

    <button type="button" class="lobby-back fruit-top-btn" @click="goBack" aria-label="返回" />

    <div class="fruit-top-right">
      <button
        type="button"
        class="fruit-top-btn fruit-top-btn--history"
        aria-label="历史记录"
        @click="showHistory = true"
      />
      <button
        type="button"
        class="fruit-top-btn fruit-top-btn--rules"
        aria-label="游戏玩法"
        @click="showRules = true"
      />
      <button
        type="button"
        class="fruit-top-btn"
        :class="soundOn ? 'fruit-top-btn--sound-on' : 'fruit-top-btn--sound-off'"
        :aria-label="soundOn ? '关闭音效' : '开启音效'"
        @click="toggleSound"
      />
    </div>

    <!-- 历史记录 -->
    <div v-if="showHistory" class="fruit-modal" @click.self="showHistory = false">
      <div class="fruit-modal-card">
        <div class="fruit-modal-head">
          <h3>历史记录</h3>
          <button type="button" class="fruit-modal-close" @click="showHistory = false">关闭</button>
        </div>
        <div v-if="spinHistory.length" class="fruit-history-list">
          <div v-for="(row, i) in spinHistory" :key="i" class="fruit-history-row">
            <span class="fh-time">{{ row.time }}</span>
            <span class="fh-award">{{ row.award }}</span>
            <span class="fh-win" :class="{ plus: row.win > 0 }">
              {{ row.win > 0 ? `+${row.win}` : '0' }}
            </span>
          </div>
        </div>
        <div v-else class="fruit-modal-empty">暂无记录，开始游戏后这里会显示近局结果</div>
      </div>
    </div>

    <!-- 游戏玩法 -->
    <div v-if="showRules" class="fruit-modal" @click.self="showRules = false">
      <div class="fruit-modal-card fruit-modal-card--rules">
        <div class="fruit-modal-head">
          <h3>游戏玩法</h3>
          <button type="button" class="fruit-modal-close" @click="showRules = false">关闭</button>
        </div>
        <div class="fruit-rules-body">
          <p>经典水果机（玛丽机）：先选倍数，再对各水果押分，按「开始」跑灯开奖。</p>
          <p><b>普通中奖</b>：灯停在已押符号上，按该格倍率 × 该符号押注 × 当前倍数得分。</p>
          <p><b>开火车</b>：连续点亮多格，沿途已押格一并计分。</p>
          <p><b>大三元 / 小三元 / 大四喜 / 大满贯</b>：特殊大奖，对应多格或高倍结算。</p>
          <p><b>送灯 / 吃灯</b>：停在好运格后的特殊跑灯玩法。</p>
          <p><b>猜大小</b>：当局有赢分时可猜大(8-13)或小(1-6)，猜中翻倍，猜错清零，7 为和局。</p>
          <p>顶部弧槽跑马灯会在报奖与庆祝时追跑点亮，属老式柜机效果。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  FRUIT_AWARD_LABELS,
  FRUIT_MULT_STEPS,
  FRUIT_RING,
  type FruitAwardType,
  type FruitBetSymbolId,
} from '@/games/slots'
import { localFruitSpin } from '@/games/slots/fruitLocalSpin'
import type { CenterStageMode } from '@/games/slots/fruitCenterAssets'
import FruitCenterStage from '@/components/FruitCenterStage.vue'
import {
  playFruitAnnounce,
  playFruitAwardFanfare,
  playFruitAwardVoice,
  playFruitBet,
  playFruitGo,
  playFruitSfx,
  initFruitMuteFromStorage,
  isFruitMuted,
  setFruitBgmDuck,
  setFruitMuted,
  startFruitBgm,
  stopFruitBgm,
  stopFruitGo,
  unlockFruitAudio,
} from '@/games/slots/fruitAudio'
import { gamesApi } from '@/api/games'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'

/** 七段数码管单字 */
const SEG_MAP: Record<string, string[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'd', 'e', 'g'],
  '3': ['a', 'b', 'c', 'd', 'g'],
  '4': ['b', 'c', 'f', 'g'],
  '5': ['a', 'c', 'd', 'f', 'g'],
  '6': ['a', 'c', 'd', 'e', 'f', 'g'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
}

const SEG_PATHS: Record<string, string> = {
  a: 'M3.5 1.5 L16.5 1.5 L14.5 3.5 L5.5 3.5 Z',
  b: 'M16.8 2.2 L18.8 4 L18.8 10.2 L16.8 12 L14.8 10.2 L14.8 4 Z',
  c: 'M16.8 14 L18.8 15.8 L18.8 22 L16.8 23.8 L14.8 22 L14.8 15.8 Z',
  d: 'M3.5 24.5 L5.5 22.5 L14.5 22.5 L16.5 24.5 L14.5 26.5 L5.5 26.5 Z',
  e: 'M1.2 14 L3.2 15.8 L3.2 22 L1.2 23.8 L-0.8 22 L-0.8 15.8 Z',
  f: 'M1.2 2.2 L3.2 4 L3.2 10.2 L1.2 12 L-0.8 10.2 L-0.8 4 Z',
  g: 'M3.5 13.2 L5.5 11.4 L14.5 11.4 L16.5 13.2 L14.5 15 L5.5 15 Z',
}

const SegDigit = defineComponent({
  name: 'SegDigit',
  props: {
    digit: { type: String, required: true },
    tone: { type: String as () => 'red' | 'cyan', default: 'red' },
  },
  setup(props) {
    const onColor = computed(() => (props.tone === 'cyan' ? '#2ef0ff' : '#ff2a1a'))
    const offColor = computed(() =>
      props.tone === 'cyan' ? 'rgba(10, 35, 48, 0.55)' : 'rgba(60, 16, 10, 0.5)',
    )
    const glow = computed(() =>
      props.tone === 'cyan'
        ? 'drop-shadow(0 0 1.5px #5af6ff) drop-shadow(0 0 3px rgba(40,220,255,0.9))'
        : 'drop-shadow(0 0 1.5px #ff4a30) drop-shadow(0 0 3px rgba(255,40,20,0.9))',
    )
    return () => {
      const on = new Set(SEG_MAP[props.digit] ?? SEG_MAP['0'])
      return h(
        'svg',
        {
          class: 'seg-digit',
          viewBox: '-1 0 22 28',
          preserveAspectRatio: 'xMidYMid meet',
          'aria-hidden': 'true',
        },
        Object.entries(SEG_PATHS).map(([id, d]) => {
          const lit = on.has(id)
          return h('path', {
            key: id,
            d,
            fill: lit ? onColor.value : offColor.value,
            style: lit ? { filter: glow.value } : undefined,
          })
        }),
      )
    }
  },
})

const router = useRouter()
const walletStore = useWalletStore()
const { toast } = useToast()

const cabinetBodyUrl = '/images/games/slots/fruit-cabinet-base.png'
const cabinetAmbientUrl = '/images/games/slots/fruit-cabinet-bg-blur.jpg'
const fruitRingUrl = '/images/games/slots/24格.png'

const BASE_W = 1024
const BASE_H = 1536

interface PixelBox {
  x: number
  y: number
  w: number
  h: number
}

/** 24 格盘面（位置不动） */
const fruitRingBox: PixelBox = { x: 139, y: 421, w: 752, h: 680 }
/**
 * 底图中间大金框内侧黑屏 = 电视机画面区
 * 仅中心舞台用这里，不改 24 格坐标
 */
const tvScreenBox: PixelBox = { x: 256, y: 534, w: 518, h: 455 }
const totalScoreBox: PixelBox = { x: 275, y: 323, w: 185, h: 48 }
const winScoreBox: PixelBox = { x: 571, y: 323, w: 182, h: 47 }

/**
 * 「水果机」标题上方金弧槽跑马灯坐标（底图 1024×1536）
 * 平时只露暗泡；报奖 / 中奖庆祝时追跑点亮
 */
const TITLE_MARQUEE_BULBS = [
  { x: 201, y: 131 },
  { x: 230, y: 110 },
  { x: 258, y: 93 },
  { x: 286, y: 79 },
  { x: 314, y: 66 },
  { x: 343, y: 55 },
  { x: 371, y: 47 },
  { x: 399, y: 41 },
  { x: 428, y: 35 },
  { x: 456, y: 31 },
  { x: 484, y: 29 },
  // 跳过正中红宝石位
  { x: 541, y: 28 },
  { x: 569, y: 30 },
  { x: 597, y: 34 },
  { x: 626, y: 39 },
  { x: 654, y: 45 },
  { x: 682, y: 54 },
  { x: 710, y: 63 },
  { x: 739, y: 75 },
  { x: 767, y: 90 },
  { x: 795, y: 107 },
  { x: 824, y: 118 },
] as const

const TITLE_MARQUEE_BULB_SIZE = 18
const titleMarqueeBulbs = TITLE_MARQUEE_BULBS

/**
 * 24 格在 ring 图内的实测格子（752×680）
 * 格缝按 24格.png 透明缝实测，行高不均（GOOD LUCK 等偏矮）
 * 行高约：103 / 107 / 102 / 79 / 102 / 87 / 100
 * 顺序与 FRUIT_RING 一致：上7 → 右5 → 下7(右→左) → 左5(下→上)
 */
const RING_X = [0, 105, 214, 323, 432, 540, 648, 752] as const
const RING_Y = [0, 103, 210, 312, 391, 493, 580, 680] as const
const RING_PAD = 2

function ringCellAt(col: number, row: number): PixelBox {
  return {
    x: RING_X[col] + RING_PAD,
    y: RING_Y[row] + RING_PAD,
    w: RING_X[col + 1] - RING_X[col] - RING_PAD * 2,
    h: RING_Y[row + 1] - RING_Y[row] - RING_PAD * 2,
  }
}

const RING_CELL_LOCAL: ReadonlyArray<PixelBox> = [
  // 上 7
  ringCellAt(0, 0),
  ringCellAt(1, 0),
  ringCellAt(2, 0),
  ringCellAt(3, 0),
  ringCellAt(4, 0),
  ringCellAt(5, 0),
  ringCellAt(6, 0),
  // 右 5（含偏矮格）
  ringCellAt(6, 1),
  ringCellAt(6, 2),
  ringCellAt(6, 3),
  ringCellAt(6, 4),
  ringCellAt(6, 5),
  // 下 7（右→左）
  ringCellAt(6, 6),
  ringCellAt(5, 6),
  ringCellAt(4, 6),
  ringCellAt(3, 6),
  ringCellAt(2, 6),
  ringCellAt(1, 6),
  ringCellAt(0, 6),
  // 左 5（下→上，含偏矮格）
  ringCellAt(0, 5),
  ringCellAt(0, 4),
  ringCellAt(0, 3),
  ringCellAt(0, 2),
  ringCellAt(0, 1),
]

const cellBoxes: PixelBox[] = RING_CELL_LOCAL.map((b) => ({
  x: fruitRingBox.x + b.x,
  y: fruitRingBox.y + b.y,
  w: b.w,
  h: b.h,
}))

const totalScore = ref(0)
const winScore = ref(0)
const busy = ref(false)
const cursorIndex = ref(-1)
const hitLit = ref<Set<number>>(new Set())
const trainHead = ref(-1)
const flashAll = ref(false)
const selectedBet = ref<FruitBetSymbolId>('apple')

/** 标题弧槽跑马灯：常灭，报奖时追跑 */
const titleMarqueeOn = ref(false)
const titleMarqueePhase = ref(0)
let titleMarqueeTimer: ReturnType<typeof setInterval> | null = null

/** 中心舞台状态 */
const stageMode = ref<CenterStageMode>('idle')
const stageAwardType = ref<FruitAwardType | 'bar' | 'normal'>('normal')
const gambleResultNum = ref<number | null>(null)
const centerHitSymbol = ref<FruitBetSymbolId | 'luck' | null>(null)
const centerHitSize = ref<'big' | 'small' | 'luck'>('big')
const centerHitKind = ref<string | null>(null)
const centerHitLabel = ref('')
const showHistory = ref(false)
const showRules = ref(false)
const soundOn = ref(true)

interface SpinHistoryRow {
  time: string
  award: string
  win: number
}
const spinHistory = ref<SpinHistoryRow[]>([])

const totalScoreDigits = computed(() =>
  String(Math.min(999999, Math.max(0, totalScore.value))).padStart(6, '0').split(''),
)
const winScoreDigits = computed(() =>
  String(Math.min(999999, Math.max(0, winScore.value))).padStart(6, '0').split(''),
)

type ControlId = 'refund' | 'bet' | 'small' | 'big' | 'start'

interface ControlButton extends PixelBox {
  id: ControlId
  label: string
  src: string
}

const controlButtons: ControlButton[] = [
  { id: 'refund', label: '退币', src: '/images/games/slots/退币.png', x: 139, y: 1136, w: 129, h: 64 },
  { id: 'bet', label: '押分', src: '/images/games/slots/押分.png', x: 297, y: 1136, w: 127, h: 63 },
  { id: 'small', label: '小', src: '/images/games/slots/小.png', x: 451, y: 1136, w: 109, h: 63 },
  { id: 'big', label: '大', src: '/images/games/slots/大.png', x: 587, y: 1136, w: 109, h: 63 },
  { id: 'start', label: '开始', src: '/images/games/slots/开始.png', x: 726, y: 1137, w: 159, h: 62 },
]

type BetId = FruitBetSymbolId

interface BetButton extends PixelBox {
  id: BetId
  label: string
  src: string
}

const betButtons: BetButton[] = [
  { id: 'bar', label: '天门', src: '/images/games/slots/1.png', x: 75, y: 1270, w: 118, h: 100 },
  { id: 'seven', label: '77', src: '/images/games/slots/2.png', x: 185, y: 1269, w: 113, h: 101 },
  { id: 'star', label: '双星', src: '/images/games/slots/3.png', x: 295, y: 1269, w: 108, h: 101 },
  { id: 'melon', label: '西瓜', src: '/images/games/slots/4.png', x: 402, y: 1269, w: 106, h: 101 },
  { id: 'bell', label: '铃铛', src: '/images/games/slots/5.png', x: 510, y: 1269, w: 109, h: 101 },
  { id: 'lemon', label: '芒果', src: '/images/games/slots/6.png', x: 618, y: 1269, w: 111, h: 101 },
  { id: 'orange', label: '橘子', src: '/images/games/slots/7.png', x: 726, y: 1269, w: 114, h: 101 },
  { id: 'apple', label: '苹果', src: '/images/games/slots/8.png', x: 832, y: 1269, w: 120, h: 101 },
]

const betLeds: Array<PixelBox & { id: BetId }> = [
  { id: 'bar', x: 104, y: 1240, w: 83, h: 22 },
  { id: 'seven', x: 206, y: 1240, w: 85, h: 22 },
  { id: 'star', x: 313, y: 1240, w: 81, h: 22 },
  { id: 'melon', x: 414, y: 1240, w: 84, h: 22 },
  { id: 'bell', x: 520, y: 1240, w: 85, h: 22 },
  { id: 'lemon', x: 627, y: 1240, w: 83, h: 22 },
  { id: 'orange', x: 731, y: 1240, w: 86, h: 22 },
  { id: 'apple', x: 837, y: 1240, w: 87, h: 22 },
]

const betCounts = ref<Record<BetId, number>>({
  bar: 0,
  seven: 0,
  star: 0,
  melon: 0,
  bell: 0,
  lemon: 0,
  orange: 0,
  apple: 0,
})

function betLedDigits(id: BetId) {
  return String(Math.min(99, betCounts.value[id] ?? 0)).padStart(2, '0').split('')
}

type MultValue = (typeof FRUIT_MULT_STEPS)[number]

interface MultButton extends PixelBox {
  value: MultValue
  src: string
}

const multButtons: MultButton[] = [
  { value: 1, src: '/images/games/slots/X1.png', x: 242, y: 1435, w: 89, h: 66 },
  { value: 5, src: '/images/games/slots/X5.png', x: 354, y: 1435, w: 89, h: 66 },
  { value: 10, src: '/images/games/slots/X10.png', x: 470, y: 1435, w: 89, h: 66 },
  { value: 20, src: '/images/games/slots/X20.png', x: 586, y: 1435, w: 92, h: 66 },
  { value: 50, src: '/images/games/slots/X50.png', x: 703, y: 1435, w: 92, h: 66 },
  { value: 100, src: '/images/games/slots/X100.png', x: 823, y: 1435, w: 92, h: 66 },
]

const selectedMult = ref<MultValue>(10)

/** 上一局注数快照（开始键空押时复用） */
const lastBetCounts = ref<Record<BetId, number> | null>(null)
/** 当前已从总积分扣下、压在盘面上的分数 */
const stakedScore = ref(0)

let betHoldTimer: ReturnType<typeof setTimeout> | null = null
let betHoldInterval: ReturnType<typeof setInterval> | null = null

function hasAnyBet(src: Record<BetId, number> = betCounts.value) {
  return (Object.values(src) as number[]).some((n) => n > 0)
}

function clearBoardBets(refund: boolean) {
  if (refund && stakedScore.value > 0) {
    totalScore.value += stakedScore.value
  }
  stakedScore.value = 0
  for (const k of Object.keys(betCounts.value) as BetId[]) betCounts.value[k] = 0
}

function stopBetHold() {
  if (betHoldTimer) {
    clearTimeout(betHoldTimer)
    betHoldTimer = null
  }
  if (betHoldInterval) {
    clearInterval(betHoldInterval)
    betHoldInterval = null
  }
}

/** 按下：立刻下一注；长按后连加 */
function onBetHoldStart(id: BetId, ev?: PointerEvent) {
  if (busy.value) return
  unlockFruitAudio()
  startFruitBgm()
  ev?.preventDefault()
  try {
    ;(ev?.currentTarget as HTMLElement | undefined)?.setPointerCapture?.(ev.pointerId)
  } catch {
    /* ignore */
  }

  selectedBet.value = id
  if (!addBet(id)) return

  stopBetHold()
  betHoldTimer = setTimeout(() => {
    betHoldTimer = null
    betHoldInterval = setInterval(() => {
      if (busy.value || !addBet(id)) stopBetHold()
    }, 90)
  }, 280)
}

function onBetHoldEnd() {
  stopBetHold()
}

/** 把上一局注数摆回盘面（开始键第一次），并立刻从总积分扣下 */
function restoreLastBets(): boolean {
  if (!lastBetCounts.value || !hasAnyBet(lastBetCounts.value)) return false
  const restored = { ...lastBetCounts.value }
  const units = (Object.values(restored) as number[]).reduce((a, b) => a + b, 0)
  const cost = units * selectedMult.value
  // 若盘面已有押分，先退回再重摆
  if (stakedScore.value > 0) {
    totalScore.value += stakedScore.value
    stakedScore.value = 0
  }
  if (totalScore.value < cost) {
    playFruitSfx('lose', 0.45)
    toast('积分不足，无法重复上局')
    return false
  }
  betCounts.value = restored
  totalScore.value -= cost
  stakedScore.value = cost
  playFruitSfx('click')
  return true
}

function clearCenterHit() {
  centerHitSymbol.value = null
  centerHitSize.value = 'big'
  centerHitKind.value = null
  centerHitLabel.value = ''
}

function setCenterHit(cellIndex: number) {
  const cell = FRUIT_RING[cellIndex]
  if (!cell) return
  centerHitKind.value = cell.kind
  centerHitSymbol.value = cell.symbol ?? 'luck'
  centerHitSize.value = cell.size
  centerHitLabel.value = cell.label
}

function enterAwardStage(awardType: FruitAwardType | 'bar' | 'normal') {
  stageAwardType.value = awardType
  stageMode.value = 'award'
}

function enterGambleOrIdle() {
  clearCenterHit()
  gambleResultNum.value = null
  if (winScore.value > 0) {
    stageMode.value = 'gamble_roll'
  } else {
    stageMode.value = 'idle'
    stageAwardType.value = 'normal'
  }
}

function boxStyle(box: PixelBox) {
  return {
    left: `${(box.x / BASE_W) * 100}%`,
    top: `${(box.y / BASE_H) * 100}%`,
    width: `${(box.w / BASE_W) * 100}%`,
    height: `${(box.h / BASE_H) * 100}%`,
  }
}

function titleMarqueeBulbStyle(bulb: { x: number; y: number }) {
  const s = TITLE_MARQUEE_BULB_SIZE
  return {
    left: `${((bulb.x - s / 2) / BASE_W) * 100}%`,
    top: `${((bulb.y - s / 2) / BASE_H) * 100}%`,
    width: `${(s / BASE_W) * 100}%`,
    height: `${(s / BASE_H) * 100}%`,
  }
}

/** 经典三段跑马：亮 → 灭 → 灭 循环追跑 */
function titleMarqueeLit(index: number) {
  if (!titleMarqueeOn.value) return false
  const n = titleMarqueeBulbs.length
  const phase = titleMarqueePhase.value % n
  // 一串 3 颗亮灯沿弧追跑
  for (let k = 0; k < 3; k++) {
    if ((phase + k) % n === index) return true
  }
  // 对侧再一串，更像柜机对称跑灯
  const phase2 = (phase + Math.floor(n / 2)) % n
  for (let k = 0; k < 3; k++) {
    if ((phase2 + k) % n === index) return true
  }
  return false
}

function startTitleMarquee() {
  titleMarqueeOn.value = true
  if (titleMarqueeTimer) return
  titleMarqueeTimer = setInterval(() => {
    titleMarqueePhase.value = (titleMarqueePhase.value + 1) % titleMarqueeBulbs.length
  }, 70)
}

function stopTitleMarquee() {
  titleMarqueeOn.value = false
  titleMarqueePhase.value = 0
  if (titleMarqueeTimer) {
    clearInterval(titleMarqueeTimer)
    titleMarqueeTimer = null
  }
}

function syncTitleMarquee() {
  const celebrating =
    flashAll.value ||
    stageMode.value === 'award' ||
    stageMode.value === 'gamble_roll' ||
    stageMode.value === 'gamble_win' ||
    stageMode.value === 'gamble_push'
  if (celebrating) startTitleMarquee()
  else stopTitleMarquee()
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function syncScoreFromWallet() {
  totalScore.value = Math.floor(walletStore.balance)
}

function onFirstInteract() {
  unlockFruitAudio()
  startFruitBgm()
}

function goBack() {
  stopFruitBgm()
  router.back()
}

function toggleSound() {
  unlockFruitAudio()
  const next = !soundOn.value
  soundOn.value = next
  setFruitMuted(!next)
  if (next) startFruitBgm()
  playFruitSfx('click', 0.5)
}

function pushSpinHistory(awardType: string, win: number) {
  const award =
    awardType in FRUIT_AWARD_LABELS
      ? FRUIT_AWARD_LABELS[awardType as FruitAwardType]
      : awardType === 'bar'
        ? '天门'
        : '普通中奖'
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  spinHistory.value.unshift({ time, award, win })
  if (spinHistory.value.length > 30) spinHistory.value.length = 30
}

/** 注数合计 × 倍数 = 实际扣分 */
function totalBetCost() {
  const units = (Object.values(betCounts.value) as number[]).reduce((a, b) => a + b, 0)
  return units * selectedMult.value
}

function buildBetPayload(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of Object.keys(betCounts.value) as BetId[]) {
    const units = betCounts.value[id]
    if (units > 0) out[id] = units * selectedMult.value
  }
  return out
}

async function onControlClick(id: ControlId) {
  unlockFruitAudio()
  startFruitBgm()
  if (id === 'refund') {
    playFruitSfx('cashout')
    // 退币：押分退回总积分
    clearBoardBets(true)
    winScore.value = 0
    hitLit.value = new Set()
    cursorIndex.value = -1
    trainHead.value = -1
    enterGambleOrIdle()
    return
  }
  if (busy.value) return

  if (id === 'bet') {
    addBet(selectedBet.value)
    return
  }
  if (id === 'big' || id === 'small') {
    await doGamble(id)
    return
  }
  if (id === 'start') {
    // 空押：第一次开始 = 重复上一局注数；再点开始才开跑
    if (!hasAnyBet()) {
      if (restoreLastBets()) return
      toast('请先押分')
      playFruitSfx('lose', 0.4)
      return
    }
    await doSpin()
  }
}

function addBet(id: BetId): boolean {
  const cost = selectedMult.value
  if (totalScore.value < cost) {
    playFruitSfx('lose', 0.45)
    toast('积分不足')
    return false
  }
  if (betCounts.value[id] >= 99) {
    toast('单格已满')
    return false
  }
  betCounts.value[id] += 1
  // 押分当下从总积分扣，方便看出压了多少
  totalScore.value -= cost
  stakedScore.value += cost
  playFruitBet(id)
  return true
}

function onMultClick(value: MultValue) {
  if (busy.value) return
  if (value === selectedMult.value) return

  const units = (Object.values(betCounts.value) as number[]).reduce((a, b) => a + b, 0)
  if (units > 0) {
    const newStake = units * value
    const delta = newStake - stakedScore.value
    if (delta > 0 && totalScore.value < delta) {
      playFruitSfx('lose', 0.45)
      toast('积分不足，无法切换该倍数')
      return
    }
    // 倍数升高补扣，降低则退回差额
    totalScore.value -= delta
    stakedScore.value = newStake
  }

  selectedMult.value = value
  playFruitSfx('mult')
}

async function doGamble(choice: 'big' | 'small') {
  if (winScore.value <= 0) {
    toast('没有可再赌的当局赢分')
    playFruitSfx(choice === 'big' ? 'big' : 'small')
    return
  }
  if (stageMode.value === 'gamble_win' || stageMode.value === 'gamble_lose') return
  busy.value = true
  playFruitSfx(choice === 'big' ? 'big' : 'small')
  const amount = winScore.value
  try {
    let result: 'win' | 'lose' | 'push' = 'push'
    let roll = 7

    try {
      const res = await gamesApi.fruitGamble(amount, choice)
      walletStore.balance = res.balance
      roll = res.roll
      result = res.result as 'win' | 'lose' | 'push'
    } catch {
      roll = 1 + Math.floor(Math.random() * 13)
      if (roll === 7) result = 'push'
      else if (roll <= 6) result = choice === 'small' ? 'win' : 'lose'
      else result = choice === 'big' ? 'win' : 'lose'
      if (result === 'win') walletStore.balance += amount
      else if (result === 'lose') {
        walletStore.balance = Math.max(0, walletStore.balance - amount)
      }
    }

    gambleResultNum.value = roll
    if (result === 'win') {
      winScore.value = amount * 2
      stageMode.value = 'gamble_win'
      playFruitSfx('gambleWin')
      syncScoreFromWallet()
      await sleep(2000)
      stageMode.value = 'gamble_roll'
    } else if (result === 'lose') {
      winScore.value = 0
      stageMode.value = 'gamble_lose'
      playFruitSfx('gambleLose')
      syncScoreFromWallet()
      await sleep(2000)
      enterGambleOrIdle()
    } else {
      stageMode.value = 'gamble_push'
      playFruitSfx('click')
      syncScoreFromWallet()
      await sleep(1200)
      stageMode.value = 'gamble_roll'
    }
  } catch (e) {
    toast(e instanceof Error ? e.message : '再赌失败')
  } finally {
    busy.value = false
  }
}

async function runLightTo(stopIndex: number, minLaps = 2) {
  const n = FRUIT_RING.length
  const start = cursorIndex.value >= 0 ? cursorIndex.value : 0
  const dist = ((stopIndex - start) % n + n) % n
  const totalSteps = minLaps * n + dist
  setFruitBgmDuck(true)
  playFruitGo()
  for (let step = 0; step <= totalSteps; step++) {
    const idx = (start + step) % n
    cursorIndex.value = idx
    const p = step / totalSteps
    if (p > 0.72) playFruitSfx('tick', 0.35)
    let delay = 55
    if (p < 0.15) delay = 110 - p * 300
    else if (p > 0.7) delay = 55 + (p - 0.7) * 280
    else delay = 38
    await sleep(Math.max(28, delay))
  }
  stopFruitGo()
  cursorIndex.value = stopIndex
  playFruitSfx('stop')
  await sleep(220)
}

/** 开火车：乱跑（乱跳）制造悬念，再减速停到目标格 */
async function runWildThenStop(stopIndex: number, durationMs = 2400) {
  const n = FRUIT_RING.length
  setFruitBgmDuck(true)
  playFruitGo()
  const t0 = performance.now()
  let guard = 0
  while (performance.now() - t0 < durationMs && guard < 200) {
    guard += 1
    if (Math.random() < 0.7) {
      cursorIndex.value = Math.floor(Math.random() * n)
    } else {
      cursorIndex.value = (cursorIndex.value + 1 + Math.floor(Math.random() * 3)) % n
    }
    playFruitSfx('wild', 0.45)
    const elapsed = performance.now() - t0
    const p = elapsed / durationMs
    const delay = p < 0.55 ? 45 + Math.random() * 35 : 70 + p * 120
    await sleep(delay)
  }
  const start = cursorIndex.value >= 0 ? cursorIndex.value : 0
  const dist = ((stopIndex - start) % n + n) % n
  const steps = dist + n
  for (let step = 1; step <= steps; step++) {
    cursorIndex.value = (start + step) % n
    const p = step / steps
    playFruitSfx('tick', 0.3 + p * 0.2)
    await sleep(Math.max(40, 40 + p * 90))
  }
  stopFruitGo()
  cursorIndex.value = stopIndex
  playFruitSfx('stop')
  await sleep(280)
}

/** 单格报奖：中心立刻切水果图标 + 语音 + 累加赢分 */
async function announceCell(
  cellIndex: number,
  addWin = 0,
): Promise<string> {
  const cell = FRUIT_RING[cellIndex]
  if (!cell?.symbol) return ''
  setCenterHit(cellIndex)
  const size = cell.size === 'big' ? 'big' : 'small'
  const label = `${cell.label} ×${cell.mult}`
  const announceP = playFruitAnnounce(cell.symbol, size)
  if (addWin > 0) {
    winScore.value += addWin
    playFruitSfx('scoreUp', 0.7)
  }
  await announceP
  return label
}

/** 天门 / 高倍格：中心舞台专属庆祝 */
async function celebrateHighCell(cellIndex: number) {
  const cell = FRUIT_RING[cellIndex]
  if (!cell?.symbol) return
  const isBar = cell.symbol === 'bar'
  const isHigh = isBar || cell.mult >= 20
  if (!isHigh) return

  setCenterHit(cellIndex)
  if (isBar) {
    enterAwardStage('bar')
    playFruitSfx('barWin', 0.95)
    playFruitSfx('jackpot', 0.7)
    await flashRing(5, 85)
    await sleep(350)
  } else {
    enterAwardStage(stageAwardType.value === 'normal' ? 'normal' : stageAwardType.value)
    playFruitSfx('jackpot', 0.85)
    await flashRing(3, 90)
    await sleep(200)
  }
}

async function flashRing(times = 3, gap = 120) {
  for (let i = 0; i < times; i++) {
    flashAll.value = true
    await sleep(gap)
    flashAll.value = false
    await sleep(gap)
  }
}

/** 语音报奖开场：中心只显示奖名 */
async function showAwardIntro(awardType: FruitAwardType) {
  enterAwardStage(awardType)
  clearCenterHit()
  if (awardType === 'luck_send' || awardType === 'luck_eat') {
    centerHitSymbol.value = 'luck'
    centerHitSize.value = 'luck'
    centerHitKind.value = 'luck'
    centerHitLabel.value = awardType === 'luck_eat' ? '吃灯' : '送灯'
  }
  playFruitAwardFanfare(awardType)
  const voiceP = playFruitAwardVoice(awardType)
  if (awardType !== 'luck_eat') {
    await flashRing(awardType === 'slam' ? 5 : 3, 100)
  }
  await voiceP
  await sleep(200)
}

/** 开火车：车头推进，身后灯一格格留下；每亮一格立刻切中心图标 */
async function playTrainGrow(hitIndexes: number[]) {
  hitLit.value = new Set()
  for (const idx of hitIndexes) {
    trainHead.value = idx
    const next = new Set(hitLit.value)
    next.add(idx)
    hitLit.value = next
    cursorIndex.value = idx
    setCenterHit(idx)
    playFruitSfx('trainStep', 0.85)
    await sleep(240)
  }
  trainHead.value = -1
}

/** 送灯：停在 GOOD LUCK 后，再分别跑灯到每个中奖格 */
async function playLuckSendRuns(
  hitIndexes: number[],
  winByCell: Map<number, number>,
) {
  enterAwardStage('luck_send')
  playFruitSfx('jackpot', 0.75)
  await playFruitAwardVoice('luck_send')
  await sleep(150)

  hitLit.value = new Set()
  for (const idx of hitIndexes) {
    await runLightTo(idx, 1)
    const next = new Set(hitLit.value)
    next.add(idx)
    hitLit.value = next
    setCenterHit(idx)
    await celebrateHighCell(idx)
    await announceCell(idx, winByCell.get(idx) ?? 0)
  }
}

async function revealHits(
  awardType: FruitAwardType,
  stopIndex: number,
  hitIndexes: number[],
  wins: Array<{ cellIndex: number; amount: number }>,
) {
  const winByCell = new Map(wins.map((w) => [w.cellIndex, w.amount]))
  const stoppedOnLuck = FRUIT_RING[stopIndex]?.size === 'luck'
  const isSend =
    awardType === 'luck_send' || (stoppedOnLuck && hitIndexes.length > 0 && awardType !== 'luck_eat')
  const special = awardType !== 'normal' || isSend

  hitLit.value = new Set()

  // —— 吃灯 ——
  if (awardType === 'luck_eat') {
    await showAwardIntro('luck_eat')
    await sleep(600)
    setFruitBgmDuck(false)
    enterGambleOrIdle()
    return
  }

  // —— 送灯 ——
  if (isSend) {
    enterAwardStage('luck_send')
    centerHitSymbol.value = 'luck'
    centerHitSize.value = 'luck'
    centerHitKind.value = 'luck'
    centerHitLabel.value = 'GOOD LUCK'
    playFruitSfx('jackpot', 0.85)
    await playFruitAwardVoice('goodluck')
    await flashRing(2, 110)
    await playLuckSendRuns(hitIndexes, winByCell)
    playFruitSfx('coin', 0.8)
    await flashRing(3, 90)
  }
  // —— 开火车 ——
  else if (awardType === 'train') {
    enterAwardStage('train')
    clearCenterHit()
    playFruitSfx('special', 0.7)
    const trainStart = hitIndexes[0] ?? stopIndex
    await runWildThenStop(trainStart, 2600)

    await showAwardIntro('train')
    await playTrainGrow(hitIndexes)
    for (const idx of hitIndexes) {
      cursorIndex.value = idx
      setCenterHit(idx)
      await celebrateHighCell(idx)
      await announceCell(idx, winByCell.get(idx) ?? 0)
    }
    playFruitSfx('coin', 0.85)
    playFruitSfx('awardTrain', 0.55)
    await flashRing(4, 90)
  }
  // —— 大三元 / 小三元 / 大四喜 / 大满贯 ——
  else if (awardType === 'big3' || awardType === 'small3' || awardType === 'four' || awardType === 'slam') {
    enterAwardStage(awardType)
    clearCenterHit()
    playFruitSfx('jackpot', 0.95)
    await flashRing(4, 95)
    await sleep(250)

    await showAwardIntro(awardType)

    hitLit.value = new Set()
    for (const idx of hitIndexes) {
      const next = new Set(hitLit.value)
      next.add(idx)
      hitLit.value = next
      cursorIndex.value = idx
      setCenterHit(idx)
      playFruitSfx('special', 0.5)
      await flashRing(1, 70)
      await sleep(120)
      await celebrateHighCell(idx)
      await announceCell(idx, winByCell.get(idx) ?? 0)
    }
    playFruitSfx('coin', 0.85)
    playFruitAwardFanfare(awardType)
    await flashRing(4, 90)
  }
  // —— 普通单格 ——
  else if (hitIndexes.length) {
    hitLit.value = new Set(hitIndexes)
    for (const idx of hitIndexes) {
      cursorIndex.value = idx
      const cell = FRUIT_RING[idx]
      const amt = winByCell.get(idx) ?? 0
      setCenterHit(idx)
      if (cell?.symbol === 'bar') enterAwardStage('bar')
      else if (amt > 0) enterAwardStage('normal')
      await celebrateHighCell(idx)
      await announceCell(idx, amt)
    }
    if ((wins.reduce((s, w) => s + w.amount, 0) || 0) > 0) {
      playFruitSfx('win', 0.75)
    }
  }

  await sleep(special ? 700 : 280)
  if (special) await sleep(500)
  setFruitBgmDuck(false)
  enterGambleOrIdle()
}

async function doSpin() {
  const payload = buildBetPayload()
  if (Object.keys(payload).length === 0) {
    toast('请先押分')
    playFruitSfx('lose', 0.4)
    return
  }
  // 押分时已从总积分扣过，这里用已压分数作本局成本
  const cost = stakedScore.value > 0 ? stakedScore.value : totalBetCost()
  if (cost <= 0) {
    toast('请先押分')
    playFruitSfx('lose', 0.4)
    return
  }

  // 开跑前记下本局注数，供下次「开始」复用
  lastBetCounts.value = { ...betCounts.value }

  busy.value = true
  winScore.value = 0
  hitLit.value = new Set()
  trainHead.value = -1
  flashAll.value = false
  stageMode.value = 'idle'
  clearCenterHit()
  gambleResultNum.value = null
  playFruitSfx('start')

  let result: {
    awardType: string
    stopIndex: number
    hitIndexes: number[]
    totalWin: number
    wins?: Array<{ cellIndex: number; amount: number; symbol?: string; mult?: number }>
    balance?: number
  }

  try {
    try {
      const res = await gamesApi.fruitSpin(payload)
      result = res
      if (typeof res.balance === 'number') walletStore.balance = res.balance
    } catch {
      // 本地演示：钱包按「当前总积分(已扣押) + 赢分」对齐
      const local = localFruitSpin(payload)
      result = local
      walletStore.balance = totalScore.value + local.totalWin
    }

    const wins = (result.wins ?? []).map((w) => ({
      cellIndex: w.cellIndex,
      amount: w.amount,
    }))

    const award = result.awardType as FruitAwardType
    // 开火车：先普通跑一小段吊胃口，真正开奖在「乱跑→停下」里完成
    if (award === 'train') {
      await runLightTo(result.stopIndex, 1)
    } else {
      await runLightTo(result.stopIndex, 2)
    }
    await revealHits(award, result.stopIndex, result.hitIndexes, wins)

    // 以服务端/本地结算为准校正当局赢分（报奖过程中已滚动累加）
    const win = result.totalWin ?? 0
    winScore.value = win
    pushSpinHistory(String(result.awardType || 'normal'), win)
    // 押注已消耗，清盘面但不退分
    stakedScore.value = 0
    for (const k of Object.keys(betCounts.value) as BetId[]) betCounts.value[k] = 0
    syncScoreFromWallet()
    enterGambleOrIdle()

    const isSpecial = result.awardType !== 'normal'
    if (win > 0) {
      if (!isSpecial) {
        playFruitSfx('win')
        if (win >= cost * 20) playFruitSfx('coin')
      } else if (win >= cost * 10) {
        playFruitSfx('coin')
      }
    } else if (result.awardType !== 'luck_eat') {
      playFruitSfx('lose')
      setFruitBgmDuck(false)
    }

    await sleep(isSpecial ? 400 : 500)
  } catch (e) {
    stopFruitGo()
    setFruitBgmDuck(false)
    flashAll.value = false
    stageMode.value = 'idle'
    clearCenterHit()
    try {
      await walletStore.fetchBalance()
      stakedScore.value = 0
      for (const k of Object.keys(betCounts.value) as BetId[]) betCounts.value[k] = 0
      syncScoreFromWallet()
    } catch {
      // 钱包不可用：把盘面押分退回总积分
      clearBoardBets(true)
    }
    toast(e instanceof Error ? e.message : '开奖失败')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  initFruitMuteFromStorage()
  soundOn.value = !isFruitMuted()
  try {
    await walletStore.fetchBalance()
  } catch {
    /* 未登录时用本地分 */
  }
  if (walletStore.balance <= 0) {
    // 演示初始分
    walletStore.balance = 10000
  }
  syncScoreFromWallet()
})

watch([stageMode, flashAll], () => {
  syncTitleMarquee()
})

onUnmounted(() => {
  stopBetHold()
  stopTitleMarquee()
  stopFruitBgm()
})
</script>

<style scoped>
.cabinet-page {
  position: relative;
  width: 100%;
  max-width: none;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  overflow: hidden;
  background: #2a0c10;
}

.cabinet-ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  display: block;
}

.cabinet-stage {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  width: 100%;
  max-width: 480px;
  height: 100%;
}

.cabinet-body {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  user-select: none;
  -webkit-user-drag: none;
  display: block;
  pointer-events: none;
}

/* 「水果机」上方弧槽跑马灯：常灭暗泡，报奖追跑 */
.title-marquee {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.title-marquee-bulb {
  position: absolute;
  border-radius: 50%;
  box-sizing: border-box;
  /* 未亮：老柜机暗泡/空灯座 */
  background: radial-gradient(circle at 35% 30%, #5a4830 0%, #2a1c10 55%, #120c08 100%);
  border: 1px solid rgba(80, 55, 25, 0.85);
  box-shadow: inset 0 1px 2px rgba(255, 220, 150, 0.12);
  opacity: 0.85;
}

.title-marquee-bulb.lit {
  background: radial-gradient(circle at 35% 28%, #fff8d0 0%, #ffe566 28%, #ffb020 62%, #c86800 100%);
  border-color: rgba(255, 210, 80, 0.95);
  box-shadow:
    0 0 6px 2px rgba(255, 200, 60, 0.95),
    0 0 14px 4px rgba(255, 140, 20, 0.65),
    inset 0 0 4px rgba(255, 255, 220, 0.85);
  opacity: 1;
}

.fruit-tv-screen {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}

.fruit-ring {
  position: absolute;
  z-index: 2;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  display: block;
}

.ring-cell {
  position: absolute;
  z-index: 3;
  border-radius: 10px;
  box-sizing: border-box;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.05s linear, box-shadow 0.05s linear, background 0.05s linear;
}

.ring-cell.active {
  opacity: 1;
  background: rgba(255, 230, 80, 0.28);
  box-shadow:
    inset 0 0 0 3px rgba(255, 220, 60, 0.95),
    0 0 14px 4px rgba(255, 200, 40, 0.75);
}

.ring-cell.hit {
  opacity: 1;
  background: rgba(255, 120, 40, 0.35);
  box-shadow:
    inset 0 0 0 3px rgba(255, 160, 40, 0.95),
    0 0 16px 5px rgba(255, 100, 20, 0.65);
}

.ring-cell.train {
  opacity: 1;
  background: rgba(80, 220, 255, 0.35);
  box-shadow:
    inset 0 0 0 3px rgba(120, 240, 255, 1),
    0 0 18px 6px rgba(40, 200, 255, 0.8);
}

.ring-cell.flash {
  opacity: 1 !important;
  background: rgba(255, 240, 120, 0.45);
  box-shadow:
    inset 0 0 0 3px #ffe566,
    0 0 22px 8px rgba(255, 200, 40, 0.85);
}

.led-score,
.led-bet {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
  box-sizing: border-box;
  overflow: visible;
  padding: 0;
}

.seg-digit {
  display: block;
  height: 78%;
  width: auto;
  aspect-ratio: 10 / 16;
  flex: 0 0 auto;
  max-width: none;
  overflow: visible;
}

.led-score .seg-digit {
  height: 70%;
  margin: 0 1px;
}

.led-bet .seg-digit {
  height: 80%;
  margin: 0 1px;
}

.ctrl-btn,
.bet-btn,
.mult-btn {
  position: absolute;
  z-index: 3;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  user-select: none;
  transition: transform 0.08s ease, filter 0.08s ease;
}

.ctrl-btn img,
.bet-btn img,
.mult-btn img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.ctrl-btn:active:not(:disabled),
.bet-btn:active:not(:disabled),
.mult-btn:active:not(:disabled) {
  transform: scale(0.94);
  filter: brightness(0.9);
}

.ctrl-btn:disabled,
.bet-btn:disabled,
.mult-btn:disabled {
  cursor: default;
}

/* 有当局赢分时可按大/小再赌 */
.ctrl-btn.gambleHint {
  animation: gamblePulse 0.9s ease-in-out infinite alternate;
  filter: brightness(1.15) drop-shadow(0 0 8px rgba(255, 220, 80, 0.85));
}

@keyframes gamblePulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.06);
  }
}

.bet-btn.selected {
  filter: brightness(1.12) drop-shadow(0 0 6px rgba(255, 200, 60, 0.7));
}

.mult-btn {
  border-radius: 8px;
  transition: transform 0.08s ease, filter 0.08s ease, box-shadow 0.12s ease;
}

.mult-btn img {
  border-radius: inherit;
}

.mult-btn.active {
  z-index: 4;
  box-shadow:
    0 0 0 2px rgba(219, 58, 1, 0.95),
    0 0 6px 2px rgba(219, 58, 1, 0.7),
    0 0 0 4px #ffce03,
    0 0 0 7px rgba(219, 58, 1, 0.55),
    0 0 14px 6px rgba(219, 58, 1, 0.55);
}

/* 与大厅一致的金圈顶栏按钮 */
.fruit-top-btn {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  z-index: 100;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 0;
  color: transparent;
  border: none;
  background-color: transparent;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  transition: transform 0.15s, filter 0.18s;
}

.fruit-top-btn:active {
  transform: scale(0.92);
  filter: brightness(1.18);
}

.lobby-back.fruit-top-btn {
  left: 12px;
  background-image: url('/images/back-button.svg');
}

.fruit-top-right {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  right: 12px;
  z-index: 100;
  display: flex;
  gap: 8px;
}

.fruit-top-right .fruit-top-btn {
  position: static;
}

.fruit-top-btn--history {
  background-image: url('/images/history-button.svg');
}

.fruit-top-btn--rules {
  background-image: url('/images/rules-button.svg');
}

.fruit-top-btn--sound-on {
  background-image: url('/images/sound-on-button.svg');
}

.fruit-top-btn--sound-off {
  background-image: url('/images/sound-off-button.svg');
}

.fruit-modal {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
}

.fruit-modal-card {
  width: min(92vw, 380px);
  max-height: min(72vh, 520px);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(244, 211, 107, 0.4);
  background: linear-gradient(180deg, #2a1c10 0%, #140e08 100%);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  color: #f5e6c8;
}

.fruit-modal-card--rules {
  max-height: min(78vh, 580px);
}

.fruit-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(244, 211, 107, 0.22);
}

.fruit-modal-head h3 {
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.12em;
  color: #ffe7a0;
}

.fruit-modal-close {
  border: 1px solid rgba(244, 211, 107, 0.35);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  color: #f5e0c0;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.fruit-modal-empty {
  padding: 36px 16px;
  text-align: center;
  color: rgba(245, 224, 192, 0.55);
  font-size: 13px;
}

.fruit-history-list {
  padding: 8px 12px 14px;
}

.fruit-history-row {
  display: grid;
  grid-template-columns: 72px 1fr 64px;
  gap: 8px;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid rgba(244, 211, 107, 0.12);
  font-size: 13px;
}

.fh-time {
  color: rgba(245, 224, 192, 0.55);
  font-variant-numeric: tabular-nums;
}

.fh-award {
  color: #ffe7a0;
}

.fh-win {
  text-align: right;
  color: rgba(245, 224, 192, 0.55);
  font-variant-numeric: tabular-nums;
}

.fh-win.plus {
  color: #7dff9a;
  font-weight: 700;
}

.fruit-rules-body {
  padding: 12px 16px 18px;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(245, 230, 200, 0.88);
}

.fruit-rules-body p {
  margin: 0 0 10px;
}

.fruit-rules-body b {
  color: #ffe7a0;
  font-weight: 700;
}
</style>
