// ============================================
//  豆丁 (Douding) — Vue 3 应用入口
// ============================================
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './style.css'

// ============================================
//  全局 JS 异常捕获
//  文档参考: .claude/作品详情.md §6.1
// ============================================
window.addEventListener('error', (e) => {
  // 忽略资源加载错误（由各组件自行处理 onerror）
  if (e.target instanceof HTMLImageElement || e.target instanceof HTMLScriptElement) return
  console.error('[全局异常]', e.message, '\n文件:', e.filename, '\n行号:', e.lineno, '\n堆栈:', e.error?.stack)
  // TODO: 接入日志上报服务
})

// 未捕获的 Promise 拒绝
window.addEventListener('unhandledrejection', (e) => {
  console.error('[未处理的 Promise 拒绝]', e.reason)
  // TODO: 接入日志上报服务
})

// ============================================
//  全局图片加载兜底
// ============================================
document.addEventListener('error', (e) => {
  if (e.target instanceof HTMLImageElement) {
    const img = e.target
    // 避免无限重试
    if (!img.dataset.fallbackTried) {
      img.dataset.fallbackTried = '1'
      // 生成默认占位图
      img.src = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#e2e8f0" width="100" height="100"/>' +
        '<text fill="#94a3b8" font-size="12" text-anchor="middle" x="50" y="55">图片加载失败</text>' +
        '</svg>'
      )
    }
  }
}, true)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
