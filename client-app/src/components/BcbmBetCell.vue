<template>
  <!-- 官方 BetItemL/M/S：外圈由 sparks + mid + 旋转 out 拼成 -->
  <button
    type="button"
    class="bet-cell"
    :class="[`size-${bet.size}`, { win: win, down: pressed }]"
    :style="xyStyle"
    :disabled="disabled"
    @pointerdown="pressed = true"
    @pointerup="pressed = false"
    @pointerleave="pressed = false"
    @pointercancel="pressed = false"
    @click="$emit('bet')"
  >
    <!-- 小光点 sparks（betGlowImage0..N） -->
    <img
      v-for="(sp, i) in sparks"
      :key="`sp${i}`"
      class="spark"
      :src="sparkUrl"
      alt=""
      draggable="false"
      :style="sparkStyle(sp, i)"
    />

    <!-- L/M：中环 + 外环（外环持续旋转） -->
    <template v-if="bet.size !== 'S'">
      <img
        class="glow-mid"
        :src="midUrl"
        alt=""
        draggable="false"
        :style="midStyle"
      />
      <img
        class="glow-out"
        :class="{ cw: rotateCw }"
        :src="outUrl"
        alt=""
        draggable="false"
        :style="outStyle"
      />
    </template>

    <!-- 按下高亮 -->
    <div
      v-if="bet.size !== 'S'"
      class="highlight"
      :style="highlightStyle"
    />
    <img
      v-else
      class="highlight-add"
      :src="addUrl"
      alt=""
      draggable="false"
      :style="addStyle"
    />

    <img
      class="icon"
      :src="iconUrl"
      alt=""
      draggable="false"
      :style="iconStyle"
    />
    <img
      class="odds"
      :src="oddsUrl"
      alt=""
      draggable="false"
      :style="oddsStyle"
    />
    <div v-if="amount > 0" class="amt" :style="amtStyle">
      <img :src="txtbox" alt="" draggable="false" />
      <span :style="{ fontSize: skin.amtFont + 'px' }">{{ amount }}</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BCBM_PLAYTYPE_META } from '@/games/bcbm/bcbmSpinMath'
import {
  BET_SKIN,
  BET_GLOW_SPARKS,
  BET_GLOW_RING,
  BET_HIGHLIGHT,
  H5,
  type PanelBet,
} from '@/games/bcbm/mobilePanelLayout'

const props = defineProps<{
  bet: PanelBet
  amount: number
  win?: boolean
  disabled?: boolean
  /** 官方 setBet：sqrt(bet/limit) 点亮 spark 比例 */
  betLimit?: number
}>()

defineEmits<{ bet: [] }>()

const pressed = ref(false)
const skin = computed(() => BET_SKIN[props.bet.size])
const meta = computed(() => BCBM_PLAYTYPE_META[props.bet.playType])
const color = computed(() => meta.value.color)
const sparks = computed(() => BET_GLOW_SPARKS[props.bet.size])
const ring = computed(() => BET_GLOW_RING[props.bet.size])
/** playType≥9（奔驰）外环正转，其余反转 */
const rotateCw = computed(() => props.bet.playType >= 9)

const xyStyle = computed(() => ({
  left: `${props.bet.x}px`,
  top: `${props.bet.y}px`,
  width: `${props.bet.w}px`,
  height: `${props.bet.h}px`,
}))

const sparkUrl = computed(() => {
  const kind = props.bet.size === 'S' ? 'minibet' : 'largebet'
  return `/images/games/bcbm/benz/bet/yben_vfx_glow_${kind}_${color.value}.png`
})
const midUrl = computed(
  () =>
    `/images/games/bcbm/benz/bet/yben_vfx_bet_glow_mid_line_${color.value}.png`,
)
const outUrl = computed(
  () =>
    `/images/games/bcbm/benz/bet/yben_vfx_bet_glow_out_line_${color.value}.png`,
)
const addUrl = computed(
  () => `/images/games/bcbm/benz/bet/yben_vfx_add_${color.value}.png`,
)
const iconUrl = computed(
  () =>
    `/images/games/bcbm/benz/bet/yben_icon_bet_${meta.value.brand}_${color.value}.png`,
)
const oddsUrl = computed(
  () => `/images/games/bcbm/benz/bet/yben_txt_x${meta.value.mult}.png`,
)
const txtbox = H5.txtbox

