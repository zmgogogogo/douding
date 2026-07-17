<!--
  标尺组件 — 顶部横向标尺 + 左侧纵向标尺
  - 随画布缩放/平移联动
  - 支持单位切换（豆子/像素/cm/英寸）
  - 从标尺拖拽生成参考线
  - 鼠标位置刻度实时高亮
-->
<template>
  <div class="ruler-container" :style="containerStyle">
    <!-- 顶部横向标尺 -->
    <canvas
      ref="hRulerRef"
      class="ruler ruler-h"
      :style="{ height: rulerSize + 'px', width: hRulerWidth + 'px' }"
    />

    <!-- 左侧纵向标尺 -->
    <canvas
      ref="vRulerRef"
      class="ruler ruler-v"
      :style="{ width: rulerSize + 'px', height: vRulerHeight + 'px' }"
    />

    <!-- 角落方块 -->
    <div class="ruler-corner" :style="{ width: rulerSize + 'px', height: rulerSize + 'px' }" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  /** 标尺尺寸（px） */
  rulerSize: { type: Number, default: 24 },
  /** 当前缩放 */
  zoom: { type: Number, default: 10 },
  /** 平移偏移 X */
  panX: { type: Number, default: 0 },
  /** 平移偏移 Y */
  panY: { type: Number, default: 0 },
  /** 画布宽度（格子数） */
  gridW: { type: Number, default: 50 },
  /** 画布高度（格子数） */
  gridH: { type: Number, default: 50 },
  /** 容器宽度 */
  containerW: { type: Number, default: 800 },
  /** 容器高度 */
  containerH: { type: Number, default: 600 },
  /** 鼠标格子坐标 */
  mouseCell: { type: Object, default: null },
  /** 标尺单位 */
  unit: { type: String, default: 'bead' }, // 'bead'|'px'|'cm'|'inch'
})

const emit = defineEmits(['createGuide'])

const hRulerRef = ref(null)
const vRulerRef = ref(null)

// ==================== 计算样式 ====================

const containerStyle = computed(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 100,
}))

const hRulerWidth = computed(() => props.containerW - props.rulerSize)
const vRulerHeight = computed(() => props.containerH - props.rulerSize)

// ==================== 渲染标尺 ====================

function drawRuler() {
  drawHorizontalRuler()
  drawVerticalRuler()
}

function drawHorizontalRuler() {
  const canvas = hRulerRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const size = props.rulerSize
  const w = canvas.clientWidth
  const h = size

  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 背景
  ctx.fillStyle = '#f1f3f5'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#d0d4d8'
  ctx.lineWidth = 1
  ctx.strokeRect(0, h - 1, w, 1)

  const { zoom, panX, gridW } = props
  const contentW = gridW * zoom

  // 计算画布内容在容器中的偏移
  const contentLeft = (w - props.rulerSize - contentW) / 2 + panX

  // 刻度间距（保证文字不重叠）
  const tickInterval = getTickInterval(zoom)
  const pixelsPerTick = tickInterval * zoom

  // 找出第一个可见刻度
  const firstVisibleTick = Math.ceil((-contentLeft) / pixelsPerTick) * tickInterval

  ctx.fillStyle = '#6b7280'
  ctx.font = `${Math.min(10, zoom * 0.7)}px system-ui, sans-serif`
  ctx.textAlign = 'center'

  for (let tick = firstVisibleTick; tick * zoom + contentLeft < w; tick += tickInterval) {
    const x = contentLeft + tick * zoom

    if (tick % (tickInterval * 5) === 0) {
      // 大刻度
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + 0.5, h)
      ctx.lineTo(x + 0.5, h - 10)
      ctx.stroke()
      ctx.fillText(String(tick), x, h - 12)
    } else {
      // 小刻度
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(x + 0.5, h)
      ctx.lineTo(x + 0.5, h - 5)
      ctx.stroke()
    }
  }

  // 鼠标位置高亮
  if (props.mouseCell) {
    const mx = contentLeft + props.mouseCell.x * zoom + zoom / 2
    ctx.fillStyle = '#0058BC'
    ctx.beginPath()
    ctx.moveTo(mx - 4, h - 15)
    ctx.lineTo(mx + 4, h - 15)
    ctx.lineTo(mx, h - 7)
    ctx.closePath()
    ctx.fill()
  }
}

function drawVerticalRuler() {
  const canvas = vRulerRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const size = props.rulerSize
  const w = size
  const h = canvas.clientHeight

  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // 背景
  ctx.fillStyle = '#f1f3f5'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#d0d4d8'
  ctx.lineWidth = 1
  ctx.strokeRect(w - 1, 0, 1, h)

  const { zoom, panY, gridH } = props
  const contentH = gridH * zoom
  const contentTop = (h - contentH) / 2 + panY

  const tickInterval = getTickInterval(zoom)
  const pixelsPerTick = tickInterval * zoom
  const firstVisibleTick = Math.ceil((-contentTop) / pixelsPerTick) * tickInterval

  ctx.fillStyle = '#6b7280'
  ctx.font = `${Math.min(10, zoom * 0.7)}px system-ui, sans-serif`
  ctx.textAlign = 'right'

  for (let tick = firstVisibleTick; tick * zoom + contentTop < h; tick += tickInterval) {
    const y = contentTop + tick * zoom

    if (tick % (tickInterval * 5) === 0) {
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w, y + 0.5)
      ctx.lineTo(w - 10, y + 0.5)
      ctx.stroke()
      ctx.save()
      ctx.translate(w - 13, y)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText(String(tick), 0, 0)
      ctx.restore()
    } else {
      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(w, y + 0.5)
      ctx.lineTo(w - 5, y + 0.5)
      ctx.stroke()
    }
  }

  // 鼠标位置高亮
  if (props.mouseCell) {
    const my = contentTop + props.mouseCell.y * zoom + zoom / 2
    ctx.fillStyle = '#0058BC'
    ctx.beginPath()
    ctx.moveTo(w - 15, my - 4)
    ctx.lineTo(w - 15, my + 4)
    ctx.lineTo(w - 7, my)
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * 根据缩放比例确定刻度间隔
 * zoom=2: 每10格
 * zoom=5: 每5格
 * zoom=10: 每2格
 * zoom=20: 每1格
 * zoom=40+: 每1格+小数
 */
function getTickInterval(zoom) {
  if (zoom >= 40) return 1
  if (zoom >= 15) return 2
  if (zoom >= 8) return 5
  if (zoom >= 4) return 10
  return 20
}

// ==================== 生命周期 ====================

let rafId = null

function scheduleDraw() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    drawRuler()
  })
}

watch(() => [props.zoom, props.panX, props.panY, props.gridW, props.gridH, props.mouseCell, props.containerW, props.containerH], scheduleDraw, { deep: true })

onMounted(() => {
  nextTick(() => drawRuler())
})
</script>

<style scoped>
.ruler-container {
  pointer-events: none;
  overflow: hidden;
}

.ruler {
  position: absolute;
  display: block;
}

.ruler-h {
  top: 0;
  left: v-bind(rulerSize + 'px');
  image-rendering: auto;
}

.ruler-v {
  top: v-bind(rulerSize + 'px');
  left: 0;
  image-rendering: auto;
}

.ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  background: #f1f3f5;
  border-right: 1px solid #d0d4d8;
  border-bottom: 1px solid #d0d4d8;
}
</style>
