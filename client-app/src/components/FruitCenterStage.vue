<template>
  <div class="fcs" :class="[`mode-${mode}`, `skin-${skin}`]" aria-live="polite">
    <!-- 可选视频底板（有素材才显示） -->
    <video
      v-if="bgVideo && videoOk"
      class="fcs-video"
      :src="bgVideo"
      autoplay
      muted
      loop
      playsinline
      @error="onVideoError"
    />

    <div class="fcs-rim" aria-hidden="true" />
    <div class="fcs-glow" aria-hidden="true" />

    <!-- 常驻：倍数 + 总投注 -->
    <div v-if="mode === 'idle'" class="fcs-panel fcs-idle">
      <div class="fcs-caption">当前倍数</div>
      <div class="fcs-mult" :key="mult">X{{ mult }}</div>
      <div class="fcs-eq">=</div>
      <div class="fcs-stake" :key="totalStake">{{ totalStake }}</div>
      <div class="fcs-caption dim">总投注</div>
      <div class="fcs-formula">X{{ mult }} = {{ totalStake }}</div>
    </div>

    <!-- 猜大小：乱跳 -->
    <div v-else-if="mode === 'gamble_roll'" class="fcs-panel fcs-gamble">
      <div class="fcs-side left">小<br /><span>1-6</span></div>
      <div class="fcs-roll">{{ rollDisplay }}</div>
      <div class="fcs-side right">大<br /><span>8-13</span></div>
      <div class="fcs-hint">猜大小 · 翻倍或清零</div>
    </div>

    <!-- 猜中 / 猜错 / 和局 -->
    <div
      v-else-if="mode === 'gamble_win' || mode === 'gamble_lose' || mode === 'gamble_push'"
      class="fcs-panel fcs-gamble-result"
      :class="mode"
    >
      <div class="fcs-result-title">
        {{ mode === 'gamble_win' ? '猜中！' : mode === 'gamble_lose' ? '未中' : '和局' }}
      </div>
      <div class="fcs-roll locked">{{ gambleResult ?? rollDisplay }}</div>
      <div class="fcs-result-sub">
        {{
          mode === 'gamble_win'
            ? '赢分翻倍'
            : mode === 'gamble_lose'
              ? '当局赢分清零'
              : '再猜一次'
        }}
      </div>
    </div>

    <!-- 大奖 / 报奖 -->
    <div v-else-if="mode === 'award'" class="fcs-panel fcs-award">
      <div class="fcs-award-title">{{ awardTitle }}</div>
      <div class="fcs-icon-wrap" :class="{ pop: iconPop }">
        <img
          v-if="hitIcon"
          class="fcs-icon"
          :src="hitIcon"
          :alt="hitLabel || ''"
          draggable="false"
        />
        <div v-else class="fcs-icon-placeholder" />
      </div>
      <div v-if="hitLabel" class="fcs-hit-label">{{ hitLabel }}</div>
      <div class="fcs-win">{{ winAmount }}</div>
      <div class="fcs-caption dim">当局赢分</div>
      <div v-if="skin === 'train'" class="fcs-train-stripe" aria-hidden="true" />
      <div v-if="skin === 'slam'" class="fcs-rain" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { FruitAwardType, FruitBetSymbolId } from '@gamebox/shared'
import {
  CENTER_VIDEO,
  awardTitleForCenter,
  awardVideoKey,
  centerKindUrl,
  centerSymbolUrl,
  type CenterStageMode,
} from '@/games/slots/fruitCenterAssets'

