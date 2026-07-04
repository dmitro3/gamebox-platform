<template>
  <div
    class="pg-screen-root"
    :class="{
      'pg-screen-root--center': centerVertically,
      'pg-screen-root--transparent': backdropTransparent,
    }"
    :style="rootStyle"
  >
    <div class="pg-screen-stage" :style="stageStyle">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { calcPgScreenScale, PG_SCREEN_H, PG_SCREEN_W } from '../games/mahjong/pgScreenScale'

const props = defineProps({
  zIndex: {
    type: Number,
    default: 9998,
  },
  centerVertically: {
    type: Boolean,
    default: true,
  },
  backdropTransparent: {
    type: Boolean,
    default: false,
  },
})

const centerVertically = computed(() => props.centerVertically)
const backdropTransparent = computed(() => props.backdropTransparent)

const scale = ref(calcPgScreenScale())

function updateScale() {
  scale.value = calcPgScreenScale()
}

onMounted(() => {
  updateScale()
  window.addEventListener('resize', updateScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScale)
})

const rootStyle = computed(() => ({
  zIndex: String(props.zIndex),
}))

const stageStyle = computed(() => ({
  width: `${PG_SCREEN_W}px`,
  height: `${PG_SCREEN_H}px`,
  transform: `scale(${scale.value.toFixed(5)})`,
}))
</script>

<style scoped>
.pg-screen-root {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  touch-action: manipulation;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif;
}

.pg-screen-root--center {
  align-items: center;
}

.pg-screen-root--transparent {
  background: transparent;
}

.pg-screen-stage {
  position: relative;
  flex-shrink: 0;
  transform-origin: top center;
  overflow: hidden;
}

.pg-screen-root--center .pg-screen-stage {
  transform-origin: center center;
}
</style>
