// ============================================
//  豆丁 (Douding) — Vue 3 应用入口
// ============================================
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
