<template>
  <Transition name="fs-trigger">
    <div
      v-if="visible"
      class="fs-trigger-scene"
      role="dialog"
      aria-modal="true"
      aria-label="赢得免费旋转"
      @click="emit('confirm')"
    >
      <img
        v-if="bgGradient"
        class="fs-trigger-layer fs-trigger-layer--gradient"
        :src="bgGradient"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgRays"
        class="fs-trigger-layer fs-trigger-layer--fx fs-trigger-layer--rays"
        :src="bgRays"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgTiles"
        class="fs-trigger-layer fs-trigger-layer--fx fs-trigger-layer--tiles"
        :src="bgTiles"
        alt=""
        draggable="false"
      />
      <img
        v-if="bgCoins"
        class="fs-trigger-layer fs-trigger-layer--fx fs-trigger-layer--coins"
        :src="bgCoins"
        alt=""
        draggable="false"
      />

      <div class="fs-trigger-ui" @click.stop>
        <img
          v-if="titleImg"
          class="fs-trigger-title"
          :src="titleImg"
          alt="赢得免费旋转"
          draggable="false"
        />

        <div class="fs-trigger-digits" :aria-label="`${spinsAwarded} 次免费旋转`">
          <span v-if="isRetrigger" class="fs-trigger-digits__plus">+</span>
          <span
            v-for="(digit, index) in digitChars"
            :key="`${digit}-${index}`"
            class="fs-trigger-digits__cell"
            :style="digitStyle(digit)"
          />
        </div>

        <img
          v-if="subtitleImg"
          class="fs-trigger-subtitle"
          :src="subtitleImg"
          alt="获得的奖金乘数将翻倍"
          draggable="false"
        />

        <button
          type="button"
          class="fs-trigger-start"
          @click="emit('confirm')"
          @pointerdown="btnPressed = true"
          @pointerup="btnPressed = false"
          @pointerleave="btnPressed = false"
          @pointercancel="btnPressed = false"
        >
          <img
            class="fs-trigger-start__text"
            :src="btnPressed && btnStartPressed ? btnStartPressed : btnStart"
            alt="开始"
            draggable="false"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { digitSpriteStyle } from '@/games/mahjong/digitAtlas'

const props = defineProps({
  visible: { type: Boolean, default: false },
  spinsAwarded: { type: Number, default: 12 },
  isRetrigger: { type: Boolean, default: false },
  /** 画布渲染高度（px），用于换算 Cocos number_display 字号 */
  canvasHeight: { type: Number, default: 640 },
  titleImg: { type: String, default: '' },
  subtitleImg: { type: String, default: '' },
  btnStart: { type: String, default: '' },
  btnStartPressed: { type: String, default: '' },
  bgGradient: { type: String, default: '' },
  bgRays: { type: String, default: '' },
  bgTiles: { type: String, default: '' },
  bgCoins: { type: String, default: '' },
  digitsAtlas: { type: String, default: '' },
  autoDismissMs: { type: Number, default: 3200 },
})

const emit = defineEmits<{ confirm: [] }>()

const btnPressed = ref(false)

const digitChars = computed(() => String(Math.max(0, props.spinsAwarded)).split(''))

/** Cocos number_display heightPct ≈ 14.792 */
const digitHeightPx = computed(() =>
  Math.max(28, Math.round(props.canvasHeight * 0.14792)),
)

function digitStyle(digit: string): Record<string, string> {
  const base = digitSpriteStyle(digit, digitHeightPx.value, props.digitsAtlas)
  if (!Object.keys(base).length) return {}
  return {
    ...base,
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45))',
  }
}

const effectiveAutoDismissMs = computed(() =>
  props.isRetrigger ? Math.min(props.autoDismissMs, 2600) : props.autoDismissMs,
)

let autoTimer: ReturnType<typeof setTimeout> | null = null

const clearAutoTimer = () => {
  if (autoTimer) {
    clearTimeout(autoTimer)
    autoTimer = null
  }
}

watch(
  () => props.visible,
  (show) => {
    clearAutoTimer()
    btnPressed.value = false
    if (show && effectiveAutoDismissMs.value > 0) {
      autoTimer = setTimeout(() => emit('confirm'), effectiveAutoDismissMs.value)
    }
  },
  { immediate: true },
)

onUnmounted(clearAutoTimer)
</script>

<style scoped>
.fs-trigger-scene {
  position: absolute;
  inset: 0;
  z-index: 30;
  overflow: hidden;
  cursor: pointer;
  background: #120404;
  animation: fs-scene-in 0.35s ease-out both;
}

.fs-trigger-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.fs-trigger-layer--gradient {
  object-fit: cover;
  object-position: center center;
  z-index: 0;
}

.fs-trigger-layer--fx {
  object-fit: cover;
  object-position: center center;
  z-index: 1;
}

.fs-trigger-layer--rays {
  mix-blend-mode: screen;
  opacity: 0.92;
  animation: fs-rays-pulse 2.4s ease-in-out infinite alternate;
}

.fs-trigger-layer--tiles {
  object-position: center 58%;
  opacity: 0.98;
}

.fs-trigger-layer--coins {
  object-position: center 40%;
  opacity: 0.88;
  animation: fs-coins-drift 3.6s ease-in-out infinite alternate;
}

.fs-trigger-ui {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.fs-trigger-title {
  position: absolute;
  left: 50%;
  top: 14.26%;
  width: min(85.8%, 662px);
  transform: translateX(-50%);
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35));
  animation: fs-title-pop 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.fs-trigger-digits {
  position: absolute;
  left: 50%;
  top: 30.6%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.04em;
  height: 14.8%;
  min-height: 48px;
  animation: fs-digits-pop 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) 0.08s both;
}

.fs-trigger-digits__plus {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: clamp(36px, 9vw, 72px);
  line-height: 1;
  color: #fff6c8;
  text-shadow:
    0 3px 0 rgba(80, 35, 4, 0.9),
    0 0 18px rgba(255, 215, 0, 0.75);
  margin-right: 0.08em;
}

.fs-trigger-digits__cell {
  flex-shrink: 0;
}

.fs-trigger-subtitle {
  position: absolute;
  left: 50%;
  top: 60.2%;
  width: min(88.6%, 669px);
  transform: translateX(-50%);
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
  animation: fs-subtitle-in 0.45s ease-out 0.15s both;
}

.fs-trigger-start {
  position: absolute;
  left: 50%;
  top: 77.3%;
  transform: translateX(-50%);
  width: min(21%, 168px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  animation: fs-start-in 0.45s ease-out 0.22s both;
}

.fs-trigger-start__text {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}

.fs-trigger-enter-active,
.fs-trigger-leave-active {
  transition: opacity 0.35s ease;
}

.fs-trigger-enter-from,
.fs-trigger-leave-to {
  opacity: 0;
}

@keyframes fs-scene-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fs-title-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.72); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

@keyframes fs-digits-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

@keyframes fs-subtitle-in {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes fs-start-in {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes fs-rays-pulse {
  0% { opacity: 0.78; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.03); }
}

@keyframes fs-coins-drift {
  0% { transform: translateY(0); opacity: 0.82; }
  100% { transform: translateY(-2%); opacity: 0.95; }
}
</style>
