<template>
  <!--
    官方 GamePageSkin：bg → speedEffectGroup → spinPanel → payoutGroup → betBoard
    用 Teleport 挂到舞台插槽，避免遮罩盖住车标/押注板
  -->
  <Teleport defer to="#bcbm-speed-fx-mount">
    <div v-show="speedLayerOn" class="fx-speed-layer" aria-hidden="true">
      <!-- 官方 SPINNING：speedEffectMask.alpha=0.6，且在 spin 之下 -->
      <div v-if="showSpeedMask" class="fx-speed-mask" />
      <!-- armature 锚点 (240,160) scale=0.7；DB 内多骨 ADD 爆发缩放 -->
      <div class="fx-speed-arm" :class="{ strong: speedStrong }">
        <div
          v-for="(ray, i) in speedRays"
          :key="`ray${i}`"
          class="fx-speed-ray-wrap"
          :style="ray.wrapStyle"
        >
          <img
            class="fx-speed-ray"
            :src="speedSrc"
            alt=""
            draggable="false"
            :style="ray.animStyle"
          />
        </div>
        <img
          v-if="showSpeedZoom"
          class="fx-speed-zoom"
          :src="speedZoomSrc"
          alt=""
          draggable="false"
        />
        <img
          v-if="showSpeedBlur"
          class="fx-speed-blur"
          :src="speedBlurSrc"
          alt=""
          draggable="false"
        />
      </div>
    </div>
  </Teleport>

  <Teleport defer to="#bcbm-payout-fx-mount">
    <div v-show="payoutLayerOn" class="fx-payout-layer" aria-hidden="true">
      <!--
        官方 yben_effect_final_common @ (240,220) scale=0.6
        reward_1: 四层 scifi 圈 + 四角 mask_effect_outline（青色括号框，非五边形）
        reward_2/3: 左右横贯 vfx_thunder_01 电弧 + glow
        不要用 lv2 环绕电弧围框——官网主视觉是括号框+左右电弧
      -->
      <div
        v-show="payoutArmOn"
        class="fx-payout-arm"
        :class="`anim-${payoutAnim}`"
      >
        <img
          class="fx-circle c01"
          :src="`${FX}/common/vfx_scifi_circle01.png`"
          alt=""
          draggable="false"
        />
        <img
          class="fx-circle c02"
          :src="`${FX}/common/vfx_scifi_circle02.png`"
          alt=""
          draggable="false"
        />
        <img
          class="fx-circle c03"
          :src="`${FX}/common/vfx_scifi_circle03.png`"
          alt=""
          draggable="false"
        />
        <img
          class="fx-circle c05"
          :src="`${FX}/common/vfx_scifi_circle05.png`"
          alt=""
          draggable="false"
        />

        <!-- 青色括号框：四角 outline，原尺寸 201×151，按骨骼翻转 -->
        <img
          v-for="(o, i) in cornerOutlines"
          :key="`ol${i}`"
          v-show="showCorners"
          class="fx-corner-outline"
          :src="`${FX}/common/mask_effect_outline.png`"
          alt=""
          draggable="false"
          :style="o.style"
        />

        <!-- 左右横贯电弧（官网主电弧） -->
        <img
          v-for="(t, i) in sideThunders"
          :key="`st${i}`"
          v-show="showSideThunder"
          class="fx-side-thunder"
          :src="`${FX}/common/vfx_thunder_01.png`"
          alt=""
          draggable="false"
          :style="t.style"
        />

        <img
          v-show="showGlow"
          class="fx-glow"
          :src="`${FX}/common/vfx_bg_txt_glow.png`"
          alt=""
          draggable="false"
        />
      </div>

      <img
        v-for="(c, i) in clones"
        :key="`c${i}`"
        class="fx-clone"
        :class="{ main: c.main, small: !c.main }"
        :src="c.src"
        alt=""
        draggable="false"
        :style="c.style"
      />

      <!-- 官方 bonusArmature scale=1，locale 横幅字 -->
      <img
        v-if="bannerSrc"
        class="fx-banner"
        :class="{ pop: bannerPop }"
        :src="bannerSrc"
        alt=""
        draggable="false"
      />
      <img
        v-if="bannerSrc && bannerPop"
        class="fx-banner-shadow"
        :src="bannerSrc"
        alt=""
        draggable="false"
      />

      <img
        v-for="(p, i) in papers"
        :key="`p${i}`"
        class="fx-paper"
        :style="p.style"
        :src="p.src"
        alt=""
        draggable="false"
      />

      <!-- 中心滚分：只用 win 字图；飞顶后改为左上「+金额」 -->
      <div
        v-if="amountVisible"
        class="fx-amount-wrap"
        :class="{
          top: amountAtTop,
          flying: amountFlying,
        }"
        :style="amountWrapStyle"
      >
        <div
          v-if="!amountAtTop"
          class="fx-amount-digits"
          :style="{ transform: `scaleY(${amountScaleY})` }"
        >
          <img
            v-for="(ch, i) in amountChars"
            :key="`${i}-${ch}`"
            class="fx-amount-digit"
            :src="glyphSrc(ch)"
            :style="digitStyle(ch)"
            alt=""
            draggable="false"
          />
        </div>
        <div v-else class="fx-amount-plus">+{{ amountText }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import {
  playBcbmCounting,
  endBcbmCounting,
  playBcbmPrizeLv,
  playBcbmFlash,
  endBcbmPayout,
  playBcbmBonusAnnounce,
  playBcbmFastJumpDing,
  bcbmCountDurationMs,
} from '@/games/bcbm/bcbmAudio'
import {
  bcbmWinDigitStyle,
  bcbmWinGlyphSrc,
  formatBcbmWinAmount,
  measureBcbmWinTextWidth,
} from '@/games/bcbm/bcbmWinFont'

const FX = '/images/games/bcbm/benz/fx'
const TXT = '/images/games/bcbm/benz/txt'

export type BcbmFxKind =
  | 'sanyuan'
  | 'sixi'
  | 'lightning'
  | 'uturn'
  | 'fast'
  | 'drift'
  | 'win'
  | 'none'

const showSpeed = ref(false)
const showSpeedZoom = ref(false)
const showSpeedBlur = ref(false)
const showSpeedMask = ref(false)
const speedStrong = ref(false)
const payoutArmOn = ref(false)
/** reward1 | reward2 | reward3 | reward4 | '' */
const payoutAnim = ref('')
const showCorners = ref(false)
const showSideThunder = ref(false)
const showGlow = ref(false)
const bannerSrc = ref('')
const bannerPop = ref(false)
const amountVisible = ref(false)
const amountAtTop = ref(false)
const amountFlying = ref(false)
const amountText = ref('')
const amountScale = ref(0.6)
const amountScaleY = ref(1)
const amountLeft = ref<number | null>(null)
const amountY = ref(400)
const clones = ref<
  Array<{
    src: string
    main: boolean
    style: Record<string, string>
  }>
>([])
const papers = ref<Array<{ src: string; style: Record<string, string> }>>([])
const speedFrame = ref(0)
const speedZoomFrame = ref(0)

let timers: number[] = []
let running: Promise<void> | null = null
let speedTickId = 0
let amountRaf = 0

/**
 * 手机基类 GameAppPage（benz2221）：
 * payoutArmatureDisplayY=220 scale=0.6
 * bonusArmatureDisplayScale=1
 * reward_1 ≈ 35f@24fps ≈ 1460ms；reward_2/3 ≈ 50f ≈ 2080ms；reward_4 ≈ 1460ms
 */
const STAGE_W = 480
const PAYOUT_Y = 220
const SMALL_ICON_Y = 310
const ICON_NATIVE = 112
const LARGE_ICON = ICON_NATIVE
const SMALL_ICON = Math.round(ICON_NATIVE * 0.5)
const FLY_MS = 500
const REWARD1_MS = 1460
const REWARD2_MS = 2080
const REWARD4_MS = 1460
const AMOUNT_CENTER_Y = 400
const AMOUNT_CENTER_SCALE = 0.6
/** 飞顶后短暂停留；过长会拖慢整段派彩 */
const AMOUNT_TOP_HOLD_MS = 480
const AMOUNT_FLY_MS = 480
/** 余额旁兜底坐标（测不到 #bcbm-balance 时） */
const BALANCE_FALLBACK = { x: 58, y: 28 }

/**
 * 四角青色括号框 mask_effect_outline（官网主框，不是五边形电框）
 * TL(-273.7,-160.9) scY=-1 | TR(273.7,-160.9) scX=scY=-1
 * BL(-273.7,134) | BR(273.7,134) scX=-1
 * 贴图 201×151，保持原比例，禁止拉大成围框
 */
const cornerOutlines = [
  {
    style: {
      left: '-273.7px',
      top: '-160.9px',
      transform: 'translate(-50%, -50%) scaleY(-1)',
    },
  },
  {
    style: {
      left: '273.7px',
      top: '-160.9px',
      transform: 'translate(-50%, -50%) scale(-1, -1)',
    },
  },
  {
    style: {
      left: '-273.7px',
      top: '134px',
      transform: 'translate(-50%, -50%)',
    },
  },
  {
    style: {
      left: '273.7px',
      top: '134px',
      transform: 'translate(-50%, -50%) scaleX(-1)',
    },
  },
]

/**
 * 左右横贯电弧 vfx_thunder_01（官网主电弧）
 * 官网 4 槽：L / L1 / R / R1，各带 display 偏移+缩放（不是居中一整条粗光带）
 * 骨位 L(-423.4,26.85) L1(-403.4,46.85) R/R1(427.05,12.2)
 * 贴图 705×344，pivot=中心；CSS = 骨位 + display(x,y) + scale/rotate
 */
function thunderStyle(
  boneX: number,
  boneY: number,
  dx: number,
  dy: number,
  scX: number,
  scY: number,
  skDeg = 0,
) {
  const rot = skDeg ? ` rotate(${skDeg}deg)` : ''
  return {
    left: `${boneX + dx}px`,
    top: `${boneY + dy}px`,
    transform: `translate(-50%, -50%) scale(${scX}, ${scY})${rot}`,
  }
}

const sideThunders = [
  // vfx_thunder_L display0
  {
    style: {
      ...thunderStyle(-423.4, 26.85, 57.87, -21.6, 0.8, 0.7, 2.88),
      animationDelay: '0s',
      opacity: '0.85',
    },
  },
  // vfx_thunder_L1 display1（偏右、略扁，叠出分支感）
  {
    style: {
      ...thunderStyle(-403.4, 46.85, 198.9, -18.51, 1.09, 0.77, 0),
      animationDelay: '0.07s',
      opacity: '0.7',
    },
  },
  // vfx_thunder_R display0
  {
    style: {
      ...thunderStyle(427.05, 12.2, 24.35, 23.79, -0.8, 0.7, -3.68),
      animationDelay: '0.04s',
      opacity: '0.85',
    },
  },
  // vfx_thunder_R1 display2
  {
    style: {
      ...thunderStyle(427.05, 12.2, -156.06, -14.21, -0.7, 0.7, 5.36),
      animationDelay: '0.11s',
      opacity: '0.7',
    },
  },
]

export type CloneFrom = { src: string; x: number; y: number; scale: number }

export type PayoutOpts = {
  kind: Exclude<BcbmFxKind, 'win' | 'none'> | null
  clones: CloneFrom[]
  payout: number
  payoutLevel: number
  /** 报奖旁白用（sixi_red / sanyuan_benz 等）；缺省则用 kind */
  awardType?: string
  /** 官方滚分时长公式需要 totalBet */
  totalBet?: number
}

const SPEED_WEAK = [
  `${FX}/speed2/vfx_speed_line_3.png`,
  `${FX}/speed2/vfx_speed_line_4.png`,
]
const SPEED_STRONG = [
  `${FX}/speed/vfx_speed_line_1.png`,
  `${FX}/speed/vfx_speed_line_2.png`,
]
const ZOOM_WEAK = [`${FX}/speed2/vfx_circle_zoom_3.png`]
const ZOOM_STRONG = [
  `${FX}/speed/vfx_circle_zoom_1.png`,
  `${FX}/speed/vfx_circle_zoom_2.png`,
]
const PAPER_SRCS = [
  `${FX}/particles/yben_vfx_reward_paper_1.png`,
  `${FX}/particles/yben_vfx_reward_paper_2.png`,
]

/**
 * 官方 speedup_effect：同一张放射贴图挂在多根 bone 上，短脉冲 sc 0.01→8（大线→20），
 * 再配合旋转相位。勿把 8 份全图叠到 maxScale≈1.2（糊成一团、往外爆不开）。
 */
const SPEED_RAY_DEFS = [
  { rot: 0, delay: '0s', dur: '0.72s', peak: 8 },
  { rot: 40, delay: '0.18s', dur: '0.68s', peak: 8 },
  { rot: 90, delay: '0.08s', dur: '0.7s', peak: 12 },
  { rot: 145, delay: '0.28s', dur: '0.66s', peak: 8 },
]

const speedLayerOn = computed(
  () => showSpeedMask.value || showSpeed.value || showSpeedZoom.value || showSpeedBlur.value,
)
const payoutLayerOn = computed(
  () =>
    payoutArmOn.value ||
    showGlow.value ||
    !!bannerSrc.value ||
    amountVisible.value ||
    clones.value.length > 0 ||
    papers.value.length > 0,
)

const speedSrc = computed(() => {
  const frames = speedStrong.value ? SPEED_STRONG : SPEED_WEAK
  return frames[speedFrame.value % frames.length]
})
const speedZoomSrc = computed(() => {
  const frames = speedStrong.value ? ZOOM_STRONG : ZOOM_WEAK
  return frames[speedZoomFrame.value % frames.length]
})
const speedBlurSrc = computed(() =>
  speedStrong.value ? `${FX}/speed/vfx_bg_blur.png` : `${FX}/speed2/vfx_bg_blur.png`,
)

const speedRays = computed(() => {
  if (!showSpeed.value)
    return [] as Array<{
      wrapStyle: Record<string, string>
      animStyle: Record<string, string>
    }>
  const speedMul = speedStrong.value ? 0.42 : 1
  return SPEED_RAY_DEFS.map((d) => ({
    wrapStyle: { transform: `rotate(${d.rot}deg)` },
    animStyle: {
      animationDuration: `${parseFloat(d.dur) * speedMul}s`,
      animationDelay: d.delay,
      '--speed-peak': String(d.peak),
    },
  }))
})

const BANNER: Record<Exclude<BcbmFxKind, 'win' | 'none'>, string> = {
  sanyuan: `${TXT}/yben_txt_three_great_scholars_hans.png`,
  sixi: `${TXT}/yben_txt_four_great_blessings_hans.png`,
  lightning: `${TXT}/yben_txt_lightning_bolt_hans.png`,
  uturn: `${TXT}/yben_txt_u_turn_hans.png`,
  fast: `${TXT}/yben_txt_fast_and_furious_hans.png`,
  drift: `${TXT}/yben_txt_total_drift_hans.png`,
}

const amountChars = computed(() => amountText.value.split(''))
const amountWrapStyle = computed(() => {
  if (amountAtTop.value && amountLeft.value != null) {
    // 飞向左上余额旁；全程以中心点插值，落点在余额数字右侧
    return {
      left: `${amountLeft.value}px`,
      top: `${amountY.value}px`,
      transform: 'translate(-50%, -50%)',
      transition: amountFlying.value
        ? `left ${AMOUNT_FLY_MS}ms cubic-bezier(0.33, 0.1, 0.25, 1), top ${AMOUNT_FLY_MS}ms cubic-bezier(0.33, 0.1, 0.25, 1)`
        : 'none',
    }
  }
  const w = measureBcbmWinTextWidth(amountText.value || '0', amountScale.value)
  return {
    left: '50%',
    top: `${amountY.value}px`,
    width: `${w}px`,
    transform: 'translate(-50%, -50%)',
    transition: 'none',
  }
})

function digitStyle(ch: string) {
  return bcbmWinDigitStyle(ch, amountScale.value)
}

function glyphSrc(ch: string) {
  return bcbmWinGlyphSrc(ch)
}

/** 金额显示时抬高 payout 插槽，避免被押注板挡住（官方此时面板已下移到 y=505） */
watch(amountVisible, (on) => {
  const el = document.getElementById('bcbm-payout-fx-mount')
  if (el) el.classList.toggle('fx-mount-amount-up', on)
})

function clearTimers() {
  for (const t of timers) window.clearInterval(t)
  timers = []
  if (amountRaf) {
    cancelAnimationFrame(amountRaf)
    amountRaf = 0
  }
}

function every(ms: number, fn: () => void) {
  const id = window.setInterval(fn, ms)
  timers.push(id)
  return id
}

function sleep(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms))
}

