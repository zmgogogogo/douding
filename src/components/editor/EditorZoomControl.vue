<!-- ============================================
  EditorZoomControl.vue — 底部缩放控件
  ohmybead.cn 风格：悬浮毛玻璃圆角 pill
  ============================================ -->
<template>
  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-full
              shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[var(--ui-border)] px-3 py-1.5
              flex items-center gap-2 z-10 select-none">
    <!-- 适配屏幕 -->
    <button class="zoom-btn" @click="$emit('zoomToFit')" title="适配屏幕">
      <ScanIcon :size="13" />
    </button>
    <!-- 缩小 -->
    <button class="zoom-btn text-[13px] font-bold" @click="$emit('zoomOut')" title="缩小">−</button>
    <!-- 滑块 -->
    <input type="range" :min="minZoom" :max="maxZoom" :step="step" :value="zoom"
      class="w-20 h-1 accent-primary cursor-pointer"
      @input="$emit('setZoom', parseFloat($event.target.value))" />
    <!-- 放大 -->
    <button class="zoom-btn text-[13px] font-bold" @click="$emit('zoomIn')" title="放大">+</button>
    <!-- 百分比 -->
    <span class="text-[11px] font-mono font-bold text-[var(--ui-text-secondary)] w-10 text-center select-none">
      {{ Math.round(zoom * 100) }}%
    </span>
    <!-- 1:1 -->
    <button class="zoom-btn" @click="$emit('zoomTo1x')" title="1:1 原始尺寸">
      <span class="text-[9px] font-bold">1:1</span>
    </button>
  </div>
</template>

<script setup>
import { ScanIcon } from 'lucide-vue-next'

defineProps({
  zoom: { type: Number, default: 10 },
  minZoom: { type: Number, default: 0.5 },
  maxZoom: { type: Number, default: 30 },
  step: { type: Number, default: 0.5 },
})

defineEmits(['zoomToFit', 'zoomOut', 'zoomIn', 'setZoom', 'zoomTo1x'])
</script>

<style scoped>
.zoom-btn {
  @apply w-6 h-6 rounded-full bg-[var(--ui-bg-tertiary)] flex items-center justify-center
         hover:bg-[var(--ui-border)] transition-colors text-[var(--ui-text-secondary)];
}
</style>
