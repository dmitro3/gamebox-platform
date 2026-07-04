<template>
  <PgScreenCompat v-if="visible">
    <div
      id="splash"
      class="screen_color screen_compat"
      :style="splashStyle"
    >
      <PgFooterContainer />

      <div class="screen_safe_area">
        <div v-if="phase === 'loading'" id="loading-container" class="loading-container-port">
          <div id="progress-bar-container-port" class="progress-bar-container-port">
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
          <p id="tips-text" class="text-port tips-text">
            <span>{{ tipText }}</span>
            <span class="tips-text-child2" :class="{ 'tips-text-child2-hidden': !showPercent }">
              [{{ progress }}%]
            </span>
          </p>
        </div>

        <div
          v-else-if="phase === 'paytable'"
          class="splash-paytable splash-paytable-visible"
          @click="handleTap"
        >
          <div
            v-if="logoUrl"
            class="splash-game-logo splash-game-logo-visible"
            :style="{ backgroundImage: `url(${logoUrl})` }"
          />
          <div v-if="pageUrls.length" class="splash-paytable-slide-container splash-paytable-slide-visible">
            <div
              v-for="(pageUrl, index) in pageUrls"
              :key="pageUrl"
              class="splash-slides-container"
              :class="slideClass(index)"
            >
              <div
                class="splash-content-image"
                :style="{ backgroundImage: `url(${pageUrl})` }"
              />
            </div>
          </div>
          <div v-if="pageUrls.length > 1" class="splash-paytable-dots-container">
            <span
              v-for="(_, index) in pageUrls"
              :key="index"
              class="splash-paytable-dot"
              :class="{ 'splash-paytable-dot-active': index === currentIndex }"
            />
          </div>
        </div>
      </div>

      <PgLogoContainer :cert-url="certUrl" />
    </div>
  </PgScreenCompat>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { pgUi } from '@/games/mahjong/pgAssets'
import PgFooterContainer from './PgFooterContainer.vue'
import PgLogoContainer from './PgLogoContainer.vue'
import PgScreenCompat from './PgScreenCompat.vue'

defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['done'])

/** 全程中文封面底图，不用英文 splash.jpg */
const bgUrl = computed(() => pgUi('cover'))
const logoUrl = computed(() => pgUi('splash-paytable-logo'))
const certUrl = computed(() => pgUi('cover-footer-cert'))
const pageUrls = computed(() =>
  ['splash-paytable-p1', 'splash-paytable-p2']
    .map((key) => pgUi(key))
    .filter((url) => Boolean(url)),
)

const splashStyle = computed(() => {
  const url = bgUrl.value
  if (!url) return undefined
  return {
    backgroundImage: `url(${url})`,
    backgroundPosition: '50%',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
  }
})

const phase = ref('loading')
const progress = ref(0)
const showPercent = ref(false)
const tipText = ref('正在加载游戏资源...')

const currentIndex = ref(0)
const prevIndex = ref(0)
const slideDirection = ref(1)

let progressTimer = null
let autoTimer = null
let cycles = 0

function slideClass(index) {
  if (index === currentIndex.value) {
    return slideDirection.value === 1
      ? 'splash-next-move-to-left'
      : 'splash-next-move-to-right'
  }
  if (index === prevIndex.value) {
    return slideDirection.value === 1
      ? 'splash-current-move-to-left'
      : 'splash-current-move-to-right'
  }
  return ''
}

function goNextSlide(direction = 1) {
  if (!pageUrls.value.length) return
  slideDirection.value = direction
  prevIndex.value = currentIndex.value
  const next = currentIndex.value + direction
  if (next < 0) {
    currentIndex.value = pageUrls.value.length - 1
  } else if (next >= pageUrls.value.length) {
    currentIndex.value = 0
    cycles += 1
    if (cycles >= 1) {
      finish()
      return
    }
  } else {
    currentIndex.value = next
  }
  scheduleAutoSlide()
}

function scheduleAutoSlide() {
  if (autoTimer !== null) window.clearTimeout(autoTimer)
  autoTimer = window.setTimeout(() => goNextSlide(1), 2000)
}

function startPaytablePhase() {
  phase.value = 'paytable'

  if (!pageUrls.value.length) {
    autoTimer = window.setTimeout(() => finish(), 800)
    return
  }

  currentIndex.value = 0
  scheduleAutoSlide()
}

function finish() {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
  if (autoTimer !== null) {
    window.clearTimeout(autoTimer)
    autoTimer = null
  }
  emit('done')
}

function handleTap() {
  finish()
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
      startPaytablePhase()
    }
  }, 50)
}

onMounted(() => {
  startLoading()
})

onUnmounted(() => {
  if (progressTimer !== null) window.clearInterval(progressTimer)
  if (autoTimer !== null) window.clearTimeout(autoTimer)
})
</script>

<style scoped>
.screen_compat {
  width: 360px;
  height: 640px;
  position: relative;
  overflow: hidden;
}

.screen_color {
  background-color: #000;
}

#splash {
  background-position: 50%;
  background-size: cover;
  background-repeat: no-repeat;
  position: relative;
  overflow: hidden;
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

.splash-paytable {
  height: 100%;
  transition: opacity 0.5s ease;
  visibility: hidden;
  width: 100%;
  pointer-events: auto;
}

.splash-paytable-visible {
  visibility: visible;
}

.splash-game-logo {
  background-size: 320px 120px;
  height: 120px;
  margin: 0 auto;
  opacity: 0;
  transition: opacity 0.5s ease;
  width: 320px;
}

.splash-game-logo-visible {
  opacity: 1;
}

.splash-paytable-slide-container {
  height: 345px;
  margin: 0 auto 54px;
  opacity: 0;
  overflow: hidden;
  position: relative;
  transition: opacity 0.5s ease;
  width: 360px;
}

.splash-paytable-slide-visible {
  opacity: 1;
}

.splash-slides-container {
  display: block;
  left: 0;
  margin: 0 20px;
  opacity: 1;
  position: absolute;
  transition: opacity 0.5s ease;
  width: 320px;
}

.splash-content-image {
  background-size: 320px 345px;
  height: 345px;
  width: 320px;
  background-position: center;
  background-repeat: no-repeat;
}

.splash-paytable-dots-container {
  bottom: 100px;
  position: absolute;
  text-align: center;
  width: 100%;
}

.splash-paytable-dot {
  background-color: #fff;
  border-radius: 50%;
  display: inline-block;
  height: 6px;
  margin: 0 6px;
  opacity: 0.3;
  transition: opacity 0.3s ease;
  width: 6px;
}

.splash-paytable-dot-active {
  opacity: 1;
}

.splash-next-move-to-left {
  animation: splash-next-move-to-left 0.5s forwards;
}

.splash-current-move-to-left {
  animation: splash-current-move-to-left 0.5s forwards;
}

.splash-next-move-to-right {
  animation: splash-next-move-to-right 0.5s forwards;
}

.splash-current-move-to-right {
  animation: splash-current-move-to-right 0.5s forwards;
}

@keyframes splash-next-move-to-left {
  from { left: 30%; opacity: 0; }
  to { left: 0; opacity: 1; }
}

@keyframes splash-current-move-to-left {
  from { left: 0; opacity: 1; }
  to { left: -30%; opacity: 0; }
}

@keyframes splash-next-move-to-right {
  from { left: -30%; opacity: 0; }
  to { left: 0; opacity: 1; }
}

@keyframes splash-current-move-to-right {
  from { left: 0; opacity: 1; }
  to { left: 30%; opacity: 0; }
}
</style>
