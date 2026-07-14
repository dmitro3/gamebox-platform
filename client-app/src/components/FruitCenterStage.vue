<template>
  <div class="fcs" :class="[`mode-${mode}`, `skin-${skin}`]" aria-live="polite">
    <!--
      整块就是底图大金框内侧的电视屏。
      不另画金边；外圈金框用机柜底图，本组件只负责「屏内」播放。
    -->
    <div class="fcs-screen">
      <!-- 分镜动画底板（舞台场景）；数字/水果/文案由上面 HTML 叠加 -->
      <div
        v-if="sheetReady"
        class="fcs-sheet"
        :style="sheetStyle"
        aria-hidden="true"
      />

      <!-- 常驻：完整 UI 分镜；只叠倍数 / 总投注数字到 LED 窗 -->
      <div v-if="mode === 'idle'" class="fcs-panel fcs-idle">
        <div class="fcs-idle-mult">X{{ mult }}</div>
        <div class="fcs-idle-stake">{{ totalStake }}</div>
      </div>

      <!-- 猜大小：完整 UI 分镜精灵表；仅中央叠可跳动的数字 -->
      <div v-else-if="mode === 'gamble_roll'" class="fcs-panel fcs-gamble">
        <div class="fcs-roll">{{ rollDisplay }}</div>
      </div>

      <!-- 猜中 / 猜错 / 和局：结果分镜精灵表；仅叠最终点数 -->
      <div
        v-else-if="mode === 'gamble_win' || mode === 'gamble_lose' || mode === 'gamble_push'"
        class="fcs-panel fcs-gamble-result"
        :class="mode"
      >
        <div class="fcs-roll locked">{{ gambleResult ?? rollDisplay }}</div>
      </div>

      <!-- 大奖 / 报奖：符号分镜动画 + 赢分数字；奖名由分镜场景表达 -->
      <div v-else-if="mode === 'award'" class="fcs-panel fcs-award">
        <div class="fcs-icon-wrap" :class="{ small: hitSize === 'small' }">
          <div
            v-if="symbolSheetReady"
            class="fcs-icon-sheet"
            :style="symbolSheetStyle"
            role="img"
            :aria-label="hitLabel || awardTitle"
          />
          <img
            v-else-if="hitIcon"
            class="fcs-icon"
            :src="hitIcon"
            :alt="hitLabel || ''"
            draggable="false"
          />
          <div v-else class="fcs-icon-placeholder" />
        </div>
        <div class="fcs-win">{{ winAmount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { FruitAwardType, FruitBetSymbolId } from '@gamebox/shared'
import {
  CENTER_SHEETS,
  CENTER_SYMBOL_SHEETS,
  awardTitleForCenter,
  centerKindUrl,
  centerSheetKeyForMode,
  centerSymbolSheetKey,
  centerSymbolUrl,
  type CenterSheetSpec,
  type CenterStageMode,
} from '@/games/slots/fruitCenterAssets'

const props = withDefaults(
  defineProps<{
    mode: CenterStageMode
    mult: number
    totalStake: number
    winAmount: number
    gambleResult?: number | null
    awardType?: FruitAwardType | 'bar' | 'normal' | string
    hitSymbol?: FruitBetSymbolId | 'luck' | null
    hitSize?: 'big' | 'small' | 'luck'
    hitKind?: string | null
    hitLabel?: string
  }>(),
  {
    gambleResult: null,
    awardType: 'normal',
    hitSymbol: null,
    hitSize: 'big',
    hitKind: null,
    hitLabel: '',
  },
)

const rollDisplay = ref(7)
const sheetReady = ref(false)
const frameIndex = ref(0)
const activeSheet = ref<CenterSheetSpec | null>(null)
const symbolSheetReady = ref(false)
const symbolFrameIndex = ref(0)
const activeSymbolSheet = ref<CenterSheetSpec | null>(null)

let rollTimer: ReturnType<typeof setInterval> | null = null
let sheetTimer: ReturnType<typeof setInterval> | null = null
let symbolSheetTimer: ReturnType<typeof setInterval> | null = null
const sheetCache = new Map<string, boolean>()

const skin = computed(() => {
  if (props.mode !== 'award') return 'none'
  const t = props.awardType || 'normal'
  if (t === 'bar' || props.hitSymbol === 'bar') return 'bar'
  if (t === 'train' || t === 'big3' || t === 'small3' || t === 'four' || t === 'slam') return t
  if (t === 'luck_send' || t === 'luck_eat') return 'luck'
  return 'normal'
})

const awardTitle = computed(() => {
  if (props.awardType === 'bar' || props.hitSymbol === 'bar') {
    return props.hitLabel || '天门'
  }
  if (props.awardType === 'normal' && props.hitLabel) {
    return props.hitLabel
  }
  return awardTitleForCenter(props.awardType || 'normal')
})

const hitIcon = computed(() => {
  if (props.hitKind) return centerKindUrl(props.hitKind)
  if (props.hitSymbol) return centerSymbolUrl(props.hitSymbol, props.hitSize)
  if (props.mode === 'award' && (props.awardType === 'luck_send' || props.awardType === 'luck_eat')) {
    return centerSymbolUrl('luck', 'luck')
  }
  return ''
})

const sheetStyle = computed(() => {
  const spec = activeSheet.value
  if (!spec || !sheetReady.value) return {}
  const total = spec.cols * spec.rows
  const idx = Math.min(frameIndex.value, total - 1)
  const col = idx % spec.cols
  const row = Math.floor(idx / spec.cols)
  return {
    backgroundImage: `url(${spec.url})`,
    backgroundSize: `${spec.cols * 100}% ${spec.rows * 100}%`,
    backgroundPosition: `${(col / Math.max(1, spec.cols - 1)) * 100}% ${(row / Math.max(1, spec.rows - 1)) * 100}%`,
  }
})

const symbolSheetStyle = computed(() => {
  const spec = activeSymbolSheet.value
  if (!spec || !symbolSheetReady.value) return {}
  const total = spec.cols * spec.rows
  const idx = Math.min(symbolFrameIndex.value, total - 1)
  const col = idx % spec.cols
  const row = Math.floor(idx / spec.cols)
  return {
    backgroundImage: `url(${spec.url})`,
    backgroundSize: `${spec.cols * 100}% ${spec.rows * 100}%`,
    backgroundPosition: `${(col / Math.max(1, spec.cols - 1)) * 100}% ${(row / Math.max(1, spec.rows - 1)) * 100}%`,
  }
})

function probeSheet(url: string): Promise<boolean> {
  if (sheetCache.has(url)) return Promise.resolve(sheetCache.get(url)!)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      sheetCache.set(url, true)
      resolve(true)
    }
    img.onerror = () => {
      sheetCache.set(url, false)
      resolve(false)
    }
    img.src = url
  })
}

