<template>
  <Transition name="fs-trigger">
    <div
      v-if="visible"
      class="fs-trigger-mask"
      role="dialog"
      aria-modal="true"
      :aria-label="titleText"
      @click="emit('confirm')"
    >
      <div class="fs-trigger-panel" @click.stop>
        <img v-if="panelBg" class="fs-trigger-panel-bg" :src="panelBg" alt="" />
        <div v-if="!panelBg" class="fs-trigger-rays" aria-hidden="true" />

        <div class="fs-trigger-body">
          <img :src="`${symBase}/hu.png`" class="fs-trigger-hu" alt="" />
          <h2 class="fs-trigger-title">{{ titleText }}</h2>
          <p class="fs-trigger-sub">{{ scatterCount }} 个「胡」符号</p>
          <div class="fs-trigger-count">
            <span class="fs-trigger-count__plus" v-if="isRetrigger">+</span>
            <span class="fs-trigger-count__num">{{ spinsAwarded }}</span>
            <span class="fs-trigger-count__label">次免费旋转</span>
          </div>
          <p v-if="isRetrigger && remainingAfter >= 0" class="fs-trigger-sub fs-trigger-sub--total">
            继续后剩余 {{ totalAfterAward }} 次
          </p>
          <p v-if="!isRetrigger" class="fs-trigger-note">连击倍数 ×2 → ×4 → ×6 → ×10</p>
          <button type="button" class="fs-trigger-btn" @click="emit('confirm')">
            {{ isRetrigger ? '继续' : '开始' }}
          </button>
          <p class="fs-trigger-hint">点击任意处继续</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  scatterCount: { type: Number, default: 3 },
  spinsAwarded: { type: Number, default: 12 },
  isRetrigger: { type: Boolean, default: false },
  remainingAfter: { type: Number, default: 0 },
  symBase: { type: String, default: '/images/games/mahjong/classic/symbols' },
  panelBg: { type: String, default: '' },
  autoDismissMs: { type: Number, default: 3200 },
})

const emit = defineEmits<{ confirm: [] }>()

const titleText = computed(() =>
  props.isRetrigger ? '免费旋转再触发！' : '恭喜获得免费旋转！',
)

const totalAfterAward = computed(() => props.remainingAfter + props.spinsAwarded)

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
    if (show && effectiveAutoDismissMs.value > 0) {
      autoTimer = setTimeout(() => emit('confirm'), effectiveAutoDismissMs.value)
    }
  },
  { immediate: true },
)

onUnmounted(clearAutoTimer)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+QingKe+HuangYou&display=swap');

.fs-trigger-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 2, 2, 0.72);
  backdrop-filter: blur(3px);
  cursor: pointer;
}

.fs-trigger-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 88%;
  max-width: 440px;
  padding: 0;
  border-radius: 16px;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  background: linear-gradient(180deg, #8b1a1a 0%, #4a0a0a 55%, #2a0505 100%);
  border: 3px solid #ffd700;
  box-shadow:
    0 0 40px rgba(255, 215, 0, 0.35),
    0 12px 32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 240, 200, 0.15);
  cursor: default;
  animation: fs-panel-pop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both;
  overflow: hidden;
}

.fs-trigger-panel:has(.fs-trigger-panel-bg) {
  width: 88%;
  max-width: 440px;
  aspect-ratio: 420 / 520;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}

.fs-trigger-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 10% 9% 9%;
  box-sizing: border-box;
}

.fs-trigger-panel:not(:has(.fs-trigger-panel-bg)) .fs-trigger-body {
  padding: 28px 22px 24px;
}

.fs-trigger-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  pointer-events: none;
  z-index: 0;
}

.fs-trigger-panel:has(.fs-trigger-panel-bg) > :not(.fs-trigger-panel-bg):not(.fs-trigger-rays) {
  position: relative;
  z-index: 1;
}

.fs-trigger-panel:has(.fs-trigger-panel-bg) .fs-trigger-hu {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
}

.fs-trigger-panel:has(.fs-trigger-panel-bg) .fs-trigger-count__num {
  animation: fs-count-glow 1.2s ease-in-out infinite alternate;
  text-shadow:
    0 3px 0 rgba(80, 35, 4, 0.9),
    0 0 18px rgba(255, 215, 0, 0.75),
    0 0 36px rgba(255, 140, 20, 0.45);
}

.fs-trigger-rays {
  position: absolute;
  inset: -20%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 215, 0, 0.08) 30deg,
    transparent 60deg,
    rgba(255, 215, 0, 0.06) 90deg,
    transparent 120deg,
    rgba(255, 215, 0, 0.08) 150deg,
    transparent 180deg,
    rgba(255, 215, 0, 0.06) 210deg,
    transparent 240deg,
    rgba(255, 215, 0, 0.08) 270deg,
    transparent 300deg,
    rgba(255, 215, 0, 0.06) 330deg,
    transparent 360deg
  );
  animation: fs-rays-spin 8s linear infinite;
  pointer-events: none;
  z-index: 0;
}