function resetLayers() {
  showSpeed.value = false
  showSpeedZoom.value = false
  showSpeedBlur.value = false
  showSpeedMask.value = false
  speedStrong.value = false
  payoutArmOn.value = false
  payoutAnim.value = ''
  showCorners.value = false
  showSideThunder.value = false
  showGlow.value = false
  bannerSrc.value = ''
  bannerPop.value = false
  amountVisible.value = false
  amountAtTop.value = false
  amountFlying.value = false
  amountText.value = ''
  amountScale.value = AMOUNT_CENTER_SCALE
  amountScaleY.value = 1
  amountLeft.value = null
  amountY.value = AMOUNT_CENTER_Y
  clones.value = []
  papers.value = []
  speedFrame.value = 0
  speedZoomFrame.value = 0
  speedTickId = 0
}

function spawnPapers(n = 12) {
  const list = []
  for (let i = 0; i < n; i++) {
    list.push({
      src: PAPER_SRCS[i % PAPER_SRCS.length],
      style: {
        left: `${10 + Math.random() * 80}%`,
        animationDelay: `${Math.random() * 0.5}s`,
        animationDuration: `${1.2 + Math.random()}s`,
      },
    })
  }
  papers.value = list
}

function stop() {
  clearTimers()
  resetLayers()
  const el = document.getElementById('bcbm-payout-fx-mount')
  if (el) el.classList.remove('fx-mount-amount-up')
  running = null
}