/** 无下注 spark/mid α=0.3；有下注按额度点亮 */
const litCount = computed(() => {
  const n = sparks.value.length
  if (props.amount <= 0) return 0
  const limit = props.betLimit && props.betLimit > 0 ? props.betLimit : 1000
  const ratio = Math.min(1, Math.sqrt(props.amount / limit))
  return Math.ceil(n * ratio)
})

function sparkStyle(sp: { x: number; y: number; rot: number }, i: number) {
  const on = props.amount > 0 && i < litCount.value
  return {
    left: `${sp.x}px`,
    top: `${sp.y}px`,
    transform: `rotate(${sp.rot}deg)`,
    opacity: on || props.win ? 1 : 0.3,
  }
}

const midStyle = computed(() => {
  const r = ring.value
  if (!r) return {}
  return {
    left: `${r.mid.x}px`,
    top: `${r.mid.y}px`,
    opacity: props.amount > 0 || props.win ? 1 : 0.3,
  }
})

const outStyle = computed(() => {
  const r = ring.value
  if (!r) return {}
  // EXML：x/y 为锚点，换算为左上角
  return {
    left: `${r.out.x - r.out.ax}px`,
    top: `${r.out.y - r.out.ay}px`,
  }
})

const iconStyle = computed(() => ({
  left: `${skin.value.icon.x}px`,
  top: `${skin.value.icon.y}px`,
}))
const oddsStyle = computed(() => ({
  top: `${skin.value.odds.y}px`,
}))
const amtStyle = computed(() => {
  const s = skin.value.amtBg
  const w = s.w * s.scale
  const h = s.h * s.scale
  return {
    top: `${s.y}px`,
    left: '50%',
    width: `${w}px`,
    height: `${h}px`,
    marginLeft: `${-w / 2}px`,
  }
})

/** 官方 playType%3 → fillColor：黄 0x687203 / 绿 0x157C09 / 红 0x9E0707 */
const HIGHLIGHT_COLOR: Record<string, string> = {
  yellow: 'rgba(104,114,3,0.5)',
  green: 'rgba(21,124,9,0.5)',
  red: 'rgba(158,7,7,0.5)',
}

const highlightStyle = computed(() => {
  if (props.bet.size === 'S') return {}
  const h = BET_HIGHLIGHT[props.bet.size]
  return {
    left: `${h.x}px`,
    top: `${h.y}px`,
    width: `${h.w}px`,
    height: `${h.h}px`,
    background: HIGHLIGHT_COLOR[color.value] ?? h.color,
  }
})
const addStyle = computed(() => {
  const h = BET_HIGHLIGHT.S
  return {
    left: `${h.x}px`,
    top: `${h.y}px`,
    width: `${60 * h.scale}px`,
    height: `${52 * h.scale}px`,
    opacity: pressed.value || props.win ? 0.5 : 0,
  }
})
</script>

<style scoped>
.bet-cell {
  position: absolute;
  z-index: 3;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  line-height: 0;
  font-size: 0;
  overflow: visible;
}
.spark {
  position: absolute;
  z-index: 1;
  width: auto;
  height: auto;
  /* Egret Image 默认绕左上角旋转 */
  transform-origin: 0 0;
  pointer-events: none;
  mix-blend-mode: screen;
}
.glow-mid {
  position: absolute;
  z-index: 1;
  width: auto;
  height: auto;
  pointer-events: none;
  mix-blend-mode: screen;
}
.glow-out {
  position: absolute;
  z-index: 1;
  width: auto;
  height: auto;
  pointer-events: none;
  mix-blend-mode: screen;
  transform-origin: center center;
  animation: outSpinCcwt 10s linear infinite;
}
.glow-out.cw {
  animation-name: outSpinCwt;
}
.bet-cell:disabled .glow-out {
  /* 官方 transformPanel(false) → pauseAnimation */
  animation-play-state: paused;
}
@keyframes outSpinCcwt {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}
@keyframes outSpinCwt {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.highlight {
  position: absolute;
  z-index: 1;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: plus-lighter;
  opacity: 0;
}
.bet-cell.down .highlight,
.bet-cell.win .highlight {
  opacity: 0.5;
}
.highlight-add {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: plus-lighter;
  object-fit: fill;
}
.icon {
  position: absolute;
  z-index: 2;
  width: auto;
  height: auto;
  max-width: none;
  pointer-events: none;
}
.odds {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  width: auto;
  height: auto;
  pointer-events: none;
}
.amt {
  position: absolute;
  z-index: 2;
  pointer-events: none;
}
.amt img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: fill;
  mix-blend-mode: plus-lighter;
}
.amt span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}
</style>
