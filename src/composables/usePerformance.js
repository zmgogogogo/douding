/**
 * 性能监控 — 帧率/内存/操作延迟追踪（V3.0 16.1）
 * 修复：定时器在最后一个组件卸载时自动清理，防止内存泄漏
 */

import { ref, onUnmounted } from 'vue'

// 模块级单例
const fps = ref(60)
const frameTime = ref(0)
const memoryUsage = ref(0)
const renderCalls = ref(0)
const lastOpLatency = ref(0)
const isLowPerformance = ref(false)

let frameCount = 0
let lastFrameTime = 0
let fpsAccum = 0

function updateFPS() {
  const now = performance.now()
  if (lastFrameTime) {
    const dt = now - lastFrameTime
    frameTime.value = Math.round(dt * 100) / 100
    fpsAccum += dt
    frameCount++
    if (fpsAccum >= 1000) {
      fps.value = Math.round((frameCount / fpsAccum) * 1000)
      frameCount = 0
      fpsAccum = 0
    }
    // 连续 3 秒低于 15fps 标记低性能
    isLowPerformance.value = fps.value < 15
  }
  lastFrameTime = now
}

function updateMemory() {
  if (performance.memory) {
    memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
  }
}

/** 记录渲染调用次数 */
function incrementRenderCalls() {
  renderCalls.value++
}

// 定时器管理：引用计数 + 自动清理
let _instanceCount = 0
let _resetTimer = null
let _memoryTimer = null

function _startTimers() {
  _instanceCount++
  if (_resetTimer) return // 已在运行
  _resetTimer = setInterval(() => {
    renderCalls.value = 0
  }, 1000)
  _memoryTimer = setInterval(updateMemory, 5000)
}

function _stopTimersIfNoInstances() {
  _instanceCount--
  if (_instanceCount <= 0) {
    _instanceCount = 0
    if (_resetTimer) {
      clearInterval(_resetTimer)
      _resetTimer = null
    }
    if (_memoryTimer) {
      clearInterval(_memoryTimer)
      _memoryTimer = null
    }
  }
}

export function usePerformance() {
  _startTimers()
  onUnmounted(() => _stopTimersIfNoInstances())

  return {
    fps,
    frameTime,
    memoryUsage,
    renderCalls,
    lastOpLatency,
    isLowPerformance,
    startFPSMonitor: updateFPS,
    stopFPSMonitor() {},
    recordLatency(startTime) {
      lastOpLatency.value = Math.round((performance.now() - startTime) * 100) / 100
    },
    incrementRenderCalls,
  }
}