const props = withDefaults(
  defineProps<{
    mode: CenterStageMode
    mult: number
    totalStake: number
    winAmount: number
    /** 猜大小乱跳时展示用；结果态用 gambleResult 定格 */
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

const videoOk = ref(true)
const rollDisplay = ref(7)
const iconPop = ref(false)
let rollTimer: ReturnType<typeof setInterval> | null = null
let popTimer: ReturnType<typeof setTimeout> | null = null

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

const bgVideo = computed(() => {
  if (props.mode === 'idle') return CENTER_VIDEO.idle
  if (props.mode === 'gamble_roll') return CENTER_VIDEO.gamble_roll
  if (props.mode === 'gamble_win') return CENTER_VIDEO.gamble_win
  if (props.mode === 'gamble_lose') return CENTER_VIDEO.gamble_lose
  if (props.mode === 'award') return CENTER_VIDEO[awardVideoKey(String(props.awardType))]
  return ''
})

function onVideoError() {
  videoOk.value = false
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
  () => props.mode,
  (m) => {
    videoOk.value = true
    if (m === 'gamble_roll') startRoll()
    else stopRoll()
    if (m === 'gamble_win' || m === 'gamble_lose' || m === 'gamble_push') {
      if (props.gambleResult != null) rollDisplay.value = props.gambleResult
    }
  },
  { immediate: true },
)

watch(
  () => [props.hitSymbol, props.hitKind, props.hitLabel] as const,
  () => {
    if (props.mode !== 'award') return
    iconPop.value = false
    requestAnimationFrame(() => {
      iconPop.value = true
      if (popTimer) clearTimeout(popTimer)
      popTimer = setTimeout(() => {
        iconPop.value = false
      }, 280)
    })
  },
)

onMounted(() => {
  if (props.mode === 'gamble_roll') startRoll()
})

onUnmounted(() => {
  stopRoll()
  if (popTimer) clearTimeout(popTimer)
})
</script>

<style scoped>
.fcs {
  position: absolute;
  z-index: 4;
  overflow: hidden;
  border-radius: 4%;
  pointer-events: none;
  box-sizing: border-box;
  isolation: isolate;
  background: radial-gradient(ellipse at 50% 40%, #1a1208 0%, #050505 62%, #000 100%);
}

.fcs-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
  z-index: 0;
}

.fcs-rim {
  position: absolute;
  inset: 2%;
  border-radius: 3.5%;
  border: 1.5px solid rgba(255, 196, 80, 0.35);
  box-shadow:
    inset 0 0 18px rgba(255, 180, 40, 0.18),
    0 0 12px rgba(255, 170, 40, 0.15);
  z-index: 1;
  animation: fcsBreath 4.5s ease-in-out infinite;
}

.fcs-glow {
  position: absolute;
  inset: -20%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 190, 60, 0.12) 40deg,
    transparent 80deg,
    transparent 180deg,
    rgba(80, 200, 255, 0.08) 220deg,
    transparent 280deg
  );
  animation: fcsSpin 12s linear infinite;
  z-index: 0;
  opacity: 0.7;
}

