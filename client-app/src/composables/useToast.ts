import { ref } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

const toasts = ref<ToastItem[]>([])
let seq = 0

export function useToast() {
  function show(message: string, type: ToastItem['type'] = 'info', duration = 2000) {
    const id = ++seq
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    toast: (msg: string) => show(msg, 'info'),
    success: (msg: string) => show(msg, 'success'),
    error: (msg: string) => show(msg, 'error'),
  }
}
