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
      'is-wild': props.symbol === 'wild',
      'is-hu': props.symbol === 'hu',
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
    <div v-if="isScatterCelebrating" class="pg-scatter-burst" aria-hidden="true" />
    <div v-if="isScatterCelebrating" class="pg-hu-stamp" aria-hidden="true">
      <span class="pg-hu-stamp__ring" />
      <span class="pg-hu-stamp__char">胡</span>
    </div>
    <div v-if="isWinning && !isExploding && !isTransforming" class="pg-flame-ring" aria-hidden="true" />
    <div v-if="isWinning && !isExploding && !isTransforming" class="pg-flame-core" aria-hidden="true" />
    <div v-if="isExploding" class="pg-pop-flash" aria-hidden="true" />
    <div v-if="isExploding" class="pg-pop-flame" aria-hidden="true" />
    <div v-if="isExploding" class="pg-pop-particles" aria-hidden="true">
      <span
        v-for="n in PARTICLE_COUNT"
        :key="n"
        class="pg-pop-particles__bit"
        :class="{ 'is-spark': n % 3 === 0, 'is-ember': n % 4 === 0 }"
        :style="particleStyle(n)"
      />
    </div>
    <div v-if="isTransforming" class="pg-gold-flash" aria-hidden="true" />
    <!-- 胡散牌：触发/庆祝时底部额外金光 -->
    <div v-if="props.symbol === 'hu' && isScatterCelebrating" class="hu-glow" aria-hidden="true" />
    <!-- 百搭：无麻将底，仅元宝 +「百搭」叠层 -->
    <template v-if="props.symbol === 'wild'">
      <img
        :src="wildIngotUrl"
        class="symbol-img symbol-layer-ingot"
        draggable="false"
        alt=""
      />
      <img
        :src="wildOverlayUrl"
        class="symbol-img symbol-layer-overlay"
        draggable="false"
        alt=""
      />
    </template>
    <!-- 胡：正版分层 — 光晕(CSS) + 纹章 + 胡字（同一容器等比缩放，与其他牌对齐） -->
    <template v-else-if="props.symbol === 'hu'">
      <div class="hu-symbol-stack">
        <div class="hu-scatter-glow" aria-hidden="true" />
        <img
          :src="huEmblemUrl"
          class="symbol-img symbol-layer-hu-emblem"
          draggable="false"
          alt=""
        />
        <img
          :src="huOverlayUrl"
          class="symbol-img symbol-layer-hu-char"
          draggable="false"
          alt=""
        />
      </div>
    </template>
    <img
      v-else
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

/** 百搭分层素材始终在 pg/symbols（与 assetBase 前缀一致） */
const symbolRoot = computed(() =>
  props.assetBase.replace(/\/symbols(?:-golden)?$/, '/symbols'))

const wildIngotUrl = computed(() => `${symbolRoot.value}/wild-ingot.png`)
const wildOverlayUrl = computed(() => `${symbolRoot.value}/wild-overlay.png`)
const huEmblemUrl = computed(() => `${symbolRoot.value}/hu-emblem.png`)
const huOverlayUrl = computed(() => `${symbolRoot.value}/hu-overlay.png`)

const isIconTile = computed(() => props.symbol === 'wild' || props.symbol === 'hu')

const fallStyle = computed(() => {
  if (props.fallRows <= 0) return undefined
  return {
    '--fall-rows': props.fallRows,
    '--fall-delay': `${props.fallDelayMs}ms`,
  }
})

const PARTICLE_COUNT = 24

