import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserProfile } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile | null>(null)
  const token = ref<string>(localStorage.getItem('token') ?? '')

  const isLoggedIn = computed(() => !!token.value && !!profile.value)

  function setAuth(user: UserProfile, tk: string) {
    profile.value = user
    token.value = tk
    localStorage.setItem('token', tk)
  }

  function logout() {
    profile.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  return { profile, token, isLoggedIn, setAuth, logout }
})
