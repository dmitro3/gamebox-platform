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

const ASSET_GAMES: Record<string, string> = {
  bjsc: '/games-assets/bjsc/index.html',
  ssc: '/games-assets/ssc/index.html',
  'speed-racing': '/games-assets/speed-racing/index.html',
  mahjong: '/games-assets/mahjong/index.html',
  'slots-mahjong': '/games-assets/mahjong/index.html',
}

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
    'speed-racing': '极速赛车',
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
    avatar: profile.avatar || '/legacy/images/default-avatar.svg',
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
