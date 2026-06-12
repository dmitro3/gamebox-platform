import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import http from '@/api/http'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
    {
      path: '/',
      component: () => import('@/layout/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'recharge',  name: 'recharge',  component: () => import('@/views/RechargeReviewView.vue') },
        { path: 'games',     name: 'games',     component: () => import('@/views/GameManageView.vue') },
        { path: 'agents',    name: 'agents',    component: () => import('@/views/AgentManageView.vue') },
        { path: 'risk',      name: 'risk',      component: () => import('@/views/RiskView.vue') },
        { path: 'logs',      name: 'logs',      component: () => import('@/views/LogView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const store = useAdminStore()

  // 若有 token 但 profile 未恢复，先调 /users/me 恢复
  if (store.token && !store.profile) {
    try {
      const user = await http.get<AdminProfile, AdminProfile>('/users/me')
      if (user.role !== 'ADMIN' && user.role !== 'BRANCH') {
        store.logout()
      } else {
        store.setAuth(user as AdminProfile, store.token)
      }
    } catch {
      store.logout()
    }
  }

  if (!to.meta.public && !store.isLoggedIn) return { name: 'login' }
  if (to.name === 'login' && store.isLoggedIn) return { path: '/' }
})

interface AdminProfile { id: string; uid: string; username: string; nickname: string; role: string }

export default router
