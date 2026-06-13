<template>
  <nav class="lobby-tabbar">
    <div
      v-for="tab in TABS"
      :key="tab.key"
      :class="['tab-item', route.name === tab.name ? 'active' : '']"
      :data-tab="tab.key"
      @click="go(tab)"
    >
      <span class="t-icon">{{ tab.icon }}</span>
      <span class="t-text">{{ tab.text }}</span>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 样式复用原型 common.css 的 .lobby-tabbar；body.has-tabbar 让 .page 自动留底部空间
onMounted(() => document.body.classList.add('has-tabbar'))
onUnmounted(() => document.body.classList.remove('has-tabbar'))

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