function ensureSpeedTick(ms: number) {
  if (speedTickId) {
    window.clearInterval(speedTickId)
    timers = timers.filter((t) => t !== speedTickId)
  }
  speedTickId = every(ms, () => {
    if (showSpeed.value) speedFrame.value++
    if (showSpeedZoom.value) speedZoomFrame.value++
  })
}

function startSpeedWeak() {
  speedStrong.value = false
  showSpeedMask.value = true
  showSpeed.value = true
  showSpeedZoom.value = true
  showSpeedBlur.value = true
  speedFrame.value = 0
  speedZoomFrame.value = 0
  ensureSpeedTick(42)
}

function startSpeedStrong() {
  speedStrong.value = true
  showSpeedMask.value = true
  showSpeed.value = true
  showSpeedZoom.value = true
  showSpeedBlur.value = true
  speedFrame.value = 0
  speedZoomFrame.value = 0
  ensureSpeedTick(14)
}

function startSpeed() {
  startSpeedWeak()
}

function stopSpeed() {
  showSpeed.value = false
  showSpeedZoom.value = false
  showSpeedBlur.value = false
  showSpeedMask.value = false
  speedStrong.value = false
  if (speedTickId) {
    window.clearInterval(speedTickId)
    timers = timers.filter((t) => t !== speedTickId)
    speedTickId = 0
  }
}

