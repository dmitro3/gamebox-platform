<template>
  <div
    class="mahjong-tile"
    :class="{
      'is-golden': isGolden,
      'is-winning': isWinning,
      'is-scatter-celebrate': isScatterCelebrating,
      'is-exploding': isExploding,
      'is-transforming': isTransforming,
      'is-falling': fallRows > 0,
      'is-icon-tile': isIconTile,
      'is-turbo': isTurbo,
      'is-clickable': clickable,
      'is-selected': isSelected,
    }"
    :style="fallStyle"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="onClick"
    @keydown.enter.prevent="onClick"
    @keydown.space.prevent="onClick"
  >
    <div v-if="isScatterCelebrating" class="pg-scatter-glow" aria-hidden="true" />
    <div v-if="isWinning && !isExploding && !isTransforming" class="pg-win-frame" aria-hidden="true" />
    <div v-if="isExploding" class="pg-pop-flash" aria-hidden="true" />
    <div v-if="isExploding" class="pg-pop-particles" aria-hidden="true">
      <span
        v-for="n in 14"
        :key="n"
        class="pg-pop-particles__bit"
        :style="particleStyle(n)"
      />
    </div>
    <div v-if="isTransforming" class="pg-gold-flash" aria-hidden="true" />
    <img
      :src="`${assetBase}/${symbol}.png`"
      class="symbol-img"
      draggable="false"
      alt=""
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  symbol: { type: String, required: true },
  isGolden: { type: Boolean, default: false },
  isWinning: { type: Boolean, default: false },
  isScatterCelebrating: { type: Boolean, default: false },
  isExploding: { type: Boolean, default: false },
  isTransforming: { type: Boolean, default: false },
  isTurbo: { type: Boolean, default: false },
  fallRows: { type: Number, default: 0 },
  fallDelayMs: { type: Number, default: 0 },
  assetBase: { type: String, default: '/images/games/mahjong/classic/symbols' },
  clickable: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
})

const emit = defineEmits<{ click: [] }>()

const assetBase = computed(() =>
  props.isGolden
    ? props.assetBase.replace('/symbols', '/symbols-golden')
    : props.assetBase,
)

const isIconTile = computed(() => props.symbol === 'wild' || props.symbol === 'hu')

const fallStyle = computed(() => {
  if (props.fallRows <= 0) return undefined
  return {
    '--fall-rows': props.fallRows,
    '--fall-delay': `${props.fallDelayMs}ms`,
  }
})

const particleStyle = (n: number) => {
  const angle = ((n - 1) / 14) * 360 + (n % 3) * 8
  const dist = 22 + (n % 4) * 9
  return {
    '--bit-angle': `${angle}deg`,
    '--bit-dist': `${dist}px`,
    '--bit-delay': `${(n % 5) * 12}ms`,
  }
}

const onClick = () => {
  if (props.clickable && !props.isExploding && !props.isTransforming) {
    emit('click')
  }
}
</script>

<style scoped>
.mahjong-tile {
  width: 100%;
  height: 100%;
  position: relative;
  display: block;
  line-height: 0;
  transform-style: preserve-3d;
  perspective: 520px;
}

.mahjong-tile.is-clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.mahjong-tile.is-clickable:focus-visible {
  outline: 2px solid rgba(255, 200, 90, 0.75);
  outline-offset: 1px;
  border-radius: 6px;
}

.mahjong-tile.is-clickable:not(.is-selected):hover .symbol-img {
  filter: brightness(1.12) drop-shadow(0 0 4px rgba(255, 200, 80, 0.35));
  transform: scale(1.04);
}

.mahjong-tile.is-selected {
  z-index: 12;
}

.mahjong-tile.is-selected .symbol-img {
  opacity: 0;
}

.mahjong-tile.is-clickable .symbol-img {
  transition: transform 0.15s ease, filter 0.15s ease;
}

.symbol-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  transform-origin: center center;
}

/* PG：中奖金色框脉冲（不放大牌面） */
.pg-win-frame {
  position: absolute;
  inset: 2%;
  border: 2px solid rgba(255, 228, 120, 0.95);
  border-radius: 6px;
  box-shadow:
    0 0 8px rgba(255, 200, 60, 0.75),
    inset 0 0 10px rgba(255, 240, 180, 0.35);
  animation: pg-win-frame 0.38s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 2;
}

.is-winning:not(.is-exploding):not(.is-transforming) .symbol-img {
  animation: pg-win-bright 0.38s ease-in-out infinite alternate;
}

@keyframes pg-win-frame {
  0% {
    opacity: 0.72;
    box-shadow: 0 0 6px rgba(255, 190, 50, 0.55), inset 0 0 6px rgba(255, 230, 150, 0.25);
  }
  100% {
    opacity: 1;
    box-shadow: 0 0 14px rgba(255, 220, 90, 0.95), inset 0 0 14px rgba(255, 245, 200, 0.45);
  }
}

@keyframes pg-win-bright {
  0% { filter: brightness(1.05) drop-shadow(0 0 2px rgba(255, 210, 80, 0.35)); }
  100% { filter: brightness(1.22) drop-shadow(0 0 8px rgba(255, 230, 120, 0.85)); }
}

