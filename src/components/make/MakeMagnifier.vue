<!-- ============================================
  MakeMagnifier.vue — 放大镜浮窗组件
  右下角悬浮，实时放大显示触摸位置局部细节
  ============================================ -->
<template>
  <div
    class="magnifier-window"
    :style="{
      width: size + 'px',
      height: size + 'px',
    }"
  >
    <canvas ref="magCanvasRef" width="150" height="150" />
    <button class="magnifier-close" @click="$emit('close')">✕</button>
    <div class="magnifier-zoom-label">{{ scale }}×</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  sourceCanvas: { type: HTMLCanvasElement, default: null },
  centerX: { type: Number, default: 0 },
  centerY: { type: Number, default: 0 },
  scale: { type: Number, default: 3 },
  size: { type: Number, default: 150 },
  showGrid: { type: Boolean, default: true },
  showCrosshair: { type: Boolean, default: true },
})

defineEmits(['close'])

const magCanvasRef = ref(null)
</script>

<style scoped>
.magnifier-window {
  position: absolute;
  right: 12px;
  bottom: 60px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 25;
  background: #1e293b;
}

.magnifier-window canvas {
  width: 100%;
  height: 100%;
}

.magnifier-close {
  position: absolute;
  top: 8px;
  right: 14px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.magnifier-zoom-label {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 600;
}
</style>