async function playSpeedup(ms = 1600) {
  startSpeedWeak()
  await sleep(ms)
  stopSpeed()
}

function layoutFlyTargets(list: CloneFrom[]) {
  if (!list.length)
    return [] as Array<{
      src: string
      from: CloneFrom
      toX: number
      toY: number
      toW: number
      main: boolean
    }>
  const main = list[0]!
  const out: Array<{
    src: string
    from: CloneFrom
    toX: number
    toY: number
    toW: number
    main: boolean
  }> = [
    {
      src: main.src,
      from: main,
      toX: STAGE_W / 2,
      toY: PAYOUT_Y,
      toW: LARGE_ICON,
      main: true,
    },
  ]
  const seen = new Set<string>([main.src])
  const slots: Array<{ src: string; from: CloneFrom }> = []
  for (let i = 1; i < list.length; i++) {
    const c = list[i]!
    if (c.src === main.src) {
      out.push({
        src: c.src,
        from: c,
        toX: STAGE_W / 2,
        toY: PAYOUT_Y,
        toW: LARGE_ICON,
        main: true,
      })
      continue
    }
    if (seen.has(c.src)) continue
    seen.add(c.src)
    slots.push({ src: c.src, from: c })
  }
  const row1Y = SMALL_ICON_Y
  const row2Y = SMALL_ICON_Y + SMALL_ICON
  const n = slots.length
  const row1 = Math.min(n, 6)
  const row2 = Math.max(0, n - 6)
  const span1 = SMALL_ICON * row1
  const span2 = SMALL_ICON * row2
  const left1 = STAGE_W / 2 - span1 / 2
  const left2 = STAGE_W / 2 - span2 / 2
  slots.forEach((s, i) => {
    const row = i < 6 ? 0 : 1
    const col = i < 6 ? i : i - 6
    const left = row === 0 ? left1 : left2
    const y = row === 0 ? row1Y : row2Y
    out.push({
      src: s.src,
      from: s.from,
      toX: left + col * SMALL_ICON + SMALL_ICON / 2,
      toY: y,
      toW: SMALL_ICON,
      main: false,
    })
  })
  return out
}

