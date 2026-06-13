import axios from 'axios'
import type { AxiosResponse } from 'axios'
import { useUserStore } from '@/stores/user'

/** 后端统一响应信封 */
interface Envelope<T = unknown> {
  code: number
  data: T
  message: string
}

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：注入 Bearer token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截：解包信封 / 统一错误处理
http.interceptors.response.use(
  (res: AxiosResponse<Envelope>) => {
    const envelope = res.data
    if (envelope.code === 0) return envelope.data as any
    return Promise.reject(new Error(envelope.message ?? '请求失败'))
  },
  (err) => {
    if (err.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logout()
      window.location.replace('/login')
    }
    const msg = err.response?.data?.message ?? err.message ?? '网络异常'
    return Promise.reject(new Error(msg))
  },
)

export default http
