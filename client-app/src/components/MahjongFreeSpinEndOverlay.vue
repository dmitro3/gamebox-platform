<template>
  <Transition name="fs-end">
    <div
      v-if="visible"
      class="fs-end-mask"
      role="dialog"
      aria-modal="true"
      aria-label="免费旋转结束"
      @click="emit('confirm')"
    >
      <div class="fs-end-panel" @click.stop>
        <img v-if="panelBg" class="fs-end-panel-bg" :src="panelBg" alt="" />
        <div v-if="!panelBg" class="fs-end-rays" aria-hidden="true" />
        <div class="fs-end-body">
          <img :src="`${symBase}/hu.png`" class="fs-end-hu" alt="" />
          <h2 class="fs-end-title">免费旋转结束</h2>
          <p class="fs-end-sub">共完成 {{ spinsPlayed }} 次免费旋转</p>
          <div class="fs-end-win-block" :class="{ 'is-zero-win': totalWin <= 0 }">
            <span class="fs-end-win-label">共赢得</span>
            <div class="fs-end-win-amount">
              <span class="fs-end-win-currency">¥</span>
              <span class="fs-end-win-value">{{ totalWin.toFixed(2) }}</span>
            </div>
          </div>
          <button type="button" class="fs-end-btn" @click="emit('confirm')">领取</button>
          <p class="fs-end-hint">点击任意处继续</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  totalWin: { type: Number, default: 0 },
  spinsPlayed: { type: Number, default: 0 },
  symBase: { type: String, default: '/images/games/mahjong/classic/symbols' },
  panelBg: { type: String, default: '' },
  autoDismissMs: { type: Number, default: 4800 },
})

const emit = defineEmits<{ confirm: [] }>()

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
    if (show && props.autoDismissMs > 0) {
      autoTimer = setTimeout(() => emit('confirm'), props.autoDismissMs)
    }
  },
  { immediate: true },
)

onUnmounted(clearAutoTimer)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+QingKe+HuangYou&display=swap');

.fs-end-mask {
  position: absolute;
  inset: 0;
  z-index: 31;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 2, 2, 0.72);
  backdrop-filter: blur(3px);
  cursor: pointer;
}

.fs-end-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 88%;
  max-width: 440px;
  padding: 0;
  border-radius: 16px;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  background: linear-gradient(180deg, #7a1808 0%, #3d0808 52%, #220404 100%);
  border: 3px solid #ffd700;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  cursor: default;
  animation: fs-end-pop 0.5s cubic-bezier(0.34, 1.35, 0.64, 1) both;
  overflow: hidden;
}

.fs-end-panel:has(.fs-end-panel-bg) {
  width: 88%;
  max-width: 440px;
  aspect-ratio: 834 / 1024;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}

.fs-end-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center center;
  pointer-events: none;
  z-index: 0;
}

.fs-end-panel:has(.fs-end-panel-bg) > :not(.fs-end-panel-bg):not(.fs-end-rays) {
  position: relative;
  z-index: 1;
}

.fs-end-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8% 6% 7%;
  box-sizing: border-box;
}

.fs-end-panel:not(:has(.fs-end-panel-bg)) .fs-end-body {
  padding: 28px 22px 24px;
}

.fs-end-rays {
  position: absolute;
  inset: -22%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 215, 0, 0.1) 40deg,
    transparent 80deg,
    rgba(255, 215, 0, 0.07) 120deg,
    transparent 160deg,
    rgba(255, 215, 0, 0.1) 200deg,
    transparent 240deg,
    rgba(255, 215, 0, 0.07) 280deg,
    transparent 320deg,
    rgba(255, 215, 0, 0.1) 360deg
  );
  animation: fs-end-rays-spin 10s linear infinite;
  pointer-events: none;
  z-index: 0;
}

.fs-end-hu {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(255, 200, 60, 0.7));
  margin: 0 0 8px;
  opacity: 0.92;
}

.fs-end-title {
  margin: 0 0 4px;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 2px;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  color: #ffd84a;
  text-shadow:
    0 2px 0 rgba(80, 35, 4, 0.85),
    0 0 10px rgba(255, 200, 60, 0.45);
}

.fs-end-sub {
  margin: 0 0 14px;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 1px;
  color: rgba(255, 230, 200, 0.78);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.fs-end-win-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 92%;
  margin: 4px 0 16px;
  padding: 16px 10px 18px;
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgba(255, 220, 100, 0.28) 0%,
    rgba(30, 8, 2, 0.42) 100%
  );
  border: 2px solid rgba(255, 215, 0, 0.62);
  box-shadow:
    inset 0 0 28px rgba(255, 200, 60, 0.18),
    0 0 24px rgba(255, 180, 40, 0.22),
    0 6px 20px rgba(0, 0, 0, 0.28);
}