function setClonesAt(
  targets: ReturnType<typeof layoutFlyTargets>,
  phase: 'from' | 'to',
) {
  clones.value = targets.map((t) => {
    const x = phase === 'from' ? t.from.x : t.toX
    const y = phase === 'from' ? t.from.y : t.toY
    const w = phase === 'from' ? Math.max(36, LARGE_ICON * t.from.scale) : t.toW
    return {
      src: t.src,
      main: t.main,
      style: {
        left: `${x}px`,
        top: `${y}px`,
        width: `${w}px`,
        height: `${w}px`,
        marginLeft: `${-w / 2}px`,
        marginTop: `${-w / 2}px`,
        transition:
          phase === 'to'
            ? `left ${FLY_MS}ms ease-out, top ${FLY_MS}ms ease-out, width ${FLY_MS}ms ease-out, height ${FLY_MS}ms ease-out, margin-left ${FLY_MS}ms ease-out, margin-top ${FLY_MS}ms ease-out, opacity 400ms ease`
            : 'none',
        opacity: '1',
      },
    }
  })
}

function setAmountCenter(text: string) {
  amountAtTop.value = false
  amountFlying.value = false
  amountLeft.value = null
  amountY.value = AMOUNT_CENTER_Y
  amountScale.value = AMOUNT_CENTER_SCALE
  amountScaleY.value = 1
  amountText.value = text
  amountVisible.value = true
}

/** 舞台坐标下，余额数字右侧中点（飞「+金额」落点） */
function getBalancePlusPos() {
  const bal = document.getElementById('bcbm-balance')
  const stage = document.querySelector('.stage') as HTMLElement | null
  if (!bal || !stage) return { ...BALANCE_FALLBACK }
  const br = bal.getBoundingClientRect()
  const sr = stage.getBoundingClientRect()
  const sx = sr.width / STAGE_W || 1
  const sy = sr.height / 715 || sx
  return {
    // 落在余额数字右侧紧挨着
    x: (br.right - sr.left) / sx + 28,
    y: (br.top + br.height / 2 - sr.top) / sy,
  }
}


/**
 * 官方 ShowAmount：中心从 0 滚到总奖金，再飞到左上余额旁变成「+金额」。
 * 滚分时长对齐官网：Lv≤1 瞬间；Lv2=2s；Lv≥3=min(14s, 2s+倍率公式)
 */
async function showAmountWithCount(
  payout: number,
  payoutLevel: number,
  totalBet = 0,
) {
  const target = Math.max(0, Math.round(payout))
  const finalText = formatBcbmWinAmount(target)
  const countMs = bcbmCountDurationMs(payout, totalBet, payoutLevel)

  if (countMs <= 0) {
    setAmountCenter(finalText)
    await sleep(120)
    return 0
  }

  setAmountCenter(formatBcbmWinAmount(0))
  await sleep(80)

  await new Promise<void>((resolve) => {
    const t0 = performance.now()
    let lastShown = -1
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / countMs)
      const eased = 1 - Math.pow(1 - p, 2)
      const cur = Math.round(target * eased)
      if (cur !== lastShown) {
        lastShown = cur
        amountText.value = formatBcbmWinAmount(cur)
      }
      if (p < 1) {
        amountRaf = requestAnimationFrame(tick)
      } else {
        amountText.value = finalText
        amountRaf = 0
        resolve()
      }
    }
    amountRaf = requestAnimationFrame(tick)
  })
  await sleep(280)
  return countMs
}

/**
 * 中心金额飞到左上余额旁，变成「+多少」
 */
