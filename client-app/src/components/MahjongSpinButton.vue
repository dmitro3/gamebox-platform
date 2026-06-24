<template>
  <button
    type="button"
    class="spin-btn"
    :class="{
      'is-fast': isAccelerating,
      'is-turbo-fast': isAccelerating && isTurbo,
    }"
    :disabled="disabled"
    aria-label="旋转"
    @click="emit('click')"
  >
    <div
      v-if="showArrows && spinArrowsUrl"
      class="spin-btn__arrows-wrap"
      aria-hidden="true"
    >
      <div class="spin-btn__arrows-spin">
        <img
          class="spin-btn__arrows"
          :src="spinArrowsUrl"
          alt=""
          draggable="false"
        />
      </div>
    </div>
    <Transition name="spin-flash">
      <span v-if="retriggerFlash > 0" :key="retriggerFlash" class="spin-btn__retrigger-flash">
        +{{ retriggerFlash }}
      </span>
    </Transition>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { pgUi } from '../games/mahjong/pgAssets'

const props = defineProps({
  isAccelerating: { type: Boolean, default: false },
  isTurbo: { type: Boolean, default: false },
  freeSpinsRemaining: { type: Number, default: 0 },
  isFreeSpinMode: { type: Boolean, default: false },
  retriggerFlash: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{ click: [] }>()

const spinArrowsUrl = computed(() => pgUi('btn-spin-arrows'))

/** 有剩余免费次数时隐藏箭头，改由外层 spin-count-layer 显示数字 */
const showArrows = computed(
  () => !(props.isFreeSpinMode && props.freeSpinsRemaining > 0),
)
</script>

<style scoped>
.spin-btn {
  position: relative;
  width: 100%;
  height: 100%;
  max-height: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  overflow: visible;
  flex-shrink: 0;
  z-index: 3;
  -webkit-tap-highlight-color: transparent;
}

.spin-btn:disabled {
  cursor: not-allowed;
  opacity: 0.88;
}

.spin-btn__arrows-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.spin-btn__arrows-spin {
  width: 100%;
  height: 100%;
  animation: mj-spin-idle 3.5s linear infinite;
  transform-origin: center center;
}

.spin-btn__arrows {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}

.spin-btn.is-fast .spin-btn__arrows-spin {
  animation: mj-spin-idle 0.55s linear infinite;
}

.spin-btn.is-turbo-fast .spin-btn__arrows-spin {
  animation: mj-spin-idle 0.35s linear infinite;
}

@keyframes mj-spin-idle {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin-btn__retrigger-flash {
  position: absolute;
  left: 50%;
  top: 8%;
  transform: translateX(-50%);
  z-index: 4;
  font-size: clamp(14px, 4.8vw, 20px);
  line-height: 1;
  font-weight: 700;
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

.spin-btn:active:not(:disabled) .spin-btn__arrows-spin {
  filter: brightness(1.08);
}

.spin-btn.is-fast .spin-btn__arrows-spin {
  filter: drop-shadow(0 0 6px rgba(255, 220, 80, 0.55));
}
</style>
