<!-- ============================================
  MakeCanvas.vue — 制作模式画布容器 (v2.0)
  纯呈现组件，向外暴露 canvas 元素引用
  渲染逻辑由父组件通过 useCanvasRender composable 控制
  ============================================ -->
<template>
  <div
    ref="containerRef"
    class="make-canvas-container"
    @wheel="onWheel"
    @mousedown="onPanStart"
    @mousemove="onMouseMove"
    @mouseup="onPanEnd"
    @mouseleave="onPanEnd"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @dblclick="onDoubleClick"
  >
    <!-- 全局坐标网格（底层） -->
    <canvas ref="globalGridRef" class="global-grid-canvas" />
    <!-- 图纸画布（珠子渲染层） -->
    <canvas ref="mainRef" class="main-canvas" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { screenToGrid } from '@/utils/coordinate.js'

const props = defineProps({
  gridWidth: { type: Number, default: 58 },
  gridHeight: { type: Number, default: 58 },
})

const emit = defineEmits(['zoomChange', 'touchCoord', 'panUpdate', 'doubleTap'])

const containerRef = ref(null)
const globalGridRef = ref(null)
const mainRef = ref(null)

// 当前缩放和平移值（由父组件同步）
const zoom = ref(10)
const panX = ref(0)
const panY = ref(0)

// 公共方法：更新缩放状态
function updateViewState(newZoom, newPanX, newPanY) {
  if (newZoom !== undefined) zoom.value = newZoom
  if (newPanX !== undefined) panX.value = newPanX
  if (newPanY !== undefined) panY.value = newPanY
}

// 公共方法：缩放控制
function zoomIn(factor = 1.25) {
  zoom.value = Math.min(160, zoom.value * factor)
  emit('zoomChange', zoom.value)
  return zoom.value
}
function zoomOut(factor = 1.25) {
  zoom.value = Math.max(0.5, zoom.value / factor)
  emit('zoomChange', zoom.value)
  return zoom.value
}
function zoomFit() {
  if (!containerRef.value) return zoom.value
  zoom.value = Math.min(160, Math.max(0.5,
    Math.floor(Math.min(
      containerRef.value.clientWidth / props.gridWidth,
      containerRef.value.clientHeight / props.gridHeight
    ) * 0.85)
  ))
  panX.value = 0
  panY.value = 0
  emit('zoomChange', zoom.value)
  return zoom.value
}
function zoomActual() {
  zoom.value = 10
  emit('zoomChange', zoom.value)
  return zoom.value
}
defineExpose({ mainRef, globalGridRef, containerRef, zoom, panX, panY, zoomIn, zoomOut, zoomFit, zoomActual, updateViewState })

// 获取网格坐标
function getCoord(e) {
  if (!containerRef.value) return null
  const rect = containerRef.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const coord = screenToGrid(sx, sy, zoom.value, panX.value, panY.value, props.gridWidth, props.gridHeight, rect.width, rect.height)
  if (coord) {
    emit('touchCoord', { col: coord.col, row: coord.row, x: e.clientX, y: e.clientY })
  }
  return coord
}

// 鼠标事件
let panning = false
let panStart = { x: 0, y: 0 }
let panStartPX = 0, panStartPY = 0

function onPanStart(e) {
  if (e.button === 0 || e.button === 1) {
    panning = true
    panStart = { x: e.clientX, y: e.clientY }
    panStartPX = panX.value
    panStartPY = panY.value
  }
}
function onMouseMove(e) {
  getCoord(e)
  if (!panning) return
  panX.value = panStartPX + (e.clientX - panStart.x)
  panY.value = panStartPY + (e.clientY - panStart.y)
  emit('panUpdate', { panX: panX.value, panY: panY.value })
}
function onPanEnd() { panning = false }

function onWheel(e) {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    if (e.deltaY < 0) {
      zoom.value = Math.min(160, zoom.value * 1.15)
    } else {
      zoom.value = Math.max(0.5, zoom.value / 1.15)
    }
    emit('zoomChange', zoom.value)
  } else {
    panX.value += -e.deltaX
    panY.value += -e.deltaY
    emit('panUpdate', { panX: panX.value, panY: panY.value })
  }
}

function onDoubleClick() {
  emit('doubleTap')
}

// 触摸事件
let touches0 = null, zoom0 = 0

function onTouchStart(e) {
  if (e.touches.length === 1) {
    getCoord(e.touches[0])
    panning = true
    panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    panStartPX = panX.value
    panStartPY = panY.value
  } else if (e.touches.length === 2) {
    panning = false
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    touches0 = { dist: Math.sqrt(dx * dx + dy * dy), cx: 0, cy: 0 }
    zoom0 = zoom.value
  }
}

function onTouchMove(e) {
  if (e.touches.length === 1 && panning) {
    getCoord(e.touches[0])
    panX.value = panStartPX + (e.touches[0].clientX - panStart.x)
    panY.value = panStartPY + (e.touches[0].clientY - panStart.y)
    emit('panUpdate', { panX: panX.value, panY: panY.value })
  } else if (e.touches.length === 2 && touches0) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.sqrt(dx * dx + dy * dy)
    zoom.value = Math.min(160, Math.max(0.5, zoom0 * (dist / touches0.dist)))
    emit('zoomChange', zoom.value)
  }
}
function onTouchEnd() { panning = false; touches0 = null }
</script>

<style scoped>
.make-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1e293b;
  cursor: grab;
}
.make-canvas-container:active {
  cursor: grabbing;
}
.global-grid-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  pointer-events: none;
}
.main-canvas {
  position: absolute;
  z-index: 1;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