async function flashAmountToTop() {
  if (!amountVisible.value) return
  const text = amountText.value || formatBcbmWinAmount(0)
  playBcbmFlash()

  // 先从中心当前位置起步，再开 transition 飞向余额
  const wrap = document.querySelector('.fx-amount-wrap') as HTMLElement | null
  const stage = document.querySelector('.stage') as HTMLElement | null
  let startLeft = STAGE_W / 2
  let startTop = AMOUNT_CENTER_Y
  if (wrap && stage) {
    const wr = wrap.getBoundingClientRect()
    const sr = stage.getBoundingClientRect()
    const sx = sr.width / STAGE_W || 1
    const sy = sr.height / 715 || sx
    startLeft = (wr.left + wr.width / 2 - sr.left) / sx
    startTop = (wr.top + wr.height / 2 - sr.top) / sy
  }

  const pos = getBalancePlusPos()
  amountFlying.value = false
  amountAtTop.value = true
  // 飞顶展示「+1,888」形式
  amountText.value = Number(text).toLocaleString('en-US')
  amountLeft.value = startLeft
  amountY.value = startTop
  await nextTick()
  await waitFrames(2)
  // 先挂上 transition，再改坐标，否则会跳变
  amountFlying.value = true
  await nextTick()
  await waitFrames(2)
  amountLeft.value = pos.x
  amountY.value = pos.y
  await sleep(AMOUNT_FLY_MS + 40)
  amountFlying.value = false
  await sleep(AMOUNT_TOP_HOLD_MS)
}

function waitFrames(n = 2) {
  return new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })
}

async function playPayout(opts: PayoutOpts) {
  if (running) await running
  running = (async () => {
    clearTimers()
    resetLayers()

    const { kind, payout, payoutLevel } = opts
    const totalBet = opts.totalBet ?? 0
    const targets = layoutFlyTargets(opts.clones)
    const hasBonus = !!kind

    // —— reward_1_start：四层圈 + 四角青色括号框；无侧雷、无 glow ——
    payoutArmOn.value = true
    payoutAnim.value = 'reward1'
    showCorners.value = true
    showSideThunder.value = false
    showGlow.value = false

    setClonesAt(targets, 'from')
    await nextTick()
    await waitFrames(2)
    setClonesAt(targets, 'to')
    await sleep(Math.max(REWARD1_MS, FLY_MS + 120))

    // —— reward_2：左右横贯电弧 + glow + 特殊奖横幅 + 中文报奖 ——
    if (hasBonus) {
      payoutAnim.value = 'reward2'
      showSideThunder.value = true
      showGlow.value = true
      bannerSrc.value = BANNER[kind!]
      bannerPop.value = true
      playBcbmBonusAnnounce(opts.awardType || kind!)
      await sleep(220)
      bannerPop.value = false
      await sleep(REWARD2_MS - 220)
      bannerSrc.value = ''
    }

    if (targets.length > 7) {
      clones.value = clones.value.map((c) =>
        c.main ? c : { ...c, style: { ...c.style, opacity: '0' } },
      )
    }

    // —— reward_3_bg_loop：滚分；电弧继续横贯（不用环绕电框） ——
    payoutAnim.value = 'reward3'
    showSideThunder.value = true
    showGlow.value = true
    playBcbmCounting(payoutLevel)
    if (payoutLevel >= 3) {
      playBcbmPrizeLv(payoutLevel, hasBonus)
      if (payoutLevel >= 4) spawnPapers(16)
    }
    if (payout > 0) {
      showGlow.value = false
      await showAmountWithCount(payout, payoutLevel, totalBet)
      endBcbmCounting()
      // —— reward_4_end：收缩 + 金额飞顶 ——
      payoutAnim.value = 'reward4'
      showCorners.value = false
      showSideThunder.value = false
      showGlow.value = false
      const jump = flashAmountToTop()
      await Promise.all([sleep(REWARD4_MS), jump])
    } else {
      endBcbmCounting()
      playBcbmFlash()
      payoutAnim.value = 'reward4'
      showCorners.value = false
      showSideThunder.value = false
      showGlow.value = false
      await sleep(REWARD4_MS)
    }
    endBcbmPayout(hasBonus)
    papers.value = []
    amountVisible.value = false
    amountAtTop.value = false
    amountFlying.value = false
    clones.value = []
    payoutArmOn.value = false
    payoutAnim.value = ''
    showCorners.value = false
    showSideThunder.value = false
    showGlow.value = false
    clearTimers()
    speedTickId = 0
  })()
  await running
  running = null
}

async function playSpecial(kind: Exclude<BcbmFxKind, 'win' | 'none'>) {
  await playPayout({ kind, clones: [], payout: 0, payoutLevel: 3 })
}

async function playWin(payout: number) {
  if (payout <= 0) return
  if (running) await running
  running = (async () => {
    // 官方 FastJumpAmount：ding@0 + ding@800，与跳分同时
    playBcbmFastJumpDing()
    await showAmountWithCount(payout, 1, 0)
    await flashAmountToTop()
    amountVisible.value = false
    amountAtTop.value = false
    amountFlying.value = false
  })()
  await running
  running = null
}

onBeforeUnmount(stop)

defineExpose({
  playSpeedup,
  startSpeed,
  startSpeedWeak,
  startSpeedStrong,
  stopSpeed,
  playSpecial,
  playPayout,
  playWin,
  stop,
})
</script>

<style scoped>
/* —— 速度层：在灯环之下 —— */
.fx-speed-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 480px;
  height: 715px;
  pointer-events: none;
  overflow: hidden;
  /* 勿 isolation，否则 ADD/screen 抠不出黑底 */
}

.fx-speed-mask {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0.6;
  pointer-events: none;
}

