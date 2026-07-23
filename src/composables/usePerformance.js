/**
 * 性能监控 — 帧率/内存/操作延迟追踪（V3.0 16.1）
 */

import { ref, reactive } from 'vue'

// 模块级单例
const fps = ref(60)
const frameTime = ref(0)
const memoryUsage = ref(0)
const renderCalls = ref(0)
const lastOpLatency = ref(0)
const isLowPerformance = ref(false)

let frameCount = 0
let lastFrameTime = performance.now()
let fpsTimer = null

/** 启动帧率监控 */
function startFPSMonitor() {
  function tick() {
    frameCount++
    const now = performance.now()
    if (now - lastFrameTime >= 1000) {
      fps.value = Math.round(frameCount / ((now - lastFrameTime) / 1000))
      frameTime.value = Math.round(((now - lastFrameTime) / frameCount) * 100) / 100
      frameCount = 0
      lastFrameTime = now

      // 自动检测低性能设备（持续 < 30fps）
      if (fps.value < 30 && !isLowPerformance.value) {
        isLowPerformance.value = true
        console.warn('[Perf] 检测到低性能，建议开启性能模式')
      }
    }
    fpsTimer = requestAnimationFrame(tick)
  }
  fpsTimer = requestAnimationFrame(tick)
}

function stopFPSMonitor() {
  if (fpsTimer) {
    cancelAnimationFrame(fpsTimer)
    fpsTimer = null
  }
}

/** 记录操作延迟 */
function recordLatency(startTime) {
  lastOpLatency.value = Math.round((performance.now() - startTime) * 100) / 100
}

/** 获取内存使用（Chrome 专有） */
function updateMemory() {
  if (performance.memory) {
    memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
  }
}

/** 记录渲染调用次数 */
function incrementRenderCalls() {
  renderCalls.value++
}

/** 重置渲染计数（每秒） */
setInterval(() => {
  renderCalls.value = 0
}, 1000)
setInterval(updateMemory, 5000)

export function usePerformance() {
  return {
    fps,
    frameTime,
    memoryUsage,
    renderCalls,
    lastOpLatency,
    isLowPerformance,
    startFPSMonitor,
    stopFPSMonitor,
    recordLatency,
    incrementRenderCalls,
  }
}
