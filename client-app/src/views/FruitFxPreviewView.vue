<template>
  <div class="fxp">
    <header class="fxp-head">
      <div>
        <h1>水果机 · 特效预览</h1>
        <p>只看中心舞台特效，点左侧逐个改。路径 <code>/dev/fruit-fx</code></p>
      </div>
      <button type="button" class="fxp-back" @click="goBack">返回</button>
    </header>

    <div class="fxp-body">
      <aside class="fxp-list">
        <section v-for="group in FRUIT_FX_GROUPS" :key="group" class="fxp-group">
          <h2>{{ group }}</h2>
          <button
            v-for="item in itemsByGroup(group)"
            :key="item.id"
            type="button"
            class="fxp-item"
            :class="{ active: selectedId === item.id }"
            @click="selectFx(item.id)"
          >
            <span class="fxp-item-label">{{ item.label }}</span>
            <span class="fxp-item-kind">{{ kindTag(item.kind) }}</span>
          </button>
        </section>
      </aside>

      <main class="fxp-main">
        <div v-if="selected" class="fxp-meta">
          <h2>{{ selected.label }}</h2>
          <p>{{ selected.note }}</p>
          <p class="fxp-id">id: <code>{{ selected.id }}</code></p>
          <button
            v-if="showTrainFullDemo"
            type="button"
            class="fxp-demo-full"
            @click="goTrainFullDemo"
          >
            进游戏看完整开火车（环灯+生长）
          </button>
        </div>

        <div class="fxp-stage-wrap">
          <!-- 纯精灵表：只播特效贴图 -->
          <div v-if="selected?.kind === 'sheet' || selected?.kind === 'symbol'" class="fxp-tv">
            <div class="fxp-tv-screen" :class="{ checker: showChecker }">
              <div v-if="sheetOk" class="fxp-sheet" :style="sheetStyle" />
              <div v-else class="fxp-missing">素材加载失败或文件不存在</div>
            </div>
            <div class="fxp-controls">
              <button type="button" @click="replay">重播</button>
              <label class="fxp-check">
                <input v-model="showChecker" type="checkbox" />
                透明棋盘底
              </label>
              <span class="fxp-frame">帧 {{ frameIndex + 1 }} / {{ totalFrames }}</span>
            </div>
          </div>

          <!-- 独立图层：放射线 / 黑框等 -->
          <div v-else-if="selected?.kind === 'asset' && selected.assetUrl" class="fxp-tv">
            <div class="fxp-tv-screen" :class="{ checker: showChecker }">
              <img
                class="fxp-asset"
                :class="{ spin: selected.id === 'idle-rays' }"
                :src="selected.assetUrl"
                :alt="selected.label"
                draggable="false"
              />
            </div>
            <div class="fxp-controls">
              <label class="fxp-check">
                <input v-model="showChecker" type="checkbox" />
                透明棋盘底
              </label>
              <span v-if="selected.id === 'idle-rays'" class="fxp-frame">预览中持续旋转</span>
            </div>
          </div>

          <!-- 完整 FruitCenterStage：电视屏比例/宽度对齐游戏（约 200px 宽的 518×455） -->
          <div v-else-if="selected?.kind === 'stage' && selected.stage" class="fxp-tv fxp-tv--stage">
            <div class="fxp-tv-screen" :class="{ checker: showChecker }">
              <FruitCenterStage
                :key="selected.id"
                class="fxp-fcs"
                :mode="selected.stage.mode"
                :mult="selected.stage.mult ?? 10"
                :total-stake="selected.stage.totalStake ?? 0"
                :win-amount="selected.stage.winAmount ?? 0"
                :gamble-result="selected.stage.gambleResult ?? null"
                :award-type="selected.stage.awardType ?? 'normal'"
                :hit-symbol="selected.stage.hitSymbol ?? null"
                :hit-size="selected.stage.hitSize ?? 'big'"
                :hit-label="selected.stage.hitLabel ?? ''"
                :hit-odds="selected.stage.hitOdds ?? 0"
                :hit-bet-units="selected.stage.hitBetUnits ?? 0"
              />
            </div>
            <p class="fxp-cabinet-hint">对齐游戏电视屏：518×455 · 预览宽约 220px（机柜内实际宽度）</p>
            <div class="fxp-controls">
              <button type="button" @click="bumpStage">刷新舞台</button>
              <label class="fxp-check">
                <input v-model="showChecker" type="checkbox" />
                透明棋盘底
              </label>
            </div>
          </div>
        </div>

        <div v-if="sheetSpec || selected?.assetUrl" class="fxp-raw">
          <h3>素材原图</h3>
          <img
            :src="sheetSpec?.url || selected?.assetUrl"
            :alt="selected?.label"
            class="fxp-raw-img"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FruitCenterStage from '@/components/FruitCenterStage.vue'
