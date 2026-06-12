import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { useAdminStore } from '@/stores/admin'
import router from '@/router'

interface Envelope<T = unknown> { code: number; data: T; message: string }

const http = axios.create({ baseURL: '/api', timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res: AxiosResponse<Envelope>) => {
    const { code, data, message } = res.data
    if (code === 0) return data as never
    return Promise.reject(new Error(message ?? '请求失败'))
  },
  (err) => {
    if (err.response?.status === 401) {
      const store = useAdminStore()
      store.logout()
      router.push('/login')
    }
    return Promise.reject(new Error(err.response?.data?.message ?? err.message ?? '网络异常'))
  },
)

export default http
