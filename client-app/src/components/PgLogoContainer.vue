<template>
  <div class="logo-container" :style="{ bottom: props.bottom }">
    <PgFooterLogo />
    <img
      v-if="certUrl"
      class="footer-text-img"
      :src="certUrl"
      alt=""
    />
  </div>
</template>

<script setup>
import PgFooterLogo from './PgFooterLogo.vue'

/** certUrl：认证条图片（正版 download.png），由各游戏从自己的 manifest 传入 */
const props = defineProps({
  bottom: {
    type: String,
    default: '52px',
  },
  certUrl: {
    type: String,
    default: null,
  },
})
</script>

<style scoped>
.logo-container {
  align-items: center;
  display: flex;
  flex-direction: row;
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  padding: 0 4px 0 12px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 3;
}

.footer-text-img {
  display: block;
  height: 59px;
  width: auto;
  max-width: calc(100% - 80px);
  margin-left: auto;
  object-fit: contain;
  object-position: right center;
  transition: 0.2s;
}
</style>
