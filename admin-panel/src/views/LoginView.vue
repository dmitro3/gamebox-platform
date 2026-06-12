<template>
  <div class="login-wrap">
    <div class="login-box">
      <div class="login-logo">♛ <span>GoldHub Admin</span></div>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="admin" size="large" @keyup.enter="doLogin" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password @keyup.enter="doLogin" />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" @click="doLogin" style="width:100%;margin-top:8px">
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useAdminStore } from '@/stores/admin'
import http from '@/api/http'

const router = useRouter()
const store = useAdminStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const form = ref({ username: '', password: '' })

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

interface AuthResult { user: { id: string; uid: string; username: string; nickname: string; role: string }; token: string }

async function doLogin() {
  if (!await formRef.value?.validate().catch(() => false)) return
  loading.value = true
  try {
    const res = await http.post<AuthResult, AuthResult>('/auth/login', form.value)
    if (res.user.role !== 'ADMIN' && res.user.role !== 'BRANCH') {
      ElMessage.error('该账号无后台权限')
      return
    }
    store.setAuth(res.user, res.token)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e: unknown) {
    ElMessage.error((e as Error).message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  background: linear-gradient(135deg, #0d111a 0%, #1a1f2e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-box {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.4);
}
.login-logo {
  font-size: 22px;
  font-weight: 700;
  color: #d4a93c;
  text-align: center;
  margin-bottom: 32px;
}
.login-logo span { color: #303133; margin-left: 8px; }
</style>
