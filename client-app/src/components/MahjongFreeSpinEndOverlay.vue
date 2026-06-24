<template>
  <Transition name="fs-end">
    <div
      v-if="visible"
      class="fs-end-scene"
      role="dialog"
      aria-modal="true"
      aria-label="免费旋转共赢得"
      @click="onSceneClick"
    >
      <!-- 正版 total_win 叠层（自下而上） -->
      <img
        v-if="bgTotal"
        class="fs-end-layer fs-end-layer--total-bg"
        :src="bgTotal"
        alt=""
        draggable="false"
      />

      <img
        v-if="bgGlowBottom"
        class="fs-end-layer fs-end-layer--glow-b"
        :src="bgGlowBottom"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgGlowTop"
        class="fs-end-layer fs-end-layer--glow-a"
        :src="bgGlowTop"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgFlare"
        class="fs-end-layer fs-end-layer--flare"
        :src="bgFlare"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgFg"
        class="fs-end-layer fs-end-layer--fg"
        :src="bgFg"
        alt=""
        draggable="false"
      />

      <div class="fs-end-ui">
        <div class="fs-end-win-holder">
          <img
            v-if="titleImg"
            class="fs-end-title"
            :src="titleImg"
            alt="共赢得"
            draggable="false"
          />
          <div class="fs-end-digits" :aria-label="`共赢得 ${formattedWin}`">
            <div class="fs-end-digits__inner" :style="digitsWrapStyle">
              <span
                v-for="(ch, index) in winChars"
                :key="`${index}-${ch}`"
                class="fs-end-digits__cell"
                :style="digitStyle(ch)"
              />
            </div>
          </div>
        </div>

        <button
          v-show="countComplete"
          type="button"
          class="fs-end-collect"
          @click.stop="emit('confirm')"
          @pointerdown="btnPressed = true"
          @pointerup="btnPressed = false"
          @pointerleave="btnPressed = false"
          @pointercancel="btnPressed = false"
        >
          <img
            class="fs-end-collect__text"
            :src="btnPressed && btnCollectPressed ? btnCollectPressed : btnCollect"
            alt="领奖"
            draggable="false"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { FS_END_DIGIT_H_PCT, digitSpriteStyle } from '../games/mahjong/digitAtlas'

const props = defineProps({
  visible: { type: Boolean, default: false },
  totalWin: { type: Number, default: 0 },
  canvasHeight: { type: Number, default: 640 },
  canvasWidth: { type: Number, default: 360 },
  titleImg: { type: String, default: '' },
  btnCollect: { type: String, default: '' },
  btnCollectPressed: { type: String, default: '' },
  bgTotal: { type: String, default: '' },
  bgGlowTop: { type: String, default: '' },
  bgGlowBottom: { type: String, default: '' },
  bgFlare: { type: String, default: '' },
  bgFg: { type: String, default: '' },
  digitsAtlas: { type: String, default: '' },
  digitDot: { type: String, default: '' },
  digitComma: { type: String, default: '' },
  autoDismissMs: { type: Number, default: 4800 },
  /** 0 = 按金额自动计算时长 */
  countUpMs: { type: Number, default: 0 },
})

const emit = defineEmits<{ confirm: [] }>()

const btnPressed = ref(false)
const displayedWin = ref(0)
const countComplete = ref(false)

let countRaf: number | null = null
let countStart = 0
let countTarget = 0
let countDuration = 0

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t)
}

function countUpDuration(target: number): number {
  if (props.countUpMs > 0) return props.countUpMs
  const mag = Math.log10(Math.max(target, 10))
  return Math.min(3400, Math.max(1800, 1500 + mag * 380))
}

function stopCountUp() {
  if (countRaf != null) {
    cancelAnimationFrame(countRaf)
    countRaf = null
  }
}

function finishCountUp() {
  stopCountUp()
  displayedWin.value = countTarget
  countComplete.value = true
  scheduleAutoDismiss()
}

function scheduleAutoDismiss() {
  clearAutoTimer()
  if (props.visible && countComplete.value && props.autoDismissMs > 0) {
    autoTimer = setTimeout(() => emit('confirm'), props.autoDismissMs)
  }
}

function startCountUp(target: number) {
  stopCountUp()
  clearAutoTimer()
  countTarget = target
  countComplete.value = false
  displayedWin.value = 0
  countDuration = countUpDuration(target)
  countStart = performance.now()

  if (target <= 0) {
    finishCountUp()
    return
  }

  const tick = (now: number) => {
    const t = Math.min(1, (now - countStart) / countDuration)
    displayedWin.value = Math.round(countTarget * easeOutExpo(t) * 100) / 100
    if (t < 1) {
      countRaf = requestAnimationFrame(tick)
    } else {
      finishCountUp()
    }
  }
  countRaf = requestAnimationFrame(tick)
}

function onSceneClick() {
  if (!countComplete.value) {
    finishCountUp()
    return
  }
  emit('confirm')
}

const formattedWin = computed(() =>
  displayedWin.value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
)

const winChars = computed(() => formattedWin.value.split(''))

