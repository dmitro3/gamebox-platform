<template>
  <CaptainCover v-if="showCover" @start="onCoverStart" />

  <div v-show="!showCover" class="captain-game-page">
    <img v-if="pageBgUrl" class="page-bg-fill" :src="pageBgUrl" alt="" draggable="false" />

    <PgScreenCompat>
      <div class="game-shell">
        <div v-if="bgBaseUrl" class="layer z-bg" :style="pctLayerStyle(bgImage)">
          <img class="layer-img" :src="bgBaseUrl" alt="" draggable="false" />
        </div>

        <div v-if="reelFrameUrl" class="layer z-frame" :style="pctLayerStyle(L.reelFrame)">
          <img class="layer-img" :src="reelFrameUrl" alt="" draggable="false" />
        </div>

        <div class="layer z-grid" :style="pctLayerStyle(playReels)">
          <div class="reel-grid">
            <div v-for="(col, ci) in grid" :key="ci" class="reel-col">
              <div
                v-for="(sym, ri) in col"
                :key="`${ci}-${ri}-${spinKey}`"
                class="reel-cell"
                :class="{ spinning }"
              >
                <img v-if="symbolUrl(sym)" :src="symbolUrl(sym)!" :alt="sym" draggable="false" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="uiFooterUrl && bottomFooter" class="layer z-footer-bg" :style="pctLayerStyle(bottomFooter)">
          <img class="layer-img" :src="uiFooterUrl" alt="" draggable="false" />
        </div>

        <div class="layer z-hud" :style="pctLayerStyle(hudBox)">
          <div class="hud-line hud-balance">
            <img v-if="walletIconUrl" class="hud-icon" :src="walletIconUrl" alt="" />
            <span>{{ balance.toLocaleString() }}</span>
          </div>
          <div class="hud-line hud-bet">
            <img v-if="betIconUrl" class="hud-icon" :src="betIconUrl" alt="" />
            <span>{{ bet.toLocaleString() }}</span>
          </div>
          <div class="hud-line hud-win" :class="{ active: lastWin > 0 }">
            <img v-if="winIconUrl" class="hud-icon" :src="winIconUrl" alt="" />
            <span>{{ lastWin > 0 ? lastWin.toLocaleString() : msgText }}</span>
          </div>
        </div>

        <div class="layer z-actions">
          <img
            class="pg-btn-tint"
            :style="pctLayerStyle(bottomBtnVisuals.turbo)"
            :src="pgUi(isTurbo ? 'btn-turbo-on' : 'btn-turbo')!"
            alt=""
            draggable="false"
          />
          <img
            class="pg-btn-label"
            :class="{ 'is-active': isTurbo }"
            :style="pctLayerStyle(bottomBtnVisuals.turbo)"
            :src="pgUi(isTurbo ? 'label-turbo-on' : 'label-turbo-off-ring')!"
            alt=""
            draggable="false"
          />
          <img class="pg-btn-tint" :style="pctLayerStyle(bottomBtnVisuals.minus)" :src="pgUi('btn-minus')!" alt="" />
          <img class="pg-btn-tint" :style="pctLayerStyle(bottomBtnVisuals.plus)" :src="pgUi('btn-plus')!" alt="" />
          <img
            class="pg-btn-label"
            :class="{ 'is-active': autoSpinLeft > 0 }"
            :style="pctLayerStyle(bottomBtnVisuals.auto)"
            :src="pgUi('label-auto-text')!"
            alt=""
            draggable="false"
          />
          <img
            class="pg-btn-tint"
            :class="{ 'is-active': autoSpinLeft > 0 }"
            :style="pctLayerStyle(bottomBtnVisuals.auto)"
            :src="pgUi('btn-auto-center')!"
            alt=""
            draggable="false"
          />
          <img class="pg-btn-tint" :style="pctLayerStyle(bottomBtnVisuals.menu)" :src="pgUi('btn-menu')!" alt="" />

          <button
            type="button"
            class="action-btn action-btn--hit"
            :class="{ 'is-active': isTurbo }"
            :style="pctLayerStyle(bottomBtnHits.turbo)"
            @click="toggleTurbo"
          />
          <button
            type="button"
            class="action-btn action-btn--hit"
            :disabled="spinning"
            :style="pctLayerStyle(bottomBtnHits.minus)"
            @click="changeBet(-1)"
          />
          <div class="spin-button-stack" :style="pctLayerStyle(pgSpin.holder)">
            <img
              v-if="pgUi('btn-spin-frame')"
              class="spin-stack-img"
              :style="relPctStyle(pgSpin.disc)"
              :src="pgUi('btn-spin-frame')!"
              alt=""
              draggable="false"
            />
            <div class="spin-stack-hit" :style="relPctStyle(pgSpin.arrow)">
              <CaptainSpinButton
                :disabled="spinning || balance < bet"
                :is-accelerating="spinning"
                :is-turbo="isTurbo"
                @click="doSpin"
              />
            </div>
          </div>
          <button
            type="button"
            class="action-btn action-btn--hit"
            :disabled="spinning"
            :style="pctLayerStyle(bottomBtnHits.plus)"
            @click="changeBet(1)"
          />
          <button
            type="button"
            class="action-btn action-btn--hit"
            :disabled="spinning"
            :style="pctLayerStyle(bottomBtnHits.auto)"
            @click="toggleAutoSpin"
          />
          <button
            type="button"
            class="action-btn action-btn--hit"
            :style="pctLayerStyle(bottomBtnHits.menu)"
            @click="showMenu = !showMenu"
          />
        </div>
      </div>
    </PgScreenCompat>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import CaptainCover from '@/components/CaptainCover.vue'
