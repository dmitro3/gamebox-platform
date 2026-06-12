<template>
  <div class="placeholder-page">
    <div class="ph-content">
      <div class="ph-icon">🚧</div>
      <div class="ph-title">{{ pageTitle }}</div>
      <div class="ph-desc">功能开发中，敬请期待</div>
    </div>
  </div>
  <TabBar />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const titles: Record<string, string> = {
  recharge: '充 值', flow: '明 细', cs: '客 服', settings: '我 的',
}
const pageTitle = computed(() => titles[route.name as string] ?? '敬请期待')
</script>

<style scoped>
.placeholder-page {
  min-height: 100vh;
  background: #0a0700;
  display: flex; align-items: center; justify-content: center;
  padding-bottom: 60px;
}
.ph-content { text-align: center; }
.ph-icon  { font-size: 48px; margin-bottom: 16px; }
.ph-title { color: #e8c032; font-size: 20px; font-weight: 600; margin-bottom: 8px; letter-spacing: 0.2em; }
.ph-desc  { color: rgba(255,255,255,0.4); font-size: 14px; }
</style>