import {
  FRUIT_FX_CATALOG,
  FRUIT_FX_GROUPS,
  getFruitFxSheet,
  type FruitFxGroup,
  type FruitFxItem,
  type FruitFxKind,
} from '@/games/slots/fruitFxCatalog'

const router = useRouter()
const selectedId = ref('idle-stage-ref')
const showChecker = ref(true)
const frameIndex = ref(0)
const sheetOk = ref(false)

let timer: ReturnType<typeof setInterval> | null = null
const sheetCache = new Map<string, boolean>()

const selected = computed(() => FRUIT_FX_CATALOG.find((x) => x.id === selectedId.value) ?? null)
const showTrainFullDemo = computed(
  () => selected.value?.id === 'settle-idle-train' || selected.value?.id === 'settle-idle-win',
)

const sheetSpec = computed(() => (selected.value ? getFruitFxSheet(selected.value) : null))
const totalFrames = computed(() => {
  const s = sheetSpec.value
  return s ? s.cols * s.rows : 0
})

const sheetStyle = computed(() => {
  const spec = sheetSpec.value
  if (!spec || !sheetOk.value) return {}
  const total = spec.cols * spec.rows
  const idx = Math.min(frameIndex.value, total - 1)
  const col = idx % spec.cols
  const row = Math.floor(idx / spec.cols)
  return {
    backgroundImage: `url(${spec.url})`,
    backgroundSize: `${spec.cols * 100}% ${spec.rows * 100}%`,
    backgroundPosition: `${(col / Math.max(1, spec.cols - 1)) * 100}% ${(row / Math.max(1, spec.rows - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
})

function itemsByGroup(group: FruitFxGroup) {
  return FRUIT_FX_CATALOG.filter((x) => x.group === group)
}

function kindTag(kind: FruitFxKind) {
  if (kind === 'sheet') return '分镜'
  if (kind === 'symbol') return '符号'
  if (kind === 'asset') return '图层'
  return '合成'
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/lobby')
}

function selectFx(id: string) {
  selectedId.value = id
}

function goTrainFullDemo() {
  router.push({ path: '/game/fruit', query: { demo: 'train' } })
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function probe(url: string) {
  if (sheetCache.has(url)) return Promise.resolve(sheetCache.get(url)!)
  return new Promise<boolean>((resolve) => {
    const img = new Image()
    img.onload = () => {
      sheetCache.set(url, true)
      resolve(true)
    }
    img.onerror = () => {
      sheetCache.set(url, false)
      resolve(false)
    }
    img.src = url
  })
}

async function startSheet() {
  stopTimer()
  sheetOk.value = false
  frameIndex.value = 0
  const item = selected.value
  const spec = sheetSpec.value
  if (!item || !spec || (item.kind !== 'sheet' && item.kind !== 'symbol')) return

  const ok = await probe(spec.url)
  if (selectedId.value !== item.id) return
  sheetOk.value = ok
  if (!ok) return

  const total = spec.cols * spec.rows
  timer = setInterval(() => {
    const next = frameIndex.value + 1
    if (next >= total) {
      if (spec.loop) frameIndex.value = 0
      else {
        frameIndex.value = total - 1
        stopTimer()
      }
    } else {
      frameIndex.value = next
    }
  }, Math.max(30, Math.round(1000 / spec.fps)))
}

function replay() {
  frameIndex.value = 0
  void startSheet()
}

function bumpStage() {
  // 轻推同 id 重挂载，让 FruitCenterStage 重新播分镜
  const id = selectedId.value
  selectedId.value = ''
  requestAnimationFrame(() => {
    selectedId.value = id
  })
}

watch(
  selectedId,
  () => {
    void startSheet()
  },
  { immediate: true },
)

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.fxp {
  min-height: 100vh;
  min-height: 100dvh;
  background: #0c0e14;
  color: #e8ecf4;
  font-family: 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif;
}

.fxp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #12151e;
}

.fxp-head h1 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 800;
}

.fxp-head p {
  margin: 0;
  font-size: 13px;
  color: #9aa3b5;
}

.fxp-head code {
  color: #ffc86a;
}

.fxp-back {
  flex: 0 0 auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #e8ecf4;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}

.fxp-body {
  display: grid;
  grid-template-columns: minmax(220px, 300px) 1fr;
  min-height: calc(100vh - 74px);
  min-height: calc(100dvh - 74px);
}

.fxp-list {
  overflow: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #10131a;
  padding: 10px 8px 24px;
}

.fxp-group {
  margin-bottom: 14px;
}

.fxp-group h2 {
  margin: 8px 8px 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #7f8aa3;
  font-weight: 700;
}

.fxp-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  border: 0;
  background: transparent;
  color: #d5dbe8;
  border-radius: 8px;
  padding: 10px 10px;
  cursor: pointer;
  margin-bottom: 2px;
}

.fxp-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.fxp-item.active {
  background: rgba(255, 170, 40, 0.16);
  color: #ffe0a0;
}

.fxp-item-label {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}

.fxp-item-kind {
  flex: 0 0 auto;
  font-size: 11px;
  color: #8b95a8;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 2px 7px;
}

.fxp-item.active .fxp-item-kind {
  border-color: rgba(255, 200, 80, 0.35);
  color: #ffd27a;
}

.fxp-main {
  overflow: auto;
  padding: 16px 18px 32px;
}

.fxp-meta h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.fxp-demo-full {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(80, 220, 255, 0.55);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #062838;
  background: linear-gradient(180deg, #e8ffff 0%, #60d8ff 45%, #2090c8 100%);
  cursor: pointer;
}

.fxp-demo-full:hover {
  filter: brightness(1.06);
}

.fxp-meta p {
  margin: 0 0 4px;
  color: #9aa3b5;
  font-size: 13px;
}

.fxp-id code {
  color: #ffc86a;
}

.fxp-stage-wrap {
  margin-top: 14px;
}

.fxp-tv {
  width: min(100%, 420px);
}

/* 舞台合成：与游戏机柜内电视屏同比例、同量级宽度（约 197~240px） */
.fxp-tv--stage {
  width: min(100%, 220px);
}

.fxp-tv-screen {
  position: relative;
  width: 100%;
  aspect-ratio: 518 / 455;
  border-radius: 12px;
  overflow: hidden;
  background: #101928;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 16px 40px rgba(0, 0, 0, 0.45);
}

.fxp-tv-screen.checker {
  background-color: #222;
  background-image:
    linear-gradient(45deg, #2c2c2c 25%, transparent 25%),
    linear-gradient(-45deg, #2c2c2c 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2c2c2c 75%),
    linear-gradient(-45deg, transparent 75%, #2c2c2c 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.fxp-cabinet-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #7f8aa3;
}

.fxp-sheet {
  position: absolute;
  inset: 0;
}

.fxp-asset {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(88%, 280px);
  height: auto;
  transform: translate(-50%, -50%);
  object-fit: contain;
}

.fxp-asset.spin {
  width: 120%;
  max-width: none;
  animation: fxpAssetSpin 18s linear infinite;
}

@keyframes fxpAssetSpin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.fxp-missing {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #ff8a8a;
  font-size: 14px;
  padding: 16px;
  text-align: center;
}

.fxp-fcs {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

.fxp-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.fxp-controls button {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #1a2030;
  color: #e8ecf4;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
}

.fxp-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #9aa3b5;
  cursor: pointer;
}

.fxp-frame {
  font-size: 12px;
  color: #7f8aa3;
  margin-left: auto;
}

.fxp-raw {
  margin-top: 22px;
  max-width: 720px;
}

.fxp-raw h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #9aa3b5;
}

.fxp-raw-img {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #000;
}

@media (max-width: 860px) {
  .fxp-body {
    grid-template-columns: 1fr;
  }

  .fxp-list {
    max-height: 240px;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .fxp-tv {
    width: min(100%, 360px);
    margin: 0 auto;
  }

  .fxp-tv--stage {
    width: min(100%, 220px);
  }
}
</style>