import CaptainSpinButton from '@/components/CaptainSpinButton.vue'
import PgScreenCompat from '@/components/PgScreenCompat.vue'
import { pgManifest, pgSymbol, pgUi } from '@/games/captain/captainPgAssets'
import pgSpinLayout from '@/games/captain/pgSpinLayout.json'
import cocosLayout from '@/games/captain/cocosLayout.json'

type LayoutBox = { leftPct: number; topPct: number; widthPct: number; heightPct: number }

const SYMBOLS: { id: Sym; weight: number; pay: number }[] = [
  { id: 'pirate', weight: 4, pay: 50 },
  { id: 'bottle', weight: 6, pay: 30 },
  { id: 'compass', weight: 8, pay: 20 },
  { id: 'hook', weight: 10, pay: 15 },
  { id: 'a', weight: 12, pay: 10 },
  { id: 'k', weight: 14, pay: 8 },
  { id: 'q', weight: 16, pay: 6 },
  { id: 'j', weight: 18, pay: 5 },
  { id: 'wild', weight: 3, pay: 80 },
  { id: 'scatter', weight: 2, pay: 0 },
]

const BET_STEPS = [1, 2, 5, 10, 20, 50, 100]
const COLS = 5
const ROWS = 3

type Sym = 'pirate' | 'bottle' | 'compass' | 'hook' | 'a' | 'k' | 'q' | 'j' | 'wild' | 'scatter'

const L = cocosLayout.L as Record<string, LayoutBox>
const btnBar = cocosLayout.btnBar as LayoutBox

const bottomBtnHits = {
  turbo: { leftPct: 3.889, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 },
  minus: { leftPct: 19.167, topPct: 83.438, widthPct: 16.667, heightPct: 10.313 },
  plus: { leftPct: 64.167, topPct: 83.438, widthPct: 16.667, heightPct: 10.313 },
  auto: { leftPct: 79.444, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 },
  menu: { leftPct: 92.11, topPct: 83.906, widthPct: 18.076, heightPct: 9.375 },
} satisfies Record<string, LayoutBox>

const bottomBtnVisuals = {
  turbo: { leftPct: 8.056, topPct: 86.25, widthPct: 8.333, heightPct: 4.688 },
  minus: { leftPct: 22.5, topPct: 85.781, widthPct: 10, heightPct: 5.625 },
  plus: { leftPct: 67.5, topPct: 85.781, widthPct: 10, heightPct: 5.625 },
  auto: { leftPct: 83.611, topPct: 86.25, widthPct: 8.333, heightPct: 4.688 },
  menu: { leftPct: 94.151, topPct: 85.772, widthPct: 9.662, heightPct: 5.435 },
} satisfies Record<string, LayoutBox>

