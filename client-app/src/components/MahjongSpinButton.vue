<template>
  <button
    type="button"
    class="spin-btn"
    :class="{
      'is-fast': isAccelerating,
      'is-turbo-fast': isAccelerating && isTurbo,
      'is-free-spin': showFreeSpinCount,
      'is-count-bump': countBumpActive,
    }"
    :disabled="disabled"
    aria-label="旋转"
    @click="emit('click')"
  >
    <!-- 底图：旋转按钮.png（原样） -->
    <img
      class="spin-btn__frame"
      src="/images/games/mahjong/lingguang/buttons/btn-spin-frame.png?v=8"
      alt=""
      draggable="false"
    />
    <!-- 上层：旋转按钮内圆圈.png（原样，仅这层旋转；免费局显示剩余次数时隐藏） -->
    <div v-if="!showFreeSpinCount" class="spin-btn__arrows-wrap" aria-hidden="true">
      <img
        class="spin-btn__arrows"
        src="/images/games/mahjong/lingguang/buttons/btn-spin-arrows.png?v=8"
        alt=""
        draggable="false"
      />
    </div>
    <div v-else class="spin-btn__count-wrap" aria-hidden="true">
      <span class="spin-btn__count">{{ freeSpinsRemaining }}</span>
    </div>
    <Transition name="spin-flash">
      <span v-if="retriggerFlash > 0" :key="retriggerFlash" class="spin-btn__retrigger-flash">
        +{{ retriggerFlash }}
      </span>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps({
  isAccelerating: { type: Boolean, default: false },
  isTurbo: { type: Boolean, default: false },
  freeSpinsRemaining: { type: Number, default: 0 },
  isFreeSpinMode: { type: Boolean, default: false },
  countBumpToken: { type: Number, default: 0 },
  retriggerFlash: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{ click: [] }>()

const showFreeSpinCount = computed(() => props.isFreeSpinMode)

const countBumpActive = ref(false)

watch(
  () => props.countBumpToken,
  () => {
    if (!props.isFreeSpinMode) return
    countBumpActive.value = false
    requestAnimationFrame(() => {
      countBumpActive.value = true
      setTimeout(() => {
        countBumpActive.value = false
      }, 620)
    })
  },
)

/** PS 导出尺寸：底 150×150，内圈 78×84，居中叠加 */
const FRAME_SIZE = 150
const ARROW_W = 78
const ARROW_H = 84
const arrowWidthPct = `${(ARROW_W / FRAME_SIZE) * 100}%`
const arrowHeightPct = `${(ARROW_H / FRAME_SIZE) * 100}%`
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap');

.spin-btn {
  position: relative;
  height: 128%;
  width: auto;
  aspect-ratio: 1;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  overflow: visible;
  flex-shrink: 0;
  z-index: 3;
  align-self: center;
  -webkit-tap-highlight-color: transparent;
}

.spin-btn:disabled {
  cursor: not-allowed;
  opacity: 0.88;
}

.spin-btn__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
  display: block;
}

.spin-btn__arrows-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: v-bind(arrowWidthPct);
  height: v-bind(arrowHeightPct);
  transform: translate(-50%, -50%);
  transform-origin: center center;
  pointer-events: none;
  z-index: 2;
  animation: mj-spin-idle 3.5s linear infinite;
}

.spin-btn__arrows {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.spin-btn.is-fast .spin-btn__arrows-wrap {
  animation: mj-spin-idle 0.55s linear infinite;
}

.spin-btn.is-turbo-fast .spin-btn__arrows-wrap {
  animation: mj-spin-idle 0.35s linear infinite;
}

@keyframes mj-spin-idle {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.spin-btn__count-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54%;
  height: 50%;
  pointer-events: none;
  transition: transform 0.2s ease;
}

.spin-btn.is-count-bump .spin-btn__count-wrap {
  animation: spin-count-bump 0.62s cubic-bezier(0.22, 1.2, 0.36, 1);
}

@keyframes spin-count-bump {
  0% {
    transform: translate(-50%, -50%) scale(1);
  }
  35% {
    transform: translate(-50%, -50%) scale(1.28);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}

.spin-btn__count {
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: clamp(24px, 9.5vw, 42px);
  font-weight: 400;
  line-height: 0.92;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: #fff8d0;
  text-shadow:
    0 0 12px rgba(255, 220, 80, 0.8),
    0 2px 0 #9a7010,
    0 4px 8px rgba(0, 0, 0, 0.78),
    0 0 2px #5c4008;
}

.spin-btn__retrigger-flash {
  position: absolute;
  left: 50%;
  top: 8%;
  transform: translateX(-50%);
  z-index: 4;
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: clamp(14px, 4.8vw, 20px);
  line-height: 1;
  color: #fff6b0;
  text-shadow:
    0 0 10px rgba(255, 220, 80, 0.9),
    0 2px 4px rgba(0, 0, 0, 0.75);
  pointer-events: none;
  white-space: nowrap;
}

.spin-flash-enter-active {
  animation: spin-flash-rise 0.88s ease-out forwards;
}

.spin-flash-leave-active {
  animation: spin-flash-rise 0.88s ease-out reverse;
}

@keyframes spin-flash-rise {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(8px) scale(0.85);
  }
  20% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.08);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-16px) scale(1);
  }
}

.spin-btn.is-free-spin .spin-btn__frame {
  filter: drop-shadow(0 0 8px rgba(255, 210, 60, 0.35));
}

.spin-btn.is-count-bump .spin-btn__frame {
  filter: drop-shadow(0 0 14px rgba(255, 220, 80, 0.65));
}

.spin-btn:active:not(:disabled) .spin-btn__frame,
.spin-btn:active:not(:disabled) .spin-btn__arrows-wrap {
  filter: brightness(1.08);
}

.spin-btn.is-fast .spin-btn__arrows-wrap {
  filter: drop-shadow(0 0 6px rgba(255, 220, 80, 0.55));
}
</style>
