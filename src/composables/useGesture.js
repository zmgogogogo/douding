// ============================================================
//  useGesture.js — 拼豆制作模式手势交互
//  支持缩放/平移/双指旋转/双击/长按/左右滑动切步
// ============================================================
import { ref, reactive } from 'vue'

// 手势识别配置
const GESTURE_CONFIG = {
  doubleTapDelay: 300,        // 双击间隔 (ms)
  longPressDelay: 500,        // 长按触发时间 (ms)
  swipeThreshold: 50,         // 滑动触发距离 (px)
  swipeVelocityThreshold: 0.3, // 滑动速度阈值 (px/ms)
  pinchThreshold: 10,         // 捏合触发最小距离变化 (px)
  rotationThreshold: 5,       // 旋转触发最小角度变化 (度)
}

export function useGesture() {
  // 手势状态
  const isPanning = ref(false)
  const isPinching = ref(false)
  const isRotating = ref(false)
  const isLongPressing = ref(false)
  const antiMisTouch = ref(false) // 防误触锁定

  // 内部状态
  const state = reactive({
    // 平移
    panStartX: 0,
    panStartY: 0,
    panStartPX: 0,
    panStartPY: 0,
    // 捏合
    pinchStartDist: 0,
    pinchStartZoom: 0,
    // 旋转
    rotateStartAngle: 0,
    rotateStartRotation: 0,
    // 双击
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    // 长按
    longPressTimer: null,
    longPressX: 0,
    longPressY: 0,
    // 滑动
    swipeStartX: 0,
    swipeStartY: 0,
    swipeStartTime: 0,
  })

  // 回调
  let callbacks = {
    onPanStart: null,
    onPanMove: null,
    onPanEnd: null,
    onZoomChange: null,
    onRotate: null,
    onDoubleTap: null,
    onLongPress: null,
    onSwipeLeft: null,
    onSwipeRight: null,
  }

  /**
   * 设置回调函数
   */
  function setCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs }
  }

  /**
   * 处理鼠标按下
   */
  function handleMouseDown(e, panX, panY) {
    if (antiMisTouch.value) return
    if (e.button === 0 || e.button === 1) {
      isPanning.value = true
      state.panStartX = e.clientX
      state.panStartY = e.clientY
      state.panStartPX = panX
      state.panStartPY = panY
      callbacks.onPanStart?.()
    }
  }

  /**
   * 处理鼠标移动
   */
  function handleMouseMove(e, panXRef, panYRef, onUpdate) {
    if (!isPanning.value) return

    const dx = e.clientX - state.panStartX
    const dy = e.clientY - state.panStartY
    const newX = state.panStartPX + dx
    const newY = state.panStartPY + dy

    if (onUpdate) {
      onUpdate(newX, newY)
    } else {
      panXRef.value = newX
      panYRef.value = newY
    }

    callbacks.onPanMove?.({ x: newX, y: newY })
  }

  /**
   * 处理鼠标释放
   */
  function handleMouseUp() {
    isPanning.value = false
    callbacks.onPanEnd?.()
  }

  /**
   * 处理滚轮
   */
  function handleWheel(e, currentZoom, onZoomChange) {
    if (antiMisTouch.value) return
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      // 缩放
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const newZoom = Math.max(0.5, Math.min(160, currentZoom * factor))
      onZoomChange?.(newZoom)
    } else {
      // 平移
      callbacks.onPanMove?.({ dx: -e.deltaX, dy: -e.deltaY })
    }
  }

  /**
   * 处理触摸开始
   */
  function handleTouchStart(e, currentZoom, panX, panY, currentRotation = 0) {
    if (antiMisTouch.value) return

    if (e.touches.length === 1) {
      // 单指：平移 / 长按检测
      const touch = e.touches[0]
      isPanning.value = true
      state.panStartX = touch.clientX
      state.panStartY = touch.clientY
      state.panStartPX = panX
      state.panStartPY = panY

      // 长按检测
      state.longPressX = touch.clientX
      state.longPressY = touch.clientY
      state.longPressTimer = setTimeout(() => {
        isLongPressing.value = true
        callbacks.onLongPress?.({ x: touch.clientX, y: touch.clientY })
      }, GESTURE_CONFIG.longPressDelay)

      callbacks.onPanStart?.()
    } else if (e.touches.length === 2) {
      // 双指：捏合缩放 + 旋转
      clearTimeout(state.longPressTimer)
      isPanning.value = false
      isPinching.value = true
      isRotating.value = true

      const t0 = e.touches[0]
      const t1 = e.touches[1]
      const dx = t0.clientX - t1.clientX
      const dy = t0.clientY - t1.clientY
      state.pinchStartDist = Math.sqrt(dx * dx + dy * dy)
      state.pinchStartZoom = currentZoom
      state.rotateStartAngle = Math.atan2(dy, dx) * (180 / Math.PI)
      state.rotateStartRotation = currentRotation
    }
  }

  /**
   * 处理触摸移动
   */
  function handleTouchMove(e, panXRef, panYRef, zoomRef, rotationRef, onUpdate) {
    if (antiMisTouch.value) return

    if (e.touches.length === 1 && isPanning.value) {
      // 清除长按（移动超过阈值）
      const touch = e.touches[0]
      const moved = Math.abs(touch.clientX - state.panStartX) + Math.abs(touch.clientY - state.panStartY)
      if (moved > 5) {
        clearTimeout(state.longPressTimer)
        isLongPressing.value = false
      }

      const dx = touch.clientX - state.panStartX
      const dy = touch.clientY - state.panStartY

      if (onUpdate) {
        onUpdate(state.panStartPX + dx, state.panStartPY + dy)
      }
    } else if (e.touches.length === 2 && isPinching.value) {
      const t0 = e.touches[0]
      const t1 = e.touches[1]
      const dx = t0.clientX - t1.clientX
      const dy = t0.clientY - t1.clientY
      const dist = Math.sqrt(dx * dx + dy * dy)

      // 缩放
      if (Math.abs(dist - state.pinchStartDist) > GESTURE_CONFIG.pinchThreshold) {
        const newZoom = Math.max(0.5, Math.min(160, state.pinchStartZoom * (dist / state.pinchStartDist)))
        if (onUpdate) {
          onUpdate(undefined, undefined, newZoom)
        }
        callbacks.onZoomChange?.(newZoom)
      }

      // 旋转
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      const deltaAngle = angle - state.rotateStartAngle
      if (Math.abs(deltaAngle) > GESTURE_CONFIG.rotationThreshold && rotationRef) {
        const newRotation = ((state.rotateStartRotation + deltaAngle) % 360 + 360) % 360
        rotationRef.value = newRotation
        callbacks.onRotate?.(newRotation)
      }
    }
  }

  /**
   * 处理触摸结束
   */
  function handleTouchEnd(e, zoomRef, onDoubleTapAction, onSwipeAction) {
    clearTimeout(state.longPressTimer)

    if (isLongPressing.value) {
      isLongPressing.value = false
    }

    // 双击检测
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0]
      const now = Date.now()

      if (
        now - state.lastTapTime < GESTURE_CONFIG.doubleTapDelay &&
        Math.abs(touch.clientX - state.lastTapX) < 30 &&
        Math.abs(touch.clientY - state.lastTapY) < 30
      ) {
        // 双击：切换缩放（1:1 ↔ 适配屏幕）
        onDoubleTapAction?.()
      }

      // 滑动检测（左右边缘滑动切换步骤）
      const swipeDx = touch.clientX - state.swipeStartX
      const swipeTime = now - state.swipeStartTime
      if (
        Math.abs(swipeDx) > GESTURE_CONFIG.swipeThreshold &&
        swipeTime > 0 &&
        Math.abs(swipeDx) / swipeTime > GESTURE_CONFIG.swipeVelocityThreshold
      ) {
        if (swipeDx > 0) {
          callbacks.onSwipeRight?.()
          onSwipeAction?.('right')
        } else {
          callbacks.onSwipeLeft?.()
          onSwipeAction?.('left')
        }
      }

      state.lastTapTime = now
      state.lastTapX = touch.clientX
      state.lastTapY = touch.clientY
    }

    isPanning.value = false
    isPinching.value = false
    isRotating.value = false
    callbacks.onPanEnd?.()
  }

  /**
   * 处理键盘事件（PC端快捷键）
   */
  function handleKeyDown(e, actions) {
    const {
      onPrevStep,
      onNextStep,
      onTogglePlay,
      onRotateView,
      onFitScreen,
      onToggleGrid,
      onToggleLabels,
    } = actions || {}

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        onNextStep?.()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        onPrevStep?.()
        break
      case ' ':
        e.preventDefault()
        onTogglePlay?.()
        break
      case 'r':
      case 'R':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onRotateView?.(90)
        }
        break
      case 'f':
      case 'F':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onFitScreen?.()
        }
        break
      case 'g':
      case 'G':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onToggleGrid?.()
        }
        break
      case 'c':
      case 'C':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          onToggleLabels?.()
        }
        break
    }
  }

  /**
   * 切换防误触模式
   */
  function toggleAntiMisTouch() {
    antiMisTouch.value = !antiMisTouch.value
    return antiMisTouch.value
  }

  return {
    // 状态
    isPanning,
    isPinching,
    isRotating,
    isLongPressing,
    antiMisTouch,

    // 配置
    GESTURE_CONFIG,

    // 方法
    setCallbacks,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
    toggleAntiMisTouch,
  }
}
