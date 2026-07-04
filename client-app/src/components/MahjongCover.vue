<template>
  <div v-if="visible" class="mahjong-cover-root">
    <img
      v-if="coverBottomBgUrl"
      class="mahjong-cover-backdrop"
      :src="coverBottomBgUrl"
      alt=""
      aria-hidden="true"
    />

    <PgScreenCompat backdrop-transparent>
      <div id="splash" class="screen_compat screen_color">
      <img
        v-if="coverBgUrl"
        class="cover-bg"
        :src="coverBgUrl"
        alt=""
      />

      <PgFooterContainer />

      <div class="screen_safe_area">
        <div v-if="phase === 'loading'" class="loading-container-port">
          <div class="progress-bar-container-port">
            <div class="progress-bar-background" />
            <div class="progress-bar-fill-container">
              <div
                class="progress-bar-fill stripes"
                :style="{ width: `${progress}%` }"
              >
                <div class="top-highlight" />
                <div class="front-highlight" />
              </div>
            </div>
            <div class="progress-bar-outline border-inner" />
            <div class="progress-bar-outline border-outer" />
          </div>
          <p class="text-port tips-text">
            <span>{{ tipText }}</span>
            <span class="tips-text-child2" :class="{ 'tips-text-child2-hidden': !showPercent }">
              [{{ progress }}%]
            </span>
          </p>
        </div>

        <button
          v-else-if="startBtnUrl"
          type="button"
          id="__startedButton"
          class="start-button-container-port start-btn"
          :class="{ pressed: startPressed }"
          :style="startBtnStyle"
          aria-label="开始"
          @click="handleStart"
          @mousedown="startPressed = true"
          @mouseup="startPressed = false"
          @mouseleave="startPressed = false"
          @touchstart.passive="startPressed = true"
          @touchend="startPressed = false"
        />
      </div>

      <PgLogoContainer :cert-url="certUrl" />
    </div>
    </PgScreenCompat>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { pgUi } from '@/games/mahjong/pgAssets'
import PgScreenCompat from './PgScreenCompat.vue'
import PgFooterContainer from './PgFooterContainer.vue'
import PgLogoContainer from './PgLogoContainer.vue'

defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['start'])

const phase = ref('loading')
const progress = ref(0)
const showPercent = ref(false)
const tipText = ref('正在加载游戏资源...')
const startPressed = ref(false)

let progressTimer = null

const coverBottomBgUrl = computed(() => pgUi('cover-bottom-bg'))
const coverBgUrl = computed(() => pgUi('cover'))
const certUrl = computed(() => pgUi('cover-footer-cert'))
const startBtnUrl = computed(() =>
  startPressed.value
    ? (pgUi('btn-start-pressed') ?? pgUi('btn-start'))
    : pgUi('btn-start'),
)

const startBtnStyle = computed(() => {
  const url = startBtnUrl.value
  if (!url) return undefined
  return {
    backgroundImage: `url(${url})`,
  }
})

function handleStart() {
  emit('start')
}

function startLoading() {
  const durationMs = 2200
  const startAt = Date.now()
  progressTimer = window.setInterval(() => {
    const elapsed = Date.now() - startAt
    const ratio = Math.min(1, elapsed / durationMs)
    progress.value = Math.min(100, Math.round(ratio * 100))
    if (ratio >= 0.15) showPercent.value = true
    if (ratio >= 1) {
      window.clearInterval(progressTimer)
      progressTimer = null
      phase.value = 'ready'
    }
  }, 50)
}

onMounted(() => {
  startLoading()
})

onUnmounted(() => {
  if (progressTimer !== null) window.clearInterval(progressTimer)
})
</script>

<style scoped>
.mahjong-cover-root {
  position: fixed;
  inset: 0;
  z-index: 9998;
  overflow: hidden;
}

.mahjong-cover-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  pointer-events: none;
  user-select: none;
  z-index: 0;
}

.screen_compat {
  width: 360px;
  height: 640px;
  position: relative;
  overflow: hidden;
}

.screen_color {
  background-color: transparent;
}

.cover-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
  z-index: 1;
}

.screen_safe_area {
  height: 640px;
  width: 360px;
  z-index: 2;
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  pointer-events: none;
}

.loading-container-port {
  align-items: center;
  display: flex;
  flex-direction: column;
  left: 0;
  position: absolute;
  right: 0;
  top: 477px;
  pointer-events: none;
}

.progress-bar-container-port {
  background-color: initial;
  height: 13px;
  position: relative;
  width: 212px;
}

.progress-bar-background {
  background-color: #111;
  border-radius: 3.5px;
  height: 100%;
  position: absolute;
  width: 100%;
}

.progress-bar-fill-container {
  bottom: 0.87px;
  left: 0.87px;
  position: absolute;
  right: 0.87px;
  top: 0.87px;
}

.progress-bar-fill {
  backface-visibility: hidden;
  background-color: #b47850;
  background-size: 8.7px 100%;
  border-radius: 3.5px;
  height: 100%;
  position: absolute;
  width: 0;
  transition: width 0.12s linear;
}

.stripes {
  background-image: linear-gradient(
    -75deg,
    rgba(255, 255, 255, 0) 35%,
    rgba(255, 255, 255, 0.1) 0,
    rgba(255, 255, 255, 0.1) 75%,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0)
  );
  animation: animate-stripes 1s linear infinite;
}

.top-highlight {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3.5px 3.5px 0 0;
  height: 50%;
  position: absolute;
  width: 100%;
}

.front-highlight {
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), #fff);
  border-radius: 0 3.5px 3.5px 0;
  height: 100%;
  max-width: 20px;
  position: absolute;
  right: 0;
  width: 50%;
}

.progress-bar-outline {
  border-radius: 3.5px;
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  transform: translateZ(0);
}

.border-inner {
  border: 1.7px solid #272727;
}

.border-outer {
  border: 0.85px solid #111;
}

@keyframes animate-stripes {
  from { background-position: 0 0; }
  to { background-position: 34.7px 0; }
}

.tips-text {
  margin-top: 4px;
  text-align: center;
  text-overflow: ellipsis;
  width: 90%;
}

.text-port {
  color: #fff;
  font-size: 10.3px;
  margin: 0;
  padding: 0;
}

.tips-text-child2 {
  margin-left: 5px;
}

.tips-text-child2-hidden {
  display: none;
}

.start-button-container-port {
  align-items: center;
  display: flex;
  justify-content: center;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 448px;
  width: 182px;
  height: 64px;
  pointer-events: auto;
}

.start-btn {
  height: 64px;
  width: 182px;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  animation: show-bounce 0.6s ease-out forwards;
}

.start-btn.pressed {
  transform: scale(0.96);
  animation: none;
}

@keyframes show-bounce {
  0% { transform: scale(0); }
  20% { transform: scale(1.08); }
  50% { transform: scale(0.98); }
  100% { transform: scale(1); }
}
</style>
