<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['app-toast', `app-toast-${t.type}`]"
      >{{ t.message }}</div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
const { toasts } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.app-toast {
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
  color: #fff;
  background: rgba(30, 20, 5, 0.92);
  border: 1px solid rgba(200, 160, 60, 0.5);
  backdrop-filter: blur(4px);
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.app-toast-success { border-color: rgba(80, 200, 80, 0.6); }
.app-toast-error   { border-color: rgba(220, 60, 60, 0.7); }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from  { opacity: 0; transform: translateY(-8px); }
.toast-leave-to    { opacity: 0; transform: translateY(-8px); }
</style>
