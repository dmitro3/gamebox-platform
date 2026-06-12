<template>
  <div class="page pwd-page">
    <div class="pwd-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">修改密码</span>
      <span class="spacer"></span>
    </div>

    <div class="form-card">
      <div class="field-group">
        <label class="field-label">当前密码</label>
        <input v-model="oldPwd" type="password" class="field-input"
          placeholder="请输入当前密码" autocomplete="current-password">
      </div>
      <div class="field-group">
        <label class="field-label">新密码</label>
        <input v-model="newPwd" type="password" class="field-input"
          placeholder="6-30 位，建议包含字母和数字" autocomplete="new-password">
      </div>
      <div class="field-group">
        <label class="field-label">确认新密码</label>
        <input v-model="confirmPwd" type="password" class="field-input"
          placeholder="再次输入新密码" autocomplete="new-password">
      </div>

      <button class="submit-btn" :disabled="submitting" @click="doSubmit">
        {{ submitting ? '提交中…' : '确认修改' }}
      </button>

      <div class="tips">
        <p>· 修改成功后需要重新登录</p>
        <p>· 忘记当前密码请联系在线客服</p>
      </div>
    </div>

    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import http from '@/api/http'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const userStore = useUserStore()
const { success: toastOk, error: toastErr } = useToast()

const oldPwd     = ref('')
const newPwd     = ref('')
const confirmPwd = ref('')
const submitting = ref(false)

async function doSubmit() {
  if (!oldPwd.value) { toastErr('请输入当前密码'); return }
  if (newPwd.value.length < 6) { toastErr('新密码至少 6 位'); return }
  if (newPwd.value !== confirmPwd.value) { toastErr('两次输入的新密码不一致'); return }

  submitting.value = true
  try {
    await http.patch('/users/me/password', {
      oldPassword: oldPwd.value,
      newPassword: newPwd.value,
    })
    toastOk('密码已修改，请重新登录')
    setTimeout(() => {
      userStore.logout()
      router.push('/login')
    }, 1200)
  } catch (e: unknown) {
    toastErr((e as Error).message)
    submitting.value = false
  }
}
</script>

<style scoped>
.pwd-page { min-height: 100vh; background: #0a0a12; color: #fff; padding-bottom: 60px; }

.pwd-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(14,14,26,0.96);
  border-bottom: 1px solid rgba(140,140,255,0.15);
}
.back-btn { background: none; border: none; color: #8c8cff; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; }
.spacer { width: 28px; }

.form-card {
  margin: 20px 16px; padding: 20px 16px; border-radius: 16px;
  background: rgba(25,25,45,0.6); border: 1px solid rgba(255,255,255,0.07);
}
.field-group { margin-bottom: 16px; }
.field-label { display: block; font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 6px; }
.field-input {
  width: 100%; padding: 12px 14px; border-radius: 10px;
  border: 1px solid rgba(140,140,255,0.25); background: rgba(10,10,22,0.8);
  color: #fff; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s;
}
.field-input:focus { border-color: #8c8cff; }

.submit-btn {
  width: 100%; padding: 14px; margin-top: 6px;
  border-radius: 12px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #8c8cff, #4a4ad0);
  color: #fff; font-size: 16px; font-weight: 700;
}
.submit-btn:disabled { opacity: 0.5; }

.tips { margin-top: 16px; font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.8; }
.tips p { margin: 0; }
</style>
