import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AdminProfile {
  id: string; uid: string; username: string; nickname: string; role: string
}

export const useAdminStore = defineStore('admin', () => {
  const profile = ref<AdminProfile | null>(null)
  const token = ref(localStorage.getItem('admin_token') ?? '')

  const isLoggedIn = computed(() => !!token.value && !!profile.value)

  function setAuth(user: AdminProfile, tk: string) {
    profile.value = user
    token.value = tk
    localStorage.setItem('admin_token', tk)
  }

  function logout() {
    profile.value = null
    token.value = ''
    localStorage.removeItem('admin_token')
  }

  return { profile, token, isLoggedIn, setAuth, logout }
})