/* Scatter 触发庆祝：胡牌金光脉冲 */
.pg-scatter-glow {
  position: absolute;
  inset: -18%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 220, 80, 0.75) 0%, rgba(255, 180, 40, 0.25) 45%, transparent 70%);
  animation: pg-scatter-glow 0.55s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 4;
}

.is-scatter-celebrate .symbol-img {
  animation: pg-scatter-shine 0.55s ease-in-out infinite alternate;
  z-index: 3;
}

@keyframes pg-scatter-glow {
  0% { opacity: 0.55; transform: scale(0.92); }
  100% { opacity: 1; transform: scale(1.08); }
}

@keyframes pg-scatter-shine {
  0% { filter: brightness(1.15) drop-shadow(0 0 6px rgba(255, 200, 60, 0.6)); transform: scale(1); }
  100% { filter: brightness(1.45) drop-shadow(0 0 16px rgba(255, 230, 100, 1)); transform: scale(1.1); }
}

/* PG：镀金牌 → 百搭（Y 轴翻转 + 金光） */
.is-transforming {
  z-index: 8;
}

.is-transforming .symbol-img {
  animation: pg-golden-flip 0.42s cubic-bezier(0.42, 0, 0.58, 1) forwards;
}

.is-transforming.is-turbo .symbol-img {
  animation-duration: 0.22s;
}

.pg-gold-flash {
  position: absolute;
  inset: -10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 245, 180, 0.9) 0%, transparent 68%);
  animation: pg-gold-flash 0.42s ease-out forwards;
  pointer-events: none;
  z-index: 3;
}

.is-turbo .pg-gold-flash {
  animation-duration: 0.22s;
}

@keyframes pg-golden-flip {
  0% {
    transform: rotateY(0deg) scale(1);
    filter: brightness(1);
    opacity: 1;
  }
  20% {
    transform: rotateY(0deg) scale(1.06);
    filter: brightness(1.8) drop-shadow(0 0 10px rgba(255, 210, 60, 0.9));
  }
  50% {
    transform: rotateY(90deg) scale(1.02);
    filter: brightness(2.2);
    opacity: 0.2;
  }
  51% {
    transform: rotateY(-90deg) scale(1.02);
    filter: brightness(1.6);
    opacity: 0.2;
  }
  100% {
    transform: rotateY(0deg) scale(1);
    filter: brightness(1.12) drop-shadow(0 0 6px rgba(255, 200, 60, 0.55));
    opacity: 1;
  }
}

@keyframes pg-gold-flash {
  0% { opacity: 0; transform: scale(0.5); }
  30% { opacity: 0.95; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.25); }
}

/* PG：消除 — 闪白 + 金屑飞散 + 快速消失 */
.is-exploding {
  z-index: 7;
  pointer-events: none;
}

.is-exploding .symbol-img {
  animation: pg-tile-pop 0.32s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.is-exploding.is-turbo .symbol-img {
  animation-duration: 0.17s;
}

.pg-pop-flash {
  position: absolute;
  inset: -4%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 220, 0.5) 45%, transparent 72%);
  animation: pg-pop-flash 0.32s ease-out forwards;
  pointer-events: none;
  z-index: 4;
}

.is-turbo .pg-pop-flash {
  animation-duration: 0.17s;
}

@keyframes pg-pop-flash {
  0% { opacity: 0; transform: scale(0.85); }
  12% { opacity: 1; transform: scale(1.02); }
  100% { opacity: 0; transform: scale(1.08); }
}

@keyframes pg-tile-pop {
  0% {
    transform: scale(1);
    opacity: 1;
    filter: brightness(1);
  }
  8% {
    transform: scale(1.04);
    opacity: 1;
    filter: brightness(3);
  }
  22% {
    transform: scale(1.02);
    opacity: 0.85;
    filter: brightness(1.6);
  }
  100% {
    transform: scale(0.55);
    opacity: 0;
    filter: brightness(1.2);
  }
}

.pg-pop-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.pg-pop-particles__bit {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 11%;
  height: 9%;
  margin: -4.5% -5.5%;
  border-radius: 1px;
  background: linear-gradient(145deg, #fff9e8 0%, #f0c860 55%, #c88828 100%);
  box-shadow: 0 0 3px rgba(255, 220, 100, 0.8);
  animation: pg-bit-burst 0.32s cubic-bezier(0.15, 0.75, 0.25, 1) forwards;
  animation-delay: var(--bit-delay, 0ms);
  opacity: 0;
}

.is-turbo .pg-pop-particles__bit {
  animation-duration: 0.17s;
}

@keyframes pg-bit-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bit-angle)) translateX(0) scale(0.35);
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bit-angle)) translateX(var(--bit-dist)) scale(0.08);
  }
}

/* PG：消除后单牌下落（逐列延迟在父级传入） */
.is-falling .symbol-img {
  animation: pg-tile-fall 0.36s cubic-bezier(0.25, 0.85, 0.35, 1) forwards;
  animation-delay: var(--fall-delay, 0ms);
}

.is-falling.is-turbo .symbol-img {
  animation-duration: 0.2s;
}

@keyframes pg-tile-fall {
  0% {
    transform: translateY(calc(var(--fall-rows) * (-100% - 3px)));
  }
  78% {
    transform: translateY(2.8%);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
