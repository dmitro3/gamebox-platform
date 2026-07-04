<template>
  <div id="footer-container" class="footer-container">
    <div class="footer-mask-container-port">
      <div class="footer-mask footer-mask-color" :style="maskColorStyle" />
      <div class="footer-mask footer-mask-black" />
    </div>
    <p class="footer-copyright-text">PGSOFT.COM 2025 © PG SOFT® 版权所有</p>
  </div>
</template>

<script setup>
import { MAHJONG_PG_THEME_COLOR, usePgFooterTheme } from './mahjongPgFooterTheme'

const props = defineProps({
  themeColor: {
    type: String,
    default: MAHJONG_PG_THEME_COLOR,
  },
})

const { maskColorStyle } = usePgFooterTheme(() => props.themeColor)
</script>

<style scoped>
/* 正版 shell #footer-container：只有 CSS 渐变 + 版权文字，不铺底图 */
.footer-container {
  display: flex;
  height: 77px;
  bottom: 0;
  position: absolute;
  width: 100%;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.footer-mask-container-port {
  display: flex;
  flex-direction: column;
  height: 229px;
  bottom: 0;
  position: absolute;
  width: 100%;
  left: 0;
}

.footer-mask {
  height: 100%;
  position: absolute;
  width: 100%;
}

.footer-mask-black {
  background-image: linear-gradient(180deg, rgba(0, 0, 0, 0.03), #000);
}

.footer-copyright-text {
  position: absolute;
  bottom: 8px;
  left: 0;
  width: 100%;
  margin: 0;
  padding: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 8px;
  line-height: 1.2;
  text-align: center;
  transform: scale(0.9);
  white-space: nowrap;
  z-index: 1;
}
</style>