.fs-end-panel:has(.fs-end-panel-bg) .fs-end-win-block {
  background: rgba(12, 2, 0, 0.38);
  border-color: rgba(255, 215, 0, 0.55);
  backdrop-filter: blur(3px);
  box-shadow:
    inset 0 0 32px rgba(255, 200, 60, 0.14),
    0 0 28px rgba(255, 160, 30, 0.28),
    0 6px 20px rgba(0, 0, 0, 0.3);
}

.fs-end-win-block.is-zero-win {
  border-color: rgba(255, 215, 0, 0.32);
  box-shadow:
    inset 0 0 16px rgba(255, 200, 60, 0.08),
    0 4px 14px rgba(0, 0, 0, 0.22);
}

.fs-end-win-block.is-zero-win .fs-end-win-value,
.fs-end-win-block.is-zero-win .fs-end-win-currency {
  background: none;
  -webkit-text-fill-color: rgba(255, 240, 220, 0.58);
  color: rgba(255, 240, 220, 0.58);
  animation: none;
  filter: none;
}

.fs-end-win-label {
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: 5px;
  color: #ffe8a0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.fs-end-win-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  max-width: 100%;
  line-height: 1;
  animation: fs-end-win-pop 0.7s cubic-bezier(0.22, 1.45, 0.36, 1) both;
}

.fs-end-win-currency {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: clamp(28px, 7vw, 38px);
  font-weight: 400;
  background: linear-gradient(180deg, #fffff8 0%, #ffef70 35%, #ffb818 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.2px rgba(100, 38, 4, 0.75);
  paint-order: stroke fill;
  filter: drop-shadow(0 2px 0 rgba(80, 35, 4, 0.88));
  animation: fs-end-win-shine 1.1s ease-in-out infinite alternate;
}

.fs-end-win-value {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: clamp(40px, 11vw, 58px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: linear-gradient(180deg, #ffffff 0%, #fff8c0 18%, #ffd040 52%, #ff9800 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.8px rgba(100, 38, 4, 0.82);
  paint-order: stroke fill;
  filter:
    drop-shadow(0 3px 0 rgba(80, 35, 4, 0.95))
    drop-shadow(0 0 16px rgba(255, 210, 60, 0.85))
    drop-shadow(0 0 32px rgba(255, 130, 20, 0.45));
  animation: fs-end-win-shine 1.1s ease-in-out infinite alternate;
}

.fs-end-btn {
  min-width: 160px;
  padding: 11px 34px;
  border: 2px solid #ffd700;
  border-radius: 26px;
  background: linear-gradient(180deg, #f0c830 0%, #b8860b 55%, #8b6910 100%);
  color: #2a1204;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 8px;
  text-indent: 8px;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(255, 240, 200, 0.35);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.38),
    0 0 14px rgba(255, 200, 60, 0.22);
  transition: transform 0.12s, filter 0.12s;
}

.fs-end-btn:active {
  transform: scale(0.96);
  filter: brightness(1.08);
}

.fs-end-hint {
  margin: 14px 0 0;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', cursive;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
  color: rgba(255, 220, 190, 0.5);
}

.fs-end-enter-active,
.fs-end-leave-active {
  transition: opacity 0.38s ease;
}

.fs-end-enter-active .fs-end-panel,
.fs-end-leave-active .fs-end-panel {
  transition: transform 0.38s ease, opacity 0.38s ease;
}

.fs-end-enter-from,
.fs-end-leave-to {
  opacity: 0;
}

.fs-end-enter-from .fs-end-panel,
.fs-end-leave-to .fs-end-panel {
  transform: scale(0.82);
  opacity: 0;
}

@keyframes fs-end-pop {
  0% {
    transform: scale(0.65);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fs-end-rays-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fs-end-win-pop {
  0% {
    transform: scale(0.35);
    opacity: 0;
  }
  65% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes fs-end-win-shine {
  0% {
    filter:
      drop-shadow(0 3px 0 rgba(80, 35, 4, 0.95))
      drop-shadow(0 0 14px rgba(255, 210, 60, 0.55))
      drop-shadow(0 0 28px rgba(255, 130, 20, 0.35));
  }
  100% {
    filter:
      drop-shadow(0 3px 0 rgba(80, 35, 4, 0.95))
      drop-shadow(0 0 26px rgba(255, 215, 0, 0.98))
      drop-shadow(0 0 48px rgba(255, 140, 20, 0.58));
  }
}
</style>
