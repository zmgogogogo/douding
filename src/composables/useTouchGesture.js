/**
 * 移动端触控手势 — 双指缩放/旋转、长按取色、三指撤销
 * V3.0 文档 9.3 + 18.2
 */

import { ref } from 'vue'

export function useTouchGesture(opts = {}) {
  const {
    onZoom,
    onRotate,
    onPan,
    onLongPress,
    onUndo,
    onRedo,
  } = opts

  let touchStartTime = 0
  let touchStartPos = null
  let lastDist = 0
  let lastAngle = 0
  let longPressTimer = null
  let touchCount = 0

  function handleTouchStart(e) {
    touchCount = e.touches.length

    if (e.touches.length === 1) {
      // 单指：记录起始位置和时间（用于长按检测）
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      touchStartTime = Date.now()

      longPressTimer = setTimeout(() => {
        if (onLongPress && touchStartPos) {
          onLongPress(touchStartPos.x, touchStartPos.y)
        }
      }, 800)
    }

    if (e.touches.length === 2) {
      // 双指：记录初始距离和角度
      clearTimeout(longPressTimer)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist = Math.sqrt(dx * dx + dy * dy)
      lastAngle = Math.atan2(dy, dx) * 180 / Math.PI
    }

    // 三指以上
    if (e.touches.length >= 3) {
      touchCount = e.touches.length
    }
  }

  function handleTouchMove(e) {
    // 取消短按
    if (Date.now() - touchStartTime < 300 && touchStartPos) {
      const dx = e.touches[0].clientX - touchStartPos.x
      const dy = e.touches[0].clientY - touchStartPos.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        clearTimeout(longPressTimer)
        touchStartPos = null
      }
    }

    if (e.touches.length === 2) {
      // 双指缩放
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx) * 180 / Math.PI

      if (lastDist > 0 && onZoom) {
        const scale = dist / lastDist
        onZoom(scale)
      }

      if (lastAngle !== 0 && onRotate && Math.abs(angle - lastAngle) > 2) {
        onRotate(angle - lastAngle)
      }

      lastDist = dist
      lastAngle = angle
    }

    // 单指平移
    if (e.touches.length === 1 && onPan && touchStartPos) {
      const dx = e.touches[0].clientX - touchStartPos.x
      const dy = e.touches[0].clientY - touchStartPos.y
      onPan(dx, dy)
      touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  function handleTouchEnd(e) {
    clearTimeout(longPressTimer)

    // 三指下滑 = 撤销
    if (touchCount >= 3 && onUndo) {
      const now = Date.now()
      if (now - touchStartTime < 500) {
        onUndo()
      }
    }

    // 双指双击 = 适配屏幕
    if (e.touches.length === 0 && touchCount === 2 && Date.now() - touchStartTime < 300) {
      if (onZoom) onZoom(0) // 特殊信号：适配屏幕
    }

    // 单指双击 = 1:1/适配切换
    if (e.touches.length === 0 && touchCount === 1 && Date.now() - touchStartTime < 300) {
      if (onZoom) onZoom(-1) // 特殊信号：切换 1:1
    }

    lastDist = 0
    lastAngle = 0
    touchStartPos = null
    touchCount = 0
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