.fcs-panel {
  position: relative;
  z-index: 2;
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

.fcs-caption {
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: clamp(9px, 2.4vw, 14px);
  letter-spacing: 0.2em;
  color: rgba(255, 214, 140, 0.75);
  text-shadow: 0 0 6px rgba(255, 160, 40, 0.35);
}

.fcs-caption.dim {
  opacity: 0.65;
  margin-top: 2%;
  letter-spacing: 0.35em;
}

.fcs-mult {
  margin-top: 2%;
  font-family: Impact, 'Arial Black', 'PingFang SC', sans-serif;
  font-size: clamp(28px, 9vw, 56px);
  line-height: 1;
  font-weight: 800;
  color: #ffe08a;
  text-shadow:
    0 0 8px #ffb020,
    0 0 22px rgba(255, 160, 0, 0.65),
    0 2px 0 #8a4a00;
  animation: fcsPopIn 0.28s ease;
}

.fcs-eq {
  margin: 1% 0;
  font-size: clamp(16px, 4.5vw, 28px);
  color: rgba(255, 220, 140, 0.85);
}

.fcs-stake {
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(26px, 8.5vw, 52px);
  line-height: 1;
  color: #fff6c8;
  text-shadow:
    0 0 10px #ffcc44,
    0 0 24px rgba(255, 180, 0, 0.5);
  animation: fcsPopIn 0.28s ease;
}

.fcs-formula {
  margin-top: 4%;
  font-size: clamp(10px, 2.6vw, 15px);
  color: rgba(180, 220, 255, 0.7);
  letter-spacing: 0.08em;
}

.fcs-gamble {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 2%;
  align-content: center;
}

.fcs-side {
  width: 18%;
  font-size: clamp(12px, 3.2vw, 18px);
  font-weight: 700;
  color: #ffe9a8;
  line-height: 1.25;
  text-shadow: 0 0 8px rgba(255, 180, 40, 0.5);
}

.fcs-side span {
  display: block;
  font-size: 0.7em;
  opacity: 0.7;
  font-weight: 500;
}

.fcs-side.left {
  color: #9fd6ff;
}
.fcs-side.right {
  color: #ffb4b4;
}

.fcs-roll {
  width: 48%;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(40px, 14vw, 84px);
  line-height: 1;
  color: #e8fff8;
  text-shadow:
    0 0 12px #40ffe0,
    0 0 28px rgba(0, 220, 200, 0.55);
}

.fcs-roll.locked {
  width: auto;
  color: #fff8d0;
  text-shadow:
    0 0 12px #ffd040,
    0 0 30px rgba(255, 180, 0, 0.6);
}

.fcs-hint {
  width: 100%;
  margin-top: 4%;
  font-size: clamp(10px, 2.5vw, 14px);
  color: rgba(255, 230, 160, 0.8);
  letter-spacing: 0.12em;
}

.fcs-gamble-result {
  gap: 3%;
}

.fcs-result-title {
  font-size: clamp(22px, 7vw, 40px);
  font-weight: 800;
  letter-spacing: 0.12em;
}

.fcs-gamble-result.gamble_win .fcs-result-title {
  color: #ffe566;
  text-shadow: 0 0 16px #ffb000;
  animation: fcsFlash 0.35s ease-out;
}

.fcs-gamble-result.gamble_lose .fcs-result-title {
  color: #ff6b6b;
  text-shadow: 0 0 14px #ff2020;
  animation: fcsShake 0.45s ease-out;
}

.fcs-gamble-result.gamble_push .fcs-result-title {
  color: #c8d8ff;
}

.fcs-result-sub {
  font-size: clamp(11px, 2.8vw, 16px);
  color: rgba(255, 255, 255, 0.75);
}

.fcs-award-title {
  font-size: clamp(18px, 5.5vw, 34px);
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #ffe7a0;
  text-shadow:
    0 0 10px #ffb020,
    0 2px 0 #6a3a00;
  margin-bottom: 3%;
}

.skin-train .fcs-award-title {
  color: #9ffff0;
  text-shadow: 0 0 12px #20e0ff;
}

.skin-big3 .fcs-award-title,
.skin-small3 .fcs-award-title {
  color: #e0b0ff;
  text-shadow: 0 0 12px #a040ff;
}

.skin-four .fcs-award-title,
.skin-bar .fcs-award-title {
  color: #ffb0b0;
  text-shadow: 0 0 12px #ff4040;
}

.skin-slam .fcs-award-title {
  color: #fff0a0;
  animation: fcsFlash 0.6s ease-in-out infinite alternate;
}

.fcs-icon-wrap {
  width: 34%;
  aspect-ratio: 1;
  border-radius: 16%;
  border: 2px solid rgba(255, 200, 80, 0.55);
  background: radial-gradient(circle at 40% 30%, #2a2210, #0a0a0a 70%);
  box-shadow:
    inset 0 0 12px rgba(255, 180, 40, 0.25),
    0 0 16px rgba(255, 160, 40, 0.25);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.fcs-icon-wrap.pop {
  animation: fcsIconPop 0.28s ease;
}

.fcs-icon {
  width: 88%;
  height: 88%;
  object-fit: contain;
}

.fcs-icon-placeholder {
  width: 40%;
  height: 40%;
  border-radius: 50%;
  background: rgba(255, 200, 80, 0.15);
}

.fcs-hit-label {
  margin-top: 2%;
  font-size: clamp(11px, 2.8vw, 16px);
  color: rgba(255, 240, 200, 0.9);
}

.fcs-win {
  margin-top: 3%;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(24px, 8vw, 48px);
  line-height: 1;
  color: #fff4c0;
  text-shadow:
    0 0 10px #ffc040,
    0 0 24px rgba(255, 160, 0, 0.55);
}

.fcs-train-stripe {
  position: absolute;
  top: 42%;
  left: -30%;
  width: 40%;
  height: 8%;
  background: linear-gradient(90deg, transparent, #6ffff0, transparent);
  filter: blur(2px);
  animation: fcsTrain 1.2s linear infinite;
  z-index: 1;
  pointer-events: none;
}

.fcs-rain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 210, 80, 0.35) 0 1px, transparent 2px);
  background-size: 18px 22px;
  animation: fcsRain 0.8s linear infinite;
  opacity: 0.45;
  z-index: 1;
  pointer-events: none;
}

@keyframes fcsBreath {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

@keyframes fcsSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fcsPopIn {
  from {
    transform: scale(0.86);
    opacity: 0.4;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fcsIconPop {
  0% {
    transform: scale(0.6);
  }
  70% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes fcsFlash {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.35);
  }
}

@keyframes fcsShake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

@keyframes fcsTrain {
  to {
    left: 110%;
  }
}

@keyframes fcsRain {
  to {
    background-position: 0 22px;
  }
}
</style>
