<template>
  <nav class="lobby-tabbar">
    <div
      v-for="tab in TABS"
      :key="tab.key"
      :class="['tab-item', route.name === tab.name ? 'active' : '']"
      @click="go(tab)"
    >
      <span class="t-icon">{{ tab.icon }}</span>
      <span class="t-text">{{ tab.text }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

const TABS = [
  { key: 'home',     name: 'lobby',    icon: '⛨', text: '游 戏' },
  { key: 'recharge', name: 'recharge', icon: '¥', text: '充 值' },
  { key: 'flow',     name: 'flow',     icon: '▤', text: '明 细' },
  { key: 'cs',       name: 'cs',       icon: '✆', text: '客 服' },
  { key: 'settings', name: 'settings', icon: '☰', text: '我 的' },
]

function go(tab: typeof TABS[number]) {
  if (route.name === tab.name) return
  router.push({ name: tab.name })
}
</script>

<style scoped>
.lobby-tabbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 58px;
  display: flex;
  background: linear-gradient(0deg, #0e0a02 0%, #1a1204 100%);
  border-top: 1px solid rgba(200,160,60,0.25);
  z-index: 500;
}
.tab-item {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: rgba(255,255,255,0.4);
  transition: color 0.2s;
  user-select: none;
}
.tab-item.active { color: #e8c032; }
.t-icon { font-size: 18px; line-height: 1; }
.t-text { font-size: 10px; letter-spacing: 0.05em; }
</style>