const pgSpin = pgSpinLayout as { holder: LayoutBox; hit: LayoutBox; disc: LayoutBox; arrow: LayoutBox }

const playReels = (cocosLayout.playReels ?? L.playReels) as LayoutBox
const bottomFooter = L.bottomFooter
const bgImage = cocosLayout.bgImage as LayoutBox
const hudBox: LayoutBox = {
  leftPct: bottomFooter?.leftPct ?? 4,
  topPct: Math.max((btnBar?.topPct ?? 83) - 8.5, 0),
  widthPct: bottomFooter?.widthPct ?? 92,
  heightPct: 6,
}

const showCover = ref(false)
const balance = ref(10000)
const bet = ref(10)
const betIndex = ref(3)
const spinning = ref(false)
const spinKey = ref(0)
const lastWin = ref(0)
const msgText = ref('按旋转开始')
const grid = ref<Sym[][]>(makeGrid())
const isTurbo = ref(false)
const autoSpinLeft = ref(0)
const showMenu = ref(false)

let bgm: HTMLAudioElement | null = null
let autoTimer: ReturnType<typeof setTimeout> | null = null

const pageBgUrl = computed(() => pgUi('cover-bottom-bg'))
const bgBaseUrl = computed(() => pgUi('bg-base'))
const reelFrameUrl = computed(() => pgUi('reel-frame'))
const uiFooterUrl = computed(() => pgUi('ui-footer'))
const walletIconUrl = computed(() => pgUi('icon-wallet'))
const betIconUrl = computed(() => pgUi('icon-bet'))
const winIconUrl = computed(() => pgUi('icon-win'))

function pctLayerStyle(box: LayoutBox | undefined) {
  if (!box) return { display: 'none' }
  return {
    top: `${box.topPct}%`,
    height: `${box.heightPct}%`,
    left: `${box.leftPct}%`,
    width: `${box.widthPct}%`,
  }
}

function relPctStyle(box: LayoutBox) {
  return {
    left: `${box.leftPct}%`,
    top: `${box.topPct}%`,
    width: `${box.widthPct}%`,
    height: `${box.heightPct}%`,
  }
}

function symbolUrl(id: Sym) {
  return pgSymbol(id)
}

function weightedPick(): Sym {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const s of SYMBOLS) {
    r -= s.weight
    if (r <= 0) return s.id
  }
  return 'a'
}

function makeGrid(): Sym[][] {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => weightedPick()),
  )
}

function countScatter(cols: Sym[][]): number {
  return cols.flat().filter((s) => s === 'scatter').length
}

/** 20 线简化：取中间行左连 */
function lineWin(cols: Sym[][]): number {
  const mid = cols.map((c) => c[1])
  const first = mid[0]
  const target = first === 'wild' ? mid.find((s) => s !== 'wild') ?? 'wild' : first
  if (target === 'scatter') return 0
  let len = 0
  for (const s of mid) {
    if (s === target || s === 'wild') len += 1
    else break
  }
  if (len < 3) return 0
  const pay = SYMBOLS.find((x) => x.id === target)?.pay ?? 5
  return pay * len * (bet.value / 10)
}

function startBgm() {
  if (bgm) return
  try {
    bgm = new Audio((pgManifest.audio as Record<string, string>)?.['bgm-main'] ?? '/audio/captain/bgm-main.mp3')
    bgm.loop = true
    bgm.volume = 0.35
    void bgm.play()
  } catch {
    /* ignore */
  }
}

function onCoverStart() {
  showCover.value = false
  startBgm()
}

function changeBet(delta: number) {
  if (spinning.value) return
  betIndex.value = Math.max(0, Math.min(BET_STEPS.length - 1, betIndex.value + delta))
  bet.value = BET_STEPS[betIndex.value]
}

function toggleTurbo() {
  isTurbo.value = !isTurbo.value
}

