<template>
  <Teleport to="body">
    <div v-show="visible" class="app-modal-mask" @click.self="onCancel">
      <div class="app-modal" role="dialog" aria-modal="true">
        <div class="app-modal-card">
          <div :class="['app-modal-title', props.danger ? 'danger' : '']">{{ props.title }}</div>
          <div v-if="props.message" class="app-modal-body">{{ props.message }}</div>
          <div class="app-modal-actions">
            <button v-if="props.showCancel" class="app-modal-btn app-modal-btn-cancel" @click="onCancel">
              {{ props.cancelText ?? '取消' }}
            </button>
            <button :class="['app-modal-btn app-modal-btn-ok', props.danger ? 'danger' : '']" @click="onOk">
              {{ props.okText ?? '确定' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  title: string
  message?: string
  okText?: string
  cancelText?: string
  showCancel?: boolean
  danger?: boolean
}>()
const emit = defineEmits<{ ok: []; cancel: [] }>()
const onOk = () => emit('ok')
const onCancel = () => emit('cancel')
</script>

<style scoped>
.app-modal-mask {
  position: fixed; inset: 0; z-index: 8000;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
.app-modal-card {
  background: linear-gradient(160deg, #1e1505 0%, #0d0902 100%);
  border: 1px solid rgba(200,160,60,0.5);
  border-radius: 14px;
  padding: 28px 24px 20px;
  min-width: 280px; max-width: 88vw;
  box-shadow: 0 8px 40px rgba(0,0,0,0.7);
}
.app-modal-title {
  color: #e8c96a;
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 10px;
}
.app-modal-title.danger { color: #f06060; }
.app-modal-body {
  color: rgba(255,255,255,0.75);
  font-size: 14px;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 20px;
}
.app-modal-actions {
  display: flex; gap: 12px; justify-content: center;
}
.app-modal-btn {
  flex: 1; padding: 10px 0; border-radius: 8px;
  border: 1px solid rgba(200,160,60,0.5);
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.app-modal-btn-cancel {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.7);
}
.app-modal-btn-ok {
  background: linear-gradient(135deg, #c8960a, #e8c032);
  color: #1a1000;
  border-color: transparent;
}
.app-modal-btn-ok.danger {
  background: linear-gradient(135deg, #c83030, #f06060);
  color: #fff;
}
</style>
