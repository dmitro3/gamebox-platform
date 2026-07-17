<template>
  <img
    v-if="src"
    class="bcbm-mc"
    :src="src"
    alt=""
    draggable="false"
    :style="{ opacity: visible ? 1 : 0 }"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    base: string
    count: number
    fps?: number
    loop?: boolean
    playing?: boolean
    prefix?: string
  }>(),
  { fps: 24, loop: true, playing: false },
)

const emit = defineEmits<{ done: [] }>()

const frameIndex = ref(0)
const visible = ref(false)
let timer: number | null = null

const filePrefix = computed(
  () => props.prefix || props.base.split('/').filter(Boolean).pop() || 'frame',
)

const src = computed(() => {
  if (!visible.value) return ''
  return `${props.base}/${filePrefix.value}_${String(frameIndex.value).padStart(2, '0')}.png`
})

function stop() {
  if (timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}

function start() {
  stop()
  if (!props.playing || props.count <= 0) {
    visible.value = false
    return
  }
  visible.value = true
  frameIndex.value = 0
  const interval = Math.max(16, Math.round(1000 / (props.fps || 24)))
  timer = window.setInterval(() => {
    const next = frameIndex.value + 1
    if (next >= props.count) {
      if (props.loop) {
        frameIndex.value = 0
      } else {
        frameIndex.value = props.count - 1
        stop()
        emit('done')
      }
    } else {
      frameIndex.value = next
    }
  }, interval)
}

watch(
  () => [props.playing, props.base, props.count, props.fps, props.loop] as const,
  () => start(),
  { immediate: true },
)

onBeforeUnmount(stop)
</script>

<style scoped>
.bcbm-mc {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
</style>
