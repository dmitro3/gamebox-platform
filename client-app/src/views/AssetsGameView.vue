<template>
  <div class="assets-game-shell">
    <iframe
      ref="frameEl"
      class="assets-game-frame"
      :src="iframeSrc"
      :title="gameTitle"
      allow="autoplay"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useWalletStore } from '@/stores/wallet'

/**
 * 资产游戏（聊天室/牌桌 H5）钱包策略：
 * - 进页：把服务端余额写入 localStorage，供 App.getBalance 使用（本地演示账）
 * - 局内：扣款/派彩只改 localStorage，不写回服务端（避免假账污染真钱包）
 * - 离页：重新 fetchBalance，个人中心仍显示服务端真实余额
 * 待彩票/牌桌全量接入 /bet API 后，再改为权威服务端结算。
 */
const ASSET_GAMES: Record<string, string> = {
  bjsc: '/games-assets/bjsc/index.html?v=8',
  ssc: '/games-assets/ssc/index.html?v=10',
  ffc: '/games-assets/ffc/index.html?v=10',
  'speed-racing': '/games-assets/speed-racing/index.html?v=85',
  'speed-boat': '/games-assets/speed-boat/index.html?v=11',
  kuai3: '/games-assets/kuai3/index.html?v=44',
  lhc: '/games-assets/lhc/index.html?v=60',
  zhajinhua: '/games-assets/zhajinhua/index.html?v=295',
  douniu: '/games-assets/douniu/index.html?v=47',
  baccarat: '/games-assets/baccarat/index.html?v=25',
  longhu: '/games-assets/longhu/index.html?v=20',
  mahjong: '/games-assets/mahjong/index.html',
  'slots-mahjong': '/games-assets/mahjong/index.html',
}

const AVATAR_FALLBACK = '/images/avatars/001.jpg'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const walletStore = useWalletStore()
const frameEl = ref<HTMLIFrameElement | null>(null)

const gameCode = computed(() => (route.meta.assetGame as string) || (route.params.gameCode as string) || '')
const iframeSrc = computed(() => ASSET_GAMES[gameCode.value] ?? '')
const gameTitle = computed(() => {
  const titles: Record<string, string> = {
    bjsc: '北京赛车',
    ssc: '快乐时时彩',
    ffc: '1分时时彩',
    'speed-racing': '极速赛车',
    'speed-boat': '幸运飞艇',
    kuai3: '1分快三',
    lhc: '幸运六合彩',
    zhajinhua: '炸金花',
    douniu: '斗牛',
    baccarat: '百家乐',
    longhu: '龙虎斗',
    mahjong: '麻将胡了',
    'slots-mahjong': '麻将胡了',
  }
  return titles[gameCode.value] || '游戏'
})

function syncLegacyUser() {
  const profile = userStore.profile
  if (!profile) return
  const legacyUser = {
    uid: profile.uid,
    name: profile.nickname || profile.username,
    avatar: profile.avatar || AVATAR_FALLBACK,
  }
  localStorage.setItem('gamebox_user', JSON.stringify(legacyUser))
  localStorage.setItem(`gamebox_balance_${profile.uid}`, String(walletStore.balance))
}

function onGameMessage(ev: MessageEvent) {
  if (ev.source !== frameEl.value?.contentWindow) return
  const data = ev.data
  if (!data || data.type !== 'assets-game-nav') return
  if (typeof data.path === 'string') router.push(data.path)
}

onMounted(async () => {
  if (!ASSET_GAMES[gameCode.value]) {
    router.back()
    return
  }
  await walletStore.fetchBalance()
  syncLegacyUser()
  window.addEventListener('message', onGameMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', onGameMessage)
  // 本地演示账不回写服务端；恢复真余额供大厅/个人中心展示
  void walletStore.fetchBalance()
})
</script>

<style scoped>
.assets-game-shell {
  position: fixed;
  inset: 0;
  z-index: 200;
  width: 100%;
  height: 100%;
  background: #0d0a08;
}
.assets-game-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