/* 官方 speedArmature：x=width/2 y=160 scale=0.7；aabb 512 */
.fx-speed-arm {
  position: absolute;
  left: 240px;
  top: 160px;
  width: 512px;
  height: 512px;
  margin-left: -256px;
  margin-top: -256px;
  transform: scale(0.7);
  transform-origin: center center;
}
.fx-speed-arm.strong {
  transform: scale(0.7);
}

.fx-speed-ray-wrap {
  position: absolute;
  left: 0;
  top: 0;
  width: 512px;
  height: 512px;
  transform-origin: center center;
}
.fx-speed-ray {
  position: absolute;
  left: 0;
  top: 0;
  width: 512px;
  height: 512px;
  object-fit: fill;
  /* 官方 DB slot blendMode=add */
  mix-blend-mode: plus-lighter;
  animation-name: speedBurst;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
  transform-origin: center center;
  --speed-peak: 8;
}

.fx-speed-zoom {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 220px;
  margin-left: -110px;
  margin-top: -110px;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  animation: zoomBurst 0.9s ease-out infinite;
}

.fx-speed-blur {
  position: absolute;
  left: 50%;
  top: 50%;
  /* DB：271×51 × scX4.95 / scY4.52，aM=70 */
  width: 271px;
  height: 51px;
  margin-left: -135.5px;
  margin-top: -25.5px;
  transform: scale(4.95, 4.52);
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  opacity: 0.55;
}

/* —— 派彩层：在灯环之上、押注板之下 —— */
.fx-payout-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 480px;
  height: 715px;
  pointer-events: none;
  /* 侧雷会超出中心，勿裁切 */
  overflow: visible;
}

.fx-payout-arm {
  position: absolute;
  left: 240px;
  top: 220px;
  width: 0;
  height: 0;
  transform: scale(0.6);
  transform-origin: center center;
}
.fx-payout-arm.anim-reward4 {
  animation: payoutArmShrink 1.2s ease-in forwards;
}

.fx-circle {
  position: absolute;
  left: 0;
  top: 0;
  width: 220px;
  height: 220px;
  margin-left: -110px;
  margin-top: -110px;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  opacity: 0;
  pointer-events: none;
}
/* skin display 缩放：c05×1.9 / c03×1.7 / c01×1.5 / c02×1.2 */
.fx-circle.c05 {
  transform: scale(0.02);
  filter: brightness(1.15) saturate(1.4);
}
.fx-circle.c03 {
  transform: scale(0.02);
  opacity: 0;
  filter: brightness(1.1) saturate(1.3);
}
.fx-circle.c02 {
  transform: scale(0.02);
  opacity: 0;
  filter: brightness(1.05) saturate(1.2);
}
.fx-circle.c01 {
  transform: scale(0.02);
  opacity: 0;
  filter: brightness(1.05) saturate(1.2);
}

.anim-reward1 .fx-circle.c05 {
  animation: circlePop05 1.46s ease-out forwards;
}
.anim-reward1 .fx-circle.c03 {
  animation: circlePop03 1.46s ease-out forwards;
}
.anim-reward1 .fx-circle.c02 {
  animation: circlePop02 1.46s ease-out forwards;
}
.anim-reward1 .fx-circle.c01 {
  animation: circlePop01 1.46s ease-out forwards;
}
.anim-reward2 .fx-circle.c05,
.anim-reward3 .fx-circle.c05 {
  opacity: 0.95;
  transform: scale(1.9);
  animation: circleSpinSlow 2.08s linear infinite;
}
.anim-reward2 .fx-circle.c03,
.anim-reward3 .fx-circle.c03 {
  opacity: 0.7;
  transform: scale(1.7) rotate(-90deg);
  animation: circleSpin03 2.08s linear infinite;
}
.anim-reward2 .fx-circle.c02,
.anim-reward3 .fx-circle.c02 {
  opacity: 0.7;
  transform: scale(1.3);
  animation: circlePulse02 2.08s ease-in-out infinite;
}
.anim-reward2 .fx-circle.c01,
.anim-reward3 .fx-circle.c01 {
  opacity: 0.7;
  transform: scale(1.5);
}
.anim-reward4 .fx-circle {
  animation: none !important;
  opacity: 0;
  transform: scale(0.02);
  transition: opacity 0.6s ease, transform 0.8s ease;
}

/* 青色括号框：原图 201×151，四角翻转拼接（勿拉大） */
.fx-corner-outline {
  position: absolute;
  width: 201px;
  height: 151px;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  opacity: 0.95;
  pointer-events: none;
  z-index: 2;
}
.anim-reward1 .fx-corner-outline {
  animation: cornerIn 0.55s ease-out 0.15s both;
}

.fx-side-thunder {
  position: absolute;
  width: 705px;
  height: 344px;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  /* 官网 add 槽：左右分支电弧，勿做成顶部粗光带 */
  opacity: 0.85;
  pointer-events: none;
  z-index: 3;
  animation: sideThunderFlicker 0.18s steps(2) infinite;
}

.fx-glow {
  position: absolute;
  left: 20px;
  top: 20px;
  /* 官网贴图 1237×286，arm 内约半宽即可，避免盖住中心 */
  width: 620px;
  height: 143px;
  margin-left: -310px;
  margin-top: -72px;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
  opacity: 0.35;
  animation: glowPulse 1.2s ease-in-out infinite alternate;
  pointer-events: none;
}