function stopSheet() {
  if (sheetTimer) {
    clearInterval(sheetTimer)
    sheetTimer = null
  }
  sheetReady.value = false
  activeSheet.value = null
  frameIndex.value = 0
}

function stopSymbolSheet() {
  if (symbolSheetTimer) {
    clearInterval(symbolSheetTimer)
    symbolSheetTimer = null
  }
  symbolSheetReady.value = false
  activeSymbolSheet.value = null
  symbolFrameIndex.value = 0
}

async function startSheetForCurrentMode() {
  stopSheet()
  const key = centerSheetKeyForMode(props.mode, String(props.awardType || ''))
  if (!key) return
  const spec = CENTER_SHEETS[key]
  if (!spec) return
  const ok = await probeSheet(spec.url)
  if (!ok) return
  if (centerSheetKeyForMode(props.mode, String(props.awardType || '')) !== key) return

  activeSheet.value = spec
  sheetReady.value = true
  frameIndex.value = 0
  const total = spec.cols * spec.rows
  sheetTimer = setInterval(() => {
    if (!activeSheet.value) return
    const next = frameIndex.value + 1
    if (next >= total) {
      if (spec.loop) frameIndex.value = 0
      else {
        frameIndex.value = total - 1
        if (sheetTimer) {
          clearInterval(sheetTimer)
          sheetTimer = null
        }
      }
    } else {
      frameIndex.value = next
    }
  }, Math.max(30, Math.round(1000 / spec.fps)))
}

async function startSymbolSheet() {
  stopSymbolSheet()
  if (props.mode !== 'award') return
  const key = centerSymbolSheetKey(props.hitSymbol)
  if (!key) return
  const spec = CENTER_SYMBOL_SHEETS[key]
  if (!spec) return
  const ok = await probeSheet(spec.url)
  if (!ok) return
  if (props.mode !== 'award' || centerSymbolSheetKey(props.hitSymbol) !== key) return

  activeSymbolSheet.value = spec
  symbolSheetReady.value = true
  symbolFrameIndex.value = 0
  const total = spec.cols * spec.rows
  symbolSheetTimer = setInterval(() => {
    if (!activeSymbolSheet.value) return
    const next = symbolFrameIndex.value + 1
    if (next >= total) {
      if (spec.loop) symbolFrameIndex.value = 0
      else {
        symbolFrameIndex.value = total - 1
        if (symbolSheetTimer) {
          clearInterval(symbolSheetTimer)
          symbolSheetTimer = null
        }
      }
    } else {
      symbolFrameIndex.value = next
    }
  }, Math.max(30, Math.round(1000 / spec.fps)))
}

function startRoll() {
  stopRoll()
  rollTimer = setInterval(() => {
    let n = 1 + Math.floor(Math.random() * 13)
    if (n === rollDisplay.value) n = (n % 13) + 1
    rollDisplay.value = n
  }, 42)
}

function stopRoll() {
  if (rollTimer) {
    clearInterval(rollTimer)
    rollTimer = null
  }
}