/** Cocos total_win number_display：实际渲染略小于裸 heightPct */
const digitHeightPx = computed(() =>
  Math.max(20, Math.round(props.canvasHeight * (FS_END_DIGIT_H_PCT / 100))),
)

const digitsWrapStyle = computed(() => {
  const h = digitHeightPx.value
  const charCount = winChars.value.length
  const estWidth = charCount * h * 0.46
  const maxWidth = props.canvasWidth * 0.72
  const scale = Math.min(1, maxWidth / Math.max(estWidth, 1))
  return { transform: `scale(${scale.toFixed(3)})` }
})

function digitStyle(ch: string): Record<string, string> {
  const h = digitHeightPx.value
  const base = digitSpriteStyle(
    ch,
    h,
    props.digitsAtlas,
    props.digitDot,
    props.digitComma,
    'fs-end',
  )
  if (!Object.keys(base).length) return {}
  if (ch === ',' || ch === '.') return base
  return {
    ...base,
    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5))',
  }
}

let autoTimer: ReturnType<typeof setTimeout> | null = null

const clearAutoTimer = () => {
  if (autoTimer) {
    clearTimeout(autoTimer)
    autoTimer = null
  }
}

watch(
  () => [props.visible, props.totalWin] as const,
  ([show, target]) => {
    clearAutoTimer()
    btnPressed.value = false
    if (show) {
      startCountUp(target)
    } else {
      stopCountUp()
      displayedWin.value = 0
      countComplete.value = false
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  clearAutoTimer()
  stopCountUp()
})
</script>

<style scoped>
.fs-end-scene {
  position: absolute;
  inset: 0;
  z-index: 31;
  overflow: hidden;
  cursor: pointer;
  background: #120604;
  animation: fs-end-scene-in 0.35s ease-out both;
}

/* 底部两角暗角：遮住 total_bg 缩放后的亮黄边 */
.fs-end-scene::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 16%;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    to top,
    rgba(18, 6, 4, 0.92) 0%,
    rgba(18, 6, 4, 0.45) 45%,
    transparent 100%
  );
}

.fs-end-layer {
  position: absolute;
  pointer-events: none;
  user-select: none;
}

/* total_bg：scale 3.333 全屏暗底 */
.fs-end-layer--total-bg {
  z-index: 0;
  left: -1.5%;
  top: -10.938%;
  width: 103%;
  height: 121.875%;
  object-fit: cover;
  object-position: center 36%;
}

/* total_glow_b：scale 4，居中偏下 */
.fs-end-layer--glow-b {
  z-index: 1;
  left: -10%;
  top: -0.8%;
  width: 120%;
  height: 49%;
  object-fit: cover;
  object-position: center bottom;
  opacity: 0.75;
  mix-blend-mode: screen;
  /* 避免 glow 在底部两角溢出亮边 */
  clip-path: inset(0 3% 0 3%);
}

/* total_glow_a：顶部放射光 */
.fs-end-layer--glow-a {
  z-index: 2;
  left: 0;
  top: -11%;
  width: 100%;
  height: 76%;
  object-fit: cover;
  object-position: center top;
  mix-blend-mode: screen;
  opacity: 0.88;
  animation: fs-end-glow-pulse 2.8s ease-in-out infinite alternate;
}

/* info_flare_a：标题/金额背后光晕 */
.fs-end-layer--flare {
  z-index: 3;
  left: 50%;
  top: 7.4%;
  width: 102.6%;
  height: 32%;
  transform: translateX(-50%);
  object-fit: cover;
  object-position: center center;
  mix-blend-mode: screen;
  opacity: 0.82;
}

/* total_fg：anchor bottom，topPct 35.788 */
.fs-end-layer--fg {
  z-index: 4;
  left: 50%;
  top: 35.788%;
  width: 100.1%;
  height: 75.149%;
  transform: translateX(-50%);
  object-fit: contain;
  object-position: center bottom;
}

.fs-end-ui {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
}

/* win_holder：top 4.915%, height 26.518% */
.fs-end-win-holder {
  position: absolute;
  left: 50%;
  top: 4.9%;
  width: 60.6%;
  height: 26.5%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  animation: fs-end-win-pop 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.fs-end-title {
  width: 100%;
  max-height: 56%;
  object-fit: contain;
  object-position: center top;
  filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.4));
  flex-shrink: 0;
}

.fs-end-digits {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  margin-top: 2%;
}

.fs-end-digits__inner {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.008em;
  transform-origin: center center;
}

.fs-end-digits__cell {
  flex-shrink: 0;
}

.fs-end-collect {
  position: absolute;
  left: 50%;
  top: 85.4%;
  transform: translateX(-50%);
  width: min(36%, 250px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  animation: fs-end-collect-in 0.45s ease-out 0.22s both;
}

.fs-end-collect__text {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.fs-end-enter-active,
.fs-end-leave-active {
  transition: opacity 0.38s ease;
}

.fs-end-enter-from,
.fs-end-leave-to {
  opacity: 0;
}

@keyframes fs-end-scene-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fs-end-win-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.72); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

@keyframes fs-end-collect-in {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes fs-end-glow-pulse {
  0% { opacity: 0.78; }
  100% { opacity: 0.92; }
}
</style>