.fx-banner {
  position: absolute;
  left: 50%;
  top: 220px;
  /* 原图约 460×152，bonus scale=1 */
  width: 460px;
  height: auto;
  transform: translate(-50%, -50%) scale(1);
  object-fit: contain;
  mix-blend-mode: plus-lighter;
  transition: transform 0.16s ease-out;
  z-index: 6;
}
.fx-banner.pop {
  transform: translate(-50%, -50%) scale(1.12);
}
.fx-banner-shadow {
  position: absolute;
  left: 50%;
  top: 220px;
  width: 460px;
  height: auto;
  transform: translate(-50%, -50%) scale(0.01);
  object-fit: contain;
  mix-blend-mode: plus-lighter;
  opacity: 0.55;
  z-index: 5;
  pointer-events: none;
  animation: bannerShadowBurst 0.55s ease-out forwards;
}

.fx-clone {
  position: absolute;
  object-fit: contain;
  z-index: 5;
  pointer-events: none;
}
.fx-clone.main {
  z-index: 5;
}
.fx-clone.small {
  z-index: 4;
}

/* 中心滚分字图；飞顶后变左上「+金额」——无 line/dot 底光 */
.fx-amount-wrap {
  position: absolute;
  z-index: 7;
  pointer-events: none;
  transform-origin: left center;
  overflow: visible;
}
.fx-amount-digits {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: flex-start;
  transform-origin: center center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
  overflow: visible;
}
.fx-amount-digit {
  display: block;
  object-fit: fill;
  mix-blend-mode: normal;
  overflow: visible;
  pointer-events: none;
  /* 字图自带描边发光，勿再叠 filter 以免发糊发脏 */
  filter: none;
}
.fx-amount-plus {
  font-family: 'DIN Alternate', 'Segoe UI', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #7dffb0;
  background: transparent;
  text-shadow:
    0 0 6px rgba(80, 255, 160, 0.85),
    0 0 14px rgba(40, 200, 120, 0.55),
    0 1px 2px rgba(0, 0, 0, 0.65);
  white-space: nowrap;
  animation: plusPop 0.28s ease-out;
}
.fx-amount-wrap.flying .fx-amount-plus {
  animation: none;
  opacity: 0.95;
  transform: scale(1.05);
}

.fx-paper {
  position: absolute;
  top: -6%;
  width: 22px;
  height: 22px;
  object-fit: contain;
  mix-blend-mode: plus-lighter;
  animation-name: fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

/* DB bone：sc 0.01 → ~8 脉冲（外层已转角） */
@keyframes speedBurst {
  0% {
    transform: scale(0.01);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  22% {
    transform: scale(var(--speed-peak, 8));
    opacity: 0.95;
  }
  55% {
    transform: scale(0.01);
    opacity: 0;
  }
  100% {
    transform: scale(0.01);
    opacity: 0;
  }
}
@keyframes zoomBurst {
  0% {
    transform: scale(0.2);
    opacity: 0;
  }
  18% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(0.15);
    opacity: 0;
  }
}
@keyframes plusPop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes circlePop05 {
  0% {
    transform: scale(0.02);
    opacity: 0;
  }
  8% {
    transform: scale(0.02);
    opacity: 0;
  }
  37% {
    transform: scale(1.9);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.9);
    opacity: 0.95;
  }
}
@keyframes circlePop03 {
  0%,
  31% {
    transform: scale(0.02);
    opacity: 0;
  }
  51% {
    transform: scale(1.7) rotate(-90deg);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.7) rotate(-90deg);
    opacity: 0.7;
  }
}
@keyframes circlePop02 {
  0%,
  51% {
    transform: scale(0.02);
    opacity: 0;
  }
  71% {
    transform: scale(1.2);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}
@keyframes circlePop01 {
  0%,
  43% {
    transform: scale(0.02);
    opacity: 0;
  }
  63% {
    transform: scale(1.5);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.5);
    opacity: 0.7;
  }
}
@keyframes circleSpinSlow {
  from {
    transform: scale(1.9) rotate(0deg);
  }
  to {
    transform: scale(1.9) rotate(360deg);
  }
}
@keyframes circleSpin03 {
  from {
    transform: scale(1.7) rotate(-90deg);
  }
  to {
    transform: scale(1.7) rotate(270deg);
  }
}
@keyframes circlePulse02 {
  0%,
  100% {
    transform: scale(1.2);
  }
  50% {
    transform: scale(1.35);
  }
}
@keyframes sideThunderFlicker {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.95;
  }
}
@keyframes cornerIn {
  from {
    opacity: 0;
    filter: brightness(2);
  }
  to {
    opacity: 0.95;
    filter: brightness(1);
  }
}
@keyframes glowPulse {
  from {
    opacity: 0.35;
    transform: scaleX(0.55) scaleY(1.2);
  }
  to {
    opacity: 0.65;
    transform: scaleX(0.7) scaleY(1.5);
  }
}
@keyframes bannerShadowBurst {
  0% {
    transform: translate(-50%, -50%) scale(0.01);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.4);
    opacity: 0;
  }
}
@keyframes payoutArmShrink {
  to {
    transform: scale(0.15);
    opacity: 0;
  }
}
@keyframes fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(720px) rotate(400deg);
    opacity: 0.15;
  }
}
</style>