watch(
  () => [props.mode, props.awardType] as const,
  ([m]) => {
    void startSheetForCurrentMode()
    void startSymbolSheet()
    if (m === 'gamble_roll') startRoll()
    else stopRoll()
    if (m === 'gamble_win' || m === 'gamble_lose' || m === 'gamble_push') {
      if (props.gambleResult != null) rollDisplay.value = props.gambleResult
    }
    if (m !== 'award') stopSymbolSheet()
  },
  { immediate: true },
)

watch(
  () => [props.hitSymbol, props.hitKind, props.hitLabel] as const,
  () => {
    void startSymbolSheet()
  },
)

onMounted(() => {
  if (props.mode === 'gamble_roll') startRoll()
})

onUnmounted(() => {
  stopRoll()
  stopSheet()
  stopSymbolSheet()
})
</script>

<style scoped>
/* 外层对齐底图大金框内侧黑屏；不画额外金边 */
.fcs {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
  box-sizing: border-box;
  background: transparent;
}

/*
 * 电视画面填满黑屏。
 * 四周会被上层 24 格挡住；主 UI 居中，从透明洞看见。
 */
.fcs-screen {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 42%, #14100a 0%, #050505 58%, #000 100%);
}

.fcs-sheet {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-repeat: no-repeat;
  opacity: 0.95;
  filter: saturate(1.05) contrast(1.04);
  pointer-events: none;
}

.mode-gamble_roll .fcs-sheet,
.mode-gamble_win .fcs-sheet,
.mode-gamble_lose .fcs-sheet,
.mode-gamble_push .fcs-sheet,
.mode-idle .fcs-sheet {
  opacity: 1;
  filter: none;
}

.fcs-screen:has(.fcs-sheet) {
  background: #000;
}

.fcs-panel {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8% 6% 10%;
  box-sizing: border-box;
  text-align: center;
}

.fcs-idle {
  padding: 0;
  position: relative;
  justify-content: stretch;
  align-items: stretch;
}

/* 数字对准 idle UI 分镜里的上下两个 LED 窗 */
.fcs-idle-mult,
.fcs-idle-stake {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', Consolas, monospace;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #7dff9a;
  text-shadow:
    0 0 6px rgba(40, 255, 120, 0.95),
    0 0 16px rgba(20, 200, 90, 0.55);
  pointer-events: none;
}

.fcs-idle-mult {
  top: 19%;
  height: 18%;
  font-size: clamp(22px, 7.2vw, 42px);
}

.fcs-idle-stake {
  top: 53%;
  height: 20%;
  font-size: clamp(26px, 8.5vw, 48px);
  color: #8cffb0;
}

.fcs-gamble,
.fcs-gamble-result {
  /* 整屏是精灵 UI；只把数字对准中央圆孔 */
  justify-content: center;
  align-items: center;
  padding: 0;
  flex-direction: column;
}

.fcs-roll {
  width: auto;
  min-width: 22%;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(48px, 16vw, 96px);
  line-height: 1;
  color: #e8fff8;
  text-align: center;
  text-shadow:
    0 0 14px #40ffe0,
    0 0 32px rgba(0, 220, 200, 0.55),
    0 3px 0 rgba(0, 0, 0, 0.65);
  transform: translateY(-2%);
}

.fcs-roll.locked {
  color: #fff8d0;
  text-shadow:
    0 0 14px #ffd040,
    0 0 34px rgba(255, 180, 0, 0.65),
    0 3px 0 rgba(0, 0, 0, 0.65);
}

.fcs-gamble-result.gamble_lose .fcs-roll.locked {
  color: #ffd0d0;
  text-shadow:
    0 0 14px #ff5050,
    0 0 28px rgba(255, 40, 40, 0.45),
    0 3px 0 rgba(0, 0, 0, 0.65);
}

.fcs-gamble-result.gamble_win .fcs-roll.locked {
  animation: fcsFlash 0.35s ease-out;
}

.fcs-award {
  padding: 10% 6% 12%;
  gap: 4%;
  justify-content: center;
}

.fcs-icon-wrap {
  width: 48%;
  aspect-ratio: 1;
  border: none;
  background: transparent;
  box-shadow: none;
  display: grid;
  place-items: center;
  overflow: visible;
}

.fcs-icon-wrap.small {
  width: 38%;
}

.fcs-icon-sheet {
  width: 100%;
  height: 100%;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 16px rgba(255, 190, 60, 0.6));
}

.fcs-icon {
  width: 50%;
  height: 50%;
  object-fit: cover;
  object-position: left top;
  filter: drop-shadow(0 0 16px rgba(255, 190, 60, 0.6));
}

.fcs-icon-placeholder {
  width: 40%;
  height: 40%;
  border-radius: 50%;
  background: rgba(255, 200, 80, 0.12);
}

.fcs-win {
  margin-top: 2%;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(28px, 9vw, 52px);
  line-height: 1;
  color: #fff4c0;
  text-shadow:
    0 0 10px #ffc040,
    0 0 24px rgba(255, 160, 0, 0.55);
}

@keyframes fcsFlash {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.35);
  }
}
</style>
