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
//  禁用 iPad/iPhone Safari 缩放（让页面像原生 App 一样固定）
//  iOS 10+ 会忽略 viewport 的 user-scalable=no / maximum-scale=1，
//  因此必须用 JS 兜底：
//    1. gesture 事件 —— 阻止双指捏合缩放
//    2. touchend —— 阻止「同一位置快速双击」触发的双击缩放
//  画布自带缩放（按钮/滚轮），浏览器的缩放会与之冲突导致错位。
// ============================================
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false })
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false })

// 双击缩放：仅拦截「同一位置 + 300ms 内」的第二次触摸，不影响不同位置的连续点击
let _lastTap = { time: 0, x: 0, y: 0 }
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    const t = e.changedTouches && e.changedTouches[0]
    if (!t) return
    const isDoubleTap =
      now - _lastTap.time <= 300 &&
      Math.abs(t.clientX - _lastTap.x) < 30 &&
      Math.abs(t.clientY - _lastTap.y) < 30
    if (isDoubleTap) e.preventDefault()
    _lastTap = { time: now, x: t.clientX, y: t.clientY }
  },
  { passive: false }
)

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