.fs-trigger-hu {
  width: 92px;
  height: 92px;
  object-fit: contain;
  filter: drop-shadow(0 0 16px rgba(255, 200, 60, 0.85));
  animation: fs-hu-bounce 0.9s ease-in-out infinite alternate;
  margin: 0 0 14px;
}

.fs-trigger-title {
  margin: 0 0 10px;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-size: 38px;
  font-weight: 400;
  letter-spacing: 3px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  background: linear-gradient(180deg, #fffff8 0%, #ffef70 28%, #ffb818 58%, #e87000 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.6px rgba(100, 38, 4, 0.78);
  paint-order: stroke fill;
  filter:
    drop-shadow(0 2px 0 rgba(80, 35, 4, 0.92))
    drop-shadow(0 0 14px rgba(255, 210, 60, 0.82))
    drop-shadow(0 0 26px rgba(255, 130, 20, 0.42));
}

.fs-trigger-sub {
  margin: 0 0 20px;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 19px;
  font-weight: 400;
  letter-spacing: 2px;
  color: #ffe8b8;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
}

.fs-trigger-sub--total {
  margin: 0 0 16px;
  color: #fff0c0;
  font-size: 20px;
  letter-spacing: 2px;
  text-shadow:
    0 1px 0 rgba(80, 35, 4, 0.7),
    0 0 12px rgba(255, 200, 60, 0.45);
}

.fs-trigger-count {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0 0 18px;
  line-height: 1;
}

.fs-trigger-count__plus {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 50px;
  font-weight: 400;
  color: #ffd84a;
  text-shadow:
    0 2px 0 rgba(80, 35, 4, 0.85),
    0 0 16px rgba(255, 200, 60, 0.75);
}

.fs-trigger-count__num {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 76px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 2px;
  color: #fff;
  text-shadow:
    0 3px 0 rgba(80, 35, 4, 0.9),
    0 0 18px rgba(255, 215, 0, 0.75),
    0 0 36px rgba(255, 140, 20, 0.45);
  animation: fs-count-glow 1.2s ease-in-out infinite alternate;
}

.fs-trigger-count__label {
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 3px;
  color: #ffd84a;
  text-shadow:
    0 2px 0 rgba(80, 35, 4, 0.75),
    0 0 10px rgba(255, 200, 60, 0.5);
}

.fs-trigger-note {
  margin: 0 0 20px;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 1px;
  color: rgba(255, 220, 180, 0.78);
  text-align: center;
}

.fs-trigger-btn {
  min-width: 168px;
  padding: 14px 38px;
  margin-top: 2px;
  border: 2px solid #ffd700;
  border-radius: 26px;
  background: linear-gradient(180deg, #c62828 0%, #7b1010 100%);
  color: #fff8ec;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 8px;
  text-indent: 8px;
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.45);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.4),
    0 0 16px rgba(255, 180, 40, 0.25);
  transition: transform 0.12s, filter 0.12s;
}

.fs-trigger-btn:active {
  transform: scale(0.96);
  filter: brightness(1.1);
}

.fs-trigger-hint {
  margin: 16px 0 0;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 1px;
  color: rgba(255, 220, 190, 0.5);
}

.fs-trigger-enter-active,
.fs-trigger-leave-active {
  transition: opacity 0.35s ease;
}

.fs-trigger-enter-active .fs-trigger-panel,
.fs-trigger-leave-active .fs-trigger-panel {
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.fs-trigger-enter-from,
.fs-trigger-leave-to {
  opacity: 0;
}

.fs-trigger-enter-from .fs-trigger-panel,
.fs-trigger-leave-to .fs-trigger-panel {
  transform: scale(0.85);
  opacity: 0;
}

@keyframes fs-panel-pop {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes fs-rays-spin {
  to { transform: rotate(360deg); }
}

@keyframes fs-hu-bounce {
  0% { transform: scale(1) translateY(0); }
  100% { transform: scale(1.08) translateY(-4px); }
}

@keyframes fs-count-glow {
  0% {
    text-shadow:
      0 3px 0 rgba(80, 35, 4, 0.9),
      0 0 14px rgba(255, 215, 0, 0.55),
      0 0 28px rgba(255, 140, 20, 0.35);
  }
  100% {
    text-shadow:
      0 3px 0 rgba(80, 35, 4, 0.9),
      0 0 24px rgba(255, 215, 0, 0.95),
      0 0 48px rgba(255, 140, 20, 0.55);
  }
}
</style>