const particleStyle = (n: number) => {
  const angle = ((n - 1) / PARTICLE_COUNT) * 360 + (n % 3) * 11
  const dist = 26 + (n % 5) * 11
  return {
    '--bit-angle': `${angle}deg`,
    '--bit-dist': `${dist}px`,
    '--bit-delay': `${(n % 7) * 10}ms`,
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

.mahjong-tile.is-hu.is-clickable:not(.is-selected):hover .symbol-img {
  transform: none;
}

.mahjong-tile.is-hu.is-clickable .hu-symbol-stack {
  transition: transform 0.15s ease;
}

.mahjong-tile.is-hu.is-clickable:not(.is-selected):hover .hu-symbol-stack {
  transform: scale(0.97);
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
  object-fit: fill;
  pointer-events: none;
  transform-origin: center center;
}

.mahjong-tile.is-wild .symbol-layer-overlay {
  z-index: 1;
}

/* 胡散牌：庆祝时提升层级；平时与其他牌同一基准，避免底部压住下行 */
.mahjong-tile.is-hu {
  overflow: hidden;
}

.mahjong-tile.is-hu.is-scatter-celebrate {
  z-index: 5;
  overflow: visible;
}

/* 纹章+胡字同容器等比缩小，中心与其他 symbol-img（inset:0 fill）对齐 */
.hu-symbol-stack {
  position: absolute;
  inset: 0;
  transform: scale(0.94);
  transform-origin: center center;
}

/* 正版 scatter_glow_a：ADD 光晕，单独特效层（不在纹章/胡字图里） */
.hu-scatter-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(255, 235, 90, 0.72) 0%,
    rgba(255, 180, 40, 0.38) 32%,
    rgba(255, 90, 20, 0.12) 52%,
    transparent 68%
  );
  pointer-events: none;
  z-index: 0;
}

.mahjong-tile.is-hu .symbol-layer-hu-emblem,
.mahjong-tile.is-hu .symbol-layer-hu-char {
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.symbol-layer-hu-emblem {
  z-index: 1;
  /* 正版 scatter_bg 为 Cocos ADD 混合，screen 近似还原金黄发光感 */
  mix-blend-mode: screen;
}

.symbol-layer-hu-char {
  z-index: 2;
}

/* 光晕在字符底部向上辐射 */
.hu-glow {
  position: absolute;
  bottom: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 160%;
  height: 90%;
  background: radial-gradient(
    ellipse at 50% 85%,
    rgba(255, 230, 60, 1.0)  0%,
    rgba(255, 160, 20, 0.80) 28%,
    rgba(255, 90,  10, 0.40) 55%,
    transparent              78%
  );
  pointer-events: none;
  z-index: 1;
  animation: hu-glow-pulse 1.8s ease-in-out infinite alternate;
}

@keyframes hu-glow-pulse {
  0%   { opacity: 0.80; transform: translateX(-50%) scaleX(0.90); }
  100% { opacity: 1.00; transform: translateX(-50%) scaleX(1.10); }
}

/* PG：中奖火焰光晕（视频参考：橙黄脉冲包络） */
.pg-flame-ring {
  position: absolute;
  inset: -16%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 220, 90, 0.92) 0%,
    rgba(255, 150, 30, 0.62) 32%,
    rgba(255, 70, 10, 0.35) 52%,
    transparent 72%
  );
  animation: pg-flame-pulse 0.38s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 2;
}

.pg-flame-core {
  position: absolute;
  inset: 4%;
  border-radius: 7px;
  box-shadow:
    inset 0 0 14px rgba(255, 245, 160, 0.85),
    0 0 18px rgba(255, 140, 40, 0.95),
    0 0 6px rgba(255, 200, 80, 0.8);
  animation: pg-flame-flicker 0.26s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 1;
}

.is-winning:not(.is-exploding):not(.is-transforming) .symbol-img {
  animation: pg-win-burn 0.38s ease-in-out infinite alternate;
  z-index: 3;
}

@keyframes pg-flame-pulse {
  0% { opacity: 0.78; transform: scale(0.94); filter: blur(0.5px); }
  100% { opacity: 1; transform: scale(1.06); filter: blur(0); }
}

@keyframes pg-flame-flicker {
  0% { opacity: 0.65; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1.02); }
}

@keyframes pg-win-burn {
  0% {
    filter: brightness(1.08) drop-shadow(0 0 4px rgba(255, 180, 60, 0.5));
    transform: scale(1);
  }
  100% {
    filter: brightness(1.35) drop-shadow(0 0 14px rgba(255, 120, 20, 0.95));
    transform: scale(1.03);
  }
}

/* Scatter：胡字盖戳 + 金光扩散 */
.pg-scatter-burst {
  position: absolute;
  inset: -28%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 100, 0.9) 0%, rgba(255, 160, 40, 0.35) 42%, transparent 68%);
  animation: pg-scatter-burst 0.65s ease-out forwards;
  pointer-events: none;
  z-index: 4;
}

.pg-hu-stamp {
  position: absolute;
  inset: 6%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: pg-hu-stamp-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.pg-hu-stamp__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(255, 220, 100, 0.95);
  box-shadow: 0 0 16px rgba(255, 60, 20, 0.85), inset 0 0 10px rgba(255, 200, 80, 0.5);
  animation: pg-hu-ring-pop 0.55s ease-out forwards;
}

