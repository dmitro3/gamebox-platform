<template>
  <div class="slots-cover" v-if="visible">
    <img
      src="/images/games/slots/fruit-cover.png"
      class="cover-bg"
      alt="水果机"
      draggable="false"
    />
    <!-- 透明热区：对准图里的「开始」按钮，看起来一体、可点击 -->
    <button
      type="button"
      class="start-hotspot"
      aria-label="开始"
      @click="handleStart"
    />
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: true },
})

const emit = defineEmits(['start'])

function handleStart() {
  emit('start')
}
</script>

<style scoped>
.slots-cover {
  position: fixed;
  inset: 0;
  z-index: 9998;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: #0a0604;
  overflow: hidden;
}

/* 铺满整屏，不留黑边 */
.cover-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  user-select: none;
  -webkit-user-drag: none;
  animation: coverIn 0.75s ease-out both;
}

@keyframes coverIn {
  from { transform: scale(1.04); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 热区盖在图内按钮上：透明但可点，按下有轻微反馈 */
.start-hotspot {
  position: absolute;
  left: 50%;
  bottom: 7%;
  transform: translateX(-50%);
  width: min(62vw, 280px);
  height: min(10vh, 72px);
  border: none;
  padding: 0;
  margin: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 999px;
  z-index: 2;
  -webkit-tap-highlight-color: transparent;
  animation: hotspotPulse 2.2s ease-in-out infinite;
}

.start-hotspot:active {
  transform: translateX(-50%) scale(0.97);
  filter: brightness(1.08);
}

@keyframes hotspotPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 200, 60, 0); }
  50% { box-shadow: 0 0 28px 6px rgba(255, 190, 40, 0.28); }
}
</style>
