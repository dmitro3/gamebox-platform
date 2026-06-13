import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/common.css'
import { useClickSound } from './composables/useClickSound'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// 全局点击音效
const { attach } = useClickSound()
attach()

