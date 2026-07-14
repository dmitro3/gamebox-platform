<template>
  <button
    type="button"
    class="spin-btn"
    :class="{ 'is-fast': isAccelerating, 'is-turbo-fast': isAccelerating && isTurbo }"
    :disabled="disabled"
    aria-label="旋转"
    @click="emit('click')"
  >
    <div v-if="showArrows && spinArrowsUrl" class="spin-btn__arrows-wrap" aria-hidden="true">
      <div class="spin-btn__arrows-spin">
        <img class="spin-btn__arrows" :src="spinArrowsUrl" alt="" draggable="false" />
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { pgUi } from '@/games/captain/captainPgAssets'

defineProps({
  isAccelerating: { type: Boolean, default: false },
  isTurbo: { type: Boolean, default: false },
  showArrows: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits<{ click: [] }>()
const spinArrowsUrl = computed(() => pgUi('btn-spin-arrows'))
</script>

<style scoped>
.spin-btn {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  overflow: visible;
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
}

.spin-btn__arrows-spin {
  width: 100%;
  height: 100%;
  animation: cap-spin-idle 3.5s linear infinite;
}

.spin-btn__arrows {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.spin-btn.is-fast .spin-btn__arrows-spin {
  animation: cap-spin-idle 0.55s linear infinite;
}

.spin-btn.is-turbo-fast .spin-btn__arrows-spin {
  animation: cap-spin-idle 0.35s linear infinite;
}

@keyframes cap-spin-idle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