function toggleAutoSpin() {
  if (autoSpinLeft.value > 0) {
    autoSpinLeft.value = 0
    return
  }
  autoSpinLeft.value = 10
  if (!spinning.value) void doSpin()
}

async function doSpin() {
  if (spinning.value || balance.value < bet.value) return
  spinning.value = true
  balance.value -= bet.value
  lastWin.value = 0
  msgText.value = '旋转中…'

  const tickCount = isTurbo.value ? 8 : 14
  const tickDelay = isTurbo.value ? 35 : 60
  for (let i = 0; i < tickCount; i++) {
    grid.value = makeGrid()
    spinKey.value += 1
    await sleep(tickDelay + i * (isTurbo.value ? 4 : 8))
  }

  const result = makeGrid()
  grid.value = result
  spinKey.value += 1

  const scatters = countScatter(result)
  let win = lineWin(result)
  if (scatters >= 3) {
    win += bet.value * scatters * 2
    msgText.value = `免费旋转 ×${scatters}`
  } else {
    msgText.value = win > 0 ? '赢得' : '再试一次'
  }

  lastWin.value = Math.round(win)
  balance.value += lastWin.value
  spinning.value = false

  if (autoSpinLeft.value > 0) {
    autoSpinLeft.value -= 1
    if (autoSpinLeft.value > 0 && balance.value >= bet.value) {
      autoTimer = setTimeout(() => void doSpin(), isTurbo.value ? 400 : 700)
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

onMounted(() => {
  document.body.classList.add('captain-game-active')
  if (!showCover.value) {
    startBgm()
  }
})

onUnmounted(() => {
  document.body.classList.remove('captain-game-active')
  if (autoTimer) clearTimeout(autoTimer)
  bgm?.pause()
  bgm = null
})
</script>

<style scoped>
.captain-game-page {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #000;
}

.page-bg-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.28;
  pointer-events: none;
}

.game-shell {
  position: relative;
  width: 360px;
  height: 640px;
  overflow: hidden;
}

.layer {
  position: absolute;
}

.layer-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  pointer-events: none;
}

.z-bg { inset: 0; z-index: 1; }
.z-frame { inset: 0; z-index: 2; pointer-events: none; }
.z-grid { z-index: 4; }
.z-footer-bg { z-index: 5; pointer-events: none; }
.z-hud { z-index: 8; pointer-events: none; }
.z-actions { inset: 0; z-index: 10; pointer-events: none; }

.reel-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
  height: 100%;
}

.reel-col {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 3px;
}

.reel-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.reel-cell img {
  width: 94%;
  height: 94%;
  object-fit: contain;
}

.reel-cell.spinning img {
  filter: blur(0.35px);
}

.hud-line {
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 11px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.hud-balance { left: 0; }
.hud-bet { left: 34%; }
.hud-win { right: 0; left: auto; }
.hud-win.active { color: #ffd56a; }

.hud-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.pg-btn-tint,
.pg-btn-label {
  position: absolute;
  object-fit: contain;
  pointer-events: none;
  display: block;
}

.pg-btn-tint {
  filter: brightness(0) saturate(100%) invert(72%) sepia(28%) saturate(620%)
    hue-rotate(165deg) brightness(96%) contrast(92%);
}

.pg-btn-tint.is-active,
.pg-btn-label.is-active {
  filter: brightness(0) saturate(100%) invert(82%) sepia(35%) saturate(900%)
    hue-rotate(165deg) brightness(108%) contrast(96%)
    drop-shadow(0 0 6px rgba(80, 200, 255, 0.45));
}

.pg-btn-label {
  filter: brightness(0) saturate(100%) invert(72%) sepia(28%) saturate(620%)
    hue-rotate(165deg) brightness(96%) contrast(92%);
}

.action-btn--hit {
  position: absolute;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.spin-button-stack {
  position: absolute;
  pointer-events: none;
}

.spin-stack-img {
  position: absolute;
  object-fit: contain;
  pointer-events: none;
}

.spin-stack-hit {
  position: absolute;
  pointer-events: auto;
}
</style>
