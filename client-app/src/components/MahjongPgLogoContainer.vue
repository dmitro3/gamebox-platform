<template>
  <div class="logo-container" :style="{ bottom: props.bottom }">
    <MahjongPgFooterLogo />
    <img
      v-if="certUrl"
      class="footer-text-img"
      :src="certUrl"
      alt=""
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { pgUi } from '../games/mahjong/pgAssets'
import MahjongPgFooterLogo from './MahjongPgFooterLogo.vue'

const props = defineProps({
  bottom: {
    type: String,
    default: '52px',
  },
})

/** 正版只用 download.png 认证条，不用 footer.png 整图 */
const certUrl = computed(() => pgUi('cover-footer-cert'))
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
