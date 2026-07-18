<template>
  <div
    v-if="visible"
    id="initial-loader"
    :class="{ 'hide-loading': hiding }"
    aria-hidden="true"
  >
    <div v-if="showDots" class="circle-loading">
      <div class="loader-circle" />
      <div class="loader-circle" />
      <div class="loader-circle" />
    </div>
    <div ref="svgHost" class="svg-loading" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  PG_INITIAL_LOADER_FADE_MS,
  PG_INITIAL_LOADER_MIN_MS,
  mountOfficialPgLoader,
} from '@/games/pg-common/pgInitialLoader'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['done'])

const svgHost = ref<HTMLElement | null>(null)
const hiding = ref(false)
const showDots = ref(true)

let cleanup: (() => void) | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let doneTimer: ReturnType<typeof setTimeout> | null = null
let bootAt = 0

function scheduleHide() {
  const elapsed = Date.now() - bootAt
  const wait = Math.max(0, PG_INITIAL_LOADER_MIN_MS - elapsed)

  hideTimer = window.setTimeout(() => {
    hiding.value = true
    doneTimer = window.setTimeout(() => {
      emit('done')
    }, PG_INITIAL_LOADER_FADE_MS)
  }, wait)
}

async function start() {
  await nextTick()
  if (!svgHost.value) return

  cleanup?.()
  bootAt = Date.now()
  hiding.value = false
  showDots.value = true
  cleanup = mountOfficialPgLoader(svgHost.value)
  requestAnimationFrame(() => {
    showDots.value = false
  })
  scheduleHide()
}

function stop() {
  if (hideTimer) clearTimeout(hideTimer)
  if (doneTimer) clearTimeout(doneTimer)
  hideTimer = null
  doneTimer = null
  cleanup?.()
  cleanup = null
  showDots.value = true
}

watch(
  () => props.visible,
  (show) => {
    if (show) start()
    else stop()
  },
)

onMounted(() => {
  if (props.visible) start()
})

onBeforeUnmount(stop)
</script>

<style scoped>
/* 对齐正版 index.html #loader-style */
#initial-loader {
  background-color: #000;
  height: 100%;
  margin: auto;
  position: fixed;
  inset: 0;
  width: 100%;
  z-index: 9999;
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

#initial-loader.hide-loading {
  animation-duration: 0.35s;
  animation-fill-mode: forwards;
  animation-name: fade-out;
  animation-timing-function: ease-in;
}

.svg-loading {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transform-origin: center center;
}

.circle-loading {
  align-items: center;
  display: flex;
  height: 10px;
  justify-content: space-between;
  margin-bottom: 28px;
  width: 40px;
}

.loader-circle {
  animation-direction: alternate;
  animation-duration: 0.25s;
  animation-iteration-count: infinite;
  animation-name: loader-circle-bounce;
  animation-timing-function: ease-out;
  background-color: #30a2d0;
  border-radius: 50%;
  height: 10px;
  position: relative;
  width: 10px;
}

.loader-circle:first-of-type {
  animation-delay: 0s;
}

.loader-circle:nth-of-type(2) {
  animation-delay: -75ms;
}

.loader-circle:nth-of-type(3) {
  animation-delay: -0.15s;
}

@keyframes loader-circle-bounce {
  0% {
    bottom: 0;
  }
  90%,
  100% {
    bottom: 15px;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}
</style>

<style>
/* 标语 fade-in 须全局可见（动态插入的 pre 使用正版 animation 名） */
@keyframes fade-in {
  to {
    opacity: 1;
  }
}
</style>
