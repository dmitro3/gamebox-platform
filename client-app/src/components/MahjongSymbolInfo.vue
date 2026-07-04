<template>
  <Transition name="sym-pop">
    <div v-if="symbol && anchor" class="sym-pop" :style="popStyle">
      <div class="sym-pop__panel">
        <div v-if="isPaySymbol(symbol)" class="sym-pop__pays">
          <div v-for="row in payRows" :key="row.count" class="sym-pop__pay-row">
            <span class="sym-pop__count">{{ row.count }}</span>
            <span class="sym-pop__value">{{ row.value }}</span>
          </div>
        </div>
        <div v-else class="sym-pop__special">
          <template v-if="symbol === 'wild'">
            <p class="sym-pop__special-title">百搭</p>
            <span class="sym-pop__special-desc">替代除「胡」外所有符号</span>
          </template>
          <template v-else>
            <p class="sym-pop__special-title">胡</p>
            <span class="sym-pop__special-desc">3 个起触发免费旋转</span>
          </template>
        </div>
        <div class="sym-pop__tile-slot">
          <img class="sym-pop__tile" :src="iconSrc" alt="" draggable="false" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  PAYTABLE,
  isPaySymbol,
  type MahjongSymbolId,
  type PaySymbolId,
} from '@/games/mahjong/mahjongWays1'

export interface TileAnchor {
  x: number
  y: number
  w: number
  h: number
  bgW: number
  bgH: number
  bgPosX: number
  bgPosY: number
}

const props = defineProps<{
  symbol: MahjongSymbolId | null
  isGolden?: boolean
  anchor: TileAnchor | null
  assetBase: string
  /** 与游戏底图一致 */
  bgImage?: string
}>()

const iconSrc = computed(() => {
  if (!props.symbol) return ''
  const base = props.isGolden
    ? props.assetBase.replace('/symbols', '/symbols-golden')
    : props.assetBase
  return `${base}/${props.symbol}.png`
})

const payRows = computed(() => {
  const sym = props.symbol
  if (!sym || !isPaySymbol(sym)) return []
  const pays = PAYTABLE[sym as PaySymbolId]
  return [
    { count: 5, value: pays[2] },
    { count: 4, value: pays[1] },
    { count: 3, value: pays[0] },
  ]
})

const popStyle = computed(() => {
  if (!props.anchor) return undefined
  return {
    left: `${props.anchor.x}px`,
    top: `${props.anchor.y}px`,
    '--tile-w': `${props.anchor.w}px`,
    '--tile-h': `${props.anchor.h}px`,
    '--sym-bg': props.bgImage ? `url(${props.bgImage})` : 'none',
    '--bg-w': `${props.anchor.bgW}px`,
    '--bg-h': `${props.anchor.bgH}px`,
    '--bg-pos-x': `${props.anchor.bgPosX}px`,
    '--bg-pos-y': `${props.anchor.bgPosY}px`,
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap');

.sym-pop {
  position: absolute;
  z-index: 25;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.sym-pop__panel {
  --panel-w: calc(var(--tile-w) * 2.35);
  --panel-h: var(--tile-h);
  display: flex;
  align-items: center;
  width: var(--panel-w);
  height: var(--panel-h);
  padding: 0 calc(var(--tile-w) * 0.06);
  box-sizing: border-box;
  border-radius: calc(var(--tile-w) * 0.08);
  border: 4px solid #e8c050;
  box-shadow:
    0 0 0 1px rgba(90, 55, 10, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.32),
    inset 0 0 8px rgba(255, 220, 140, 0.06);
  background-color: #8f7340;
  background-image: var(--sym-bg);
  background-size: var(--bg-w) var(--bg-h);
  background-position: calc(-1 * var(--bg-pos-x)) calc(-1 * var(--bg-pos-y));
  background-repeat: no-repeat;
  overflow: hidden;
}

.sym-pop__pays {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(var(--tile-h) * 0.02);
  padding-left: calc(var(--tile-w) * 0.02);
  min-width: 0;
}

.sym-pop__pay-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
  column-gap: calc(var(--tile-w) * 0.1);
}

.sym-pop__count {
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: calc(var(--tile-h) * 0.24);
  line-height: 1;
  color: #ffd878;
  text-shadow: 0 1px 2px rgba(50, 30, 0, 0.55);
  font-variant-numeric: tabular-nums;
}

.sym-pop__value {
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: calc(var(--tile-h) * 0.24);
  line-height: 1;
  color: #fff8ec;
  text-shadow: 0 1px 2px rgba(40, 30, 15, 0.5);
  font-variant-numeric: tabular-nums;
}

.sym-pop__special {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--tile-h) * 0.02);
  padding: 0 calc(var(--tile-w) * 0.04);
  text-align: center;
  min-width: 0;
}

.sym-pop__special-title {
  margin: 0;
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: calc(var(--tile-h) * 0.22);
  color: #ffd878;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(50, 30, 0, 0.55);
}

.sym-pop__special-desc {
  font-size: calc(var(--tile-h) * 0.13);
  line-height: 1.25;
  color: rgba(255, 248, 235, 0.92);
  text-shadow: 0 1px 2px rgba(40, 30, 15, 0.45);
}

.sym-pop__tile-slot {
  flex: 0 0 42%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.sym-pop__tile {
  width: 88%;
  height: 88%;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
}

.sym-pop-enter-active,
.sym-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.18s ease;
}

.sym-pop-enter-from,
.sym-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.93);
}
</style>