.pg-hu-stamp__char {
  position: relative;
  width: 78%;
  height: 78%;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #ffe080 0%, #e82828 52%, #9a1010 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', serif;
  font-size: clamp(18px, 42%, 36px);
  font-weight: 900;
  color: #fff5dc;
  text-shadow: 0 2px 6px rgba(100, 0, 0, 0.85);
  box-shadow: 0 0 14px rgba(255, 80, 30, 0.95);
}

.is-scatter-celebrate .symbol-img {
  animation: pg-scatter-shine 0.55s ease-in-out infinite alternate;
  z-index: 5;
}

@keyframes pg-scatter-burst {
  0% { opacity: 0; transform: scale(0.3); }
  35% { opacity: 1; transform: scale(1.15); }
  100% { opacity: 0.55; transform: scale(1.05); }
}

@keyframes pg-hu-stamp-in {
  0% { opacity: 0; transform: scale(2.2) rotate(-18deg); }
  55% { opacity: 1; transform: scale(0.92) rotate(4deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}

@keyframes pg-hu-ring-pop {
  0% { transform: scale(1.8); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes pg-scatter-shine {
  0% { filter: brightness(1.2) drop-shadow(0 0 8px rgba(255, 200, 60, 0.7)); transform: scale(1); }
  100% { filter: brightness(1.5) drop-shadow(0 0 20px rgba(255, 230, 100, 1)); transform: scale(1.08); }
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

/* PG：消除 — 火焰闪白 + 火星/金屑飞散 */
.is-exploding {
  z-index: 7;
  pointer-events: none;
}

.is-exploding .symbol-img {
  animation: pg-tile-pop 0.36s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.is-exploding.is-turbo .symbol-img {
  animation-duration: 0.19s;
}

.pg-pop-flame {
  position: absolute;
  inset: -8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 180, 50, 0.95) 0%, rgba(255, 80, 10, 0.5) 45%, transparent 70%);
  animation: pg-pop-flame 0.36s ease-out forwards;
  pointer-events: none;
  z-index: 3;
}

.is-turbo .pg-pop-flame {
  animation-duration: 0.19s;
}

.pg-pop-flash {
  position: absolute;
  inset: -6%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(255, 248, 200, 0.65) 40%, transparent 72%);
  animation: pg-pop-flash 0.36s ease-out forwards;
  pointer-events: none;
  z-index: 4;
}

.is-turbo .pg-pop-flash {
  animation-duration: 0.19s;
}

@keyframes pg-pop-flame {
  0% { opacity: 0; transform: scale(0.7); }
  18% { opacity: 1; transform: scale(1.08); }
  100% { opacity: 0; transform: scale(1.2); }
}

@keyframes pg-pop-flash {
  0% { opacity: 0; transform: scale(0.82); }
  10% { opacity: 1; transform: scale(1.04); }
  100% { opacity: 0; transform: scale(1.12); }
}

@keyframes pg-tile-pop {
  0% {
    transform: scale(1);
    opacity: 1;
    filter: brightness(1.1);
  }
  6% {
    transform: scale(1.06);
    opacity: 1;
    filter: brightness(3.2);
  }
  20% {
    transform: scale(1.03);
    opacity: 0.9;
    filter: brightness(2);
  }
  100% {
    transform: scale(0.45);
    opacity: 0;
    filter: brightness(1.4);
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
  box-shadow: 0 0 4px rgba(255, 220, 100, 0.85);
  animation: pg-bit-burst 0.36s cubic-bezier(0.15, 0.75, 0.25, 1) forwards;
  animation-delay: var(--bit-delay, 0ms);
  opacity: 0;
}

.pg-pop-particles__bit.is-spark {
  width: 8%;
  height: 14%;
  background: linear-gradient(180deg, #fff 0%, #ffb040 45%, #ff6010 100%);
  box-shadow: 0 0 6px rgba(255, 160, 40, 1);
}

.pg-pop-particles__bit.is-ember {
  width: 14%;
  height: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffe890 0%, #ff9020 55%, #cc4000 100%);
}

.is-turbo .pg-pop-particles__bit {
  animation-duration: 0.19s;
}

@keyframes pg-bit-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bit-angle)) translateX(0) scale(0.35);
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--bit-angle)) translateX(var(--bit-dist)) scale(0.06);
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
