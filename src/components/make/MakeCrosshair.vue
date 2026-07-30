<!-- ============================================
  MakeCrosshair.vue — 十字定位线叠加层
  跟随触摸/鼠标，贯穿全屏的水平+垂直十字线
  ============================================ -->
<template>
  <div v-if="mode !== 'off' && col !== null" class="crosshair-overlay">
    <!-- 水平线 -->
    <div
      class="crosshair-line crosshair-h"
      :style="{
        top: hLineY + 'px',
        borderColor: color,
      }"
    />
    <!-- 垂直线 -->
    <div
      class="crosshair-line crosshair-v"
      :style="{
        left: vLineX + 'px',
        borderColor: color,
      }"
    />
    <!-- 列标签 -->
    <span
      class="crosshair-label"
      :style="{
        left: vLineX + 'px',
        top: '6px',
        background: color,
      }"
    >
      {{ col + 1 }}
    </span>
    <!-- 行标签 -->
    <span
      class="crosshair-label"
      :style="{
        left: '6px',
        top: hLineY + 'px',
        background: color,
      }"
    >
      {{ row + 1 }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  col: { type: Number, default: null },
  row: { type: Number, default: null },
  zoom: { type: Number, default: 10 },
  panX: { type: Number, default: 0 },
  panY: { type: Number, default: 0 },
  gridW: { type: Number, default: 58 },
  gridH: { type: Number, default: 58 },
  mode: { type: String, default: 'follow' },
  color: { type: String, default: '#ef4444' },
  containerW: { type: Number, default: null },
  containerH: { type: Number, default: null },
})

// 计算十字线在画布区域内的像素位置
const hLineY = computed(() => {
  if (props.col === null || props.row === null) return 0
  const cw = props.containerW || window.innerWidth
  const ch = props.containerH || window.innerHeight
  const canvasTop = ch / 2 + props.panY - (props.gridH * props.zoom) / 2
  return Math.round(canvasTop + props.row * props.zoom + props.zoom / 2)
})

const vLineX = computed(() => {
  if (props.col === null || props.row === null) return 0
  const cw = props.containerW || window.innerWidth
  const canvasLeft = cw / 2 + props.panX - (props.gridW * props.zoom) / 2
  return Math.round(canvasLeft + props.col * props.zoom + props.zoom / 2)
})
</script>

<style scoped>
.crosshair-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.crosshair-line {
  position: absolute;
}

.crosshair-h {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1.5px dashed;
  opacity: 0.7;
}

.crosshair-v {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1.5px dashed;
  opacity: 0.7;
}

.crosshair-label {
  position: absolute;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  font-family: monospace;
  z-index: 1;
  transform: translate(4px, -4px);
}
</style>
