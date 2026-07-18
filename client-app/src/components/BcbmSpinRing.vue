<template>
  <!-- 原点由父级 .spin-anchor 定位；手机 RADIUS=180 -->
  <div class="spin-ring">
    <img
      v-for="i in iconCount"
      :key="i - 1"
      :ref="(el) => setCarRef(el as HTMLImageElement | null, i - 1)"
      class="car"
      :class="{ hit: hitIconSet.has(i - 1) }"
      :src="spinIconUrl(i - 1)"
      alt=""
      draggable="false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import {
  BcbmSpinEngine,
  spinIconUrl,
  iconIndexOfCarPos,
  type IconPose,
} from '@/games/bcbm/bcbmSpinMath'

const props = defineProps<{
  hitCarPos?: number[]
}>()

const emit = defineEmits<{
  stopped: []
  ready: []
  /** 官方 SpinStatusEnum 对齐：starting / spinning / stopping / stopped */
  status: [string]
}>()

const engine = new BcbmSpinEngine()
const iconCount = engine.poses().length

// 逐帧动画直写 DOM，绕过 Vue 响应式：24 个图标每帧只改自身 style.transform，
// 不触发组件重渲染/虚拟 DOM diff，旋转更顺滑（视觉与原实现逐帧一致）。
const carEls: (HTMLImageElement | null)[] = new Array(iconCount).fill(null)
function setCarRef(el: HTMLImageElement | null, i: number) {
  carEls[i] = el
}

const hitIconSet = computed(() => {
  const s = new Set<number>()
  for (const p of props.hitCarPos ?? []) s.add(iconIndexOfCarPos(p))
  return s
})

let raf = 0
let wasRunning = false
let lastStatus = engine.status

function applyPoses(poses: IconPose[]) {
  for (let i = 0; i < poses.length; i++) {
    const el = carEls[i]
    if (!el) continue
    const p = poses[i]
    el.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${p.scale})`
    el.style.zIndex = String(p.zIndex)
  }
}

function loop() {
  applyPoses(engine.tick())
  if (engine.status !== lastStatus) {
    lastStatus = engine.status
    emit('status', engine.status)
  }
  if (engine.status === 'stopped' && wasRunning) {
    wasRunning = false
    emit('stopped')
  }
  raf = requestAnimationFrame(loop)
}

type SpinStartOpts = {
  /** 官方 delaySpining(ms) */
  delayMs?: number
  /**
   * 高倍期待：先转起来，2s 后再 setTarget（onEnterGamePayout timeline）
   * true 时不立刻写入 targetPos
   */
  deferTarget?: boolean
}

/**
 * 官方：不重置角度，从当前 Idle 透视 morph 到 StartSpin 再加速。
 */
async function start(carPos: number, opts: SpinStartOpts | number = {}) {
  const o: SpinStartOpts =
    typeof opts === 'number' ? { delayMs: opts } : (opts ?? {})
  wasRunning = true
  engine.angleSpeed = 0
  engine.angleAccelarate = 0
  engine.canStopSpinningNow = true
  engine.setTarget(-1)
  if (engine.status !== 'idle') {
    await engine.transformToIdle()
  }
  if (o.delayMs && o.delayMs > 0) engine.delayStop(o.delayMs)
  if (!o.deferTarget) engine.setTarget(carPos)
  engine.transformToSpin()
}

function setTarget(carPos: number) {
  engine.setTarget(carPos)
}

function delayStop(ms: number) {
  engine.delayStop(ms)
}

function transformToIdle() {
  return engine.transformToIdle()
}

onMounted(() => {
  applyPoses(engine.poses())
  raf = requestAnimationFrame(loop)
  emit('ready')
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
})

/**
 * 官方 cloneIcons：从灯环复制中奖 carPos 图标，坐标转成舞台绝对像素
 * spin-anchor 在 GamePageSkin：(240, 168)
 */
function getClonePayload(carPositions: number[]) {
  const OX = 240
  const OY = 168
  const cur = engine.poses()
  return carPositions.map((cp) => {
    const ii = iconIndexOfCarPos(cp)
    const p = cur[ii] ?? { x: 0, y: 0, scale: 0.4 }
    return {
      src: spinIconUrl(ii),
      x: OX + p.x,
      y: OY + p.y,
      scale: p.scale,
    }
  })
}

defineExpose({ start, setTarget, delayStop, transformToIdle, getClonePayload, engine })
</script>

<style scoped>
.spin-ring {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
}
.car {
  position: absolute;
  left: 0;
  top: 0;
  width: 112px;
  height: 112px;
  object-fit: fill;
  transform-origin: center center;
  pointer-events: none;
  will-change: transform;
}
.car.hit {
  filter: drop-shadow(0 0 10px rgba(120, 220, 255, 0.9)) brightness(1.2);
}
</style>
