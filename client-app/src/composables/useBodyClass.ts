import { onMounted, onUnmounted } from 'vue'

/**
 * 原型页面把 deco-bg / lobby-bg / welcome-login 等 class 挂在 <body> 上，
 * 大量 CSS 规则以 body.xxx 为前缀。SPA 里用本组合函数在进入页面时
 * 给 body 挂上同样的 class，离开时移除，使原型 CSS 原样生效。
 */
export function useBodyClass(...classes: string[]) {
  onMounted(() => {
    document.body.classList.add(...classes)
  })
  onUnmounted(() => {
    document.body.classList.remove(...classes)
  })
}
