<!-- ============================================
  EditorToolbar.vue — 左侧工具箱
  V3.0 文档第4节：6大类工具，垂直排列
  ============================================ -->
<template>
  <aside class="flex flex-col items-center w-12 bg-[var(--ui-bg-surface)] border-r border-[var(--ui-border-glass)] flex-shrink-0 select-none z-20 overflow-visible">
    <div class="flex flex-col items-center py-2 overflow-y-auto scrollbar-hide w-full h-full">
    <!-- 第一组：导航工具 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ active: currentTool === 'move' }"
        @click="$emit('selectTool', 'move')" title="移动 (V)">
        <HandIcon :size="16" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'zoom' }"
        @click="$emit('selectTool', 'zoom')" title="缩放 (Z)">
        <ZoomInIcon :size="16" />
      </button>
    </div>

    <div class="tool-divider" />

    <!-- 第二组：绘制工具 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ active: currentTool === 'brush' }"
        @click="$emit('selectTool', 'brush')" title="画笔 (B)">
        <PencilIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'eraser' }"
        @click="$emit('selectTool', 'eraser')" title="橡皮 (E)">
        <EraserIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'fill' }"
        @click="$emit('selectTool', 'fill')" title="填充 (G)">
        <PaintBucketIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'picker' }"
        @click="$emit('selectTool', 'picker')" title="吸色 (I)">
        <PipetteIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'replace' }"
        @click="$emit('selectTool', 'replace')" title="颜色替换 (R)">
        <ReplaceIcon :size="15" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'gradient' }"
        @click="$emit('selectTool', 'gradient')" title="渐变 (J)">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
        </svg>
      </button>
    </div>

    <div class="tool-divider" />

    <!-- 第三组：形状工具 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ active: currentTool === 'line' }"
        @click="$emit('selectTool', 'line')" title="直线 (L)">
        <MinusIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'rect' }"
        @click="$emit('selectTool', 'rect')" title="矩形 (U)">
        <SquareIcon :size="15" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'circle' }"
        @click="$emit('selectTool', 'circle')" title="圆形 (O)">
        <CircleIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'text' }"
        @click="$emit('selectTool', 'text')" title="文字 (T)">
        <TypeIcon :size="17" />
      </button>
    </div>

    <div class="tool-divider" />

    <!-- 第四组：选区工具 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ active: currentTool === 'select' }"
        @click="$emit('selectTool', 'select')" title="矩形选区 (M)">
        <PointerIcon :size="17" />
      </button>
      <button class="toolbar-btn" :class="{ active: currentTool === 'wand' }"
        @click="$emit('selectTool', 'wand')" title="魔棒 (W)">
        <Wand2Icon :size="15" />
      </button>
    </div>

    <div class="tool-divider" />

    <!-- 第五组：辅助视图 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ 'text-primary': showGrid }"
        @click="$emit('toggleGrid')" title="网格 (H)">
        <Grid3x3Icon :size="16" />
      </button>
      <button class="toolbar-btn" :class="{ active: symmetryMode !== 'none' }"
        @pointerdown.prevent="$emit('cycleSymmetry')" @dblclick.prevent="$emit('cycleSymmetry')"
        :title="'镜像 (K): ' + symLabels[symmetryMode]">
        <SymmetryIcon :size="17" />
      </button>
    </div>

    <div class="flex-1" />

    <!-- 底部：参考图透明度 -->
    <div class="tool-group">
      <button class="toolbar-btn" :class="{ 'text-primary': refOpacity > 0 }"
        @click="$emit('cycleRefOpacity')" title="参考图透明度 (R)">
        <EyeIcon v-if="refOpacity > 0" :size="16" />
        <EyeOffIcon v-else :size="16" />
      </button>
    </div>
    </div>
  </aside>
</template>

<script setup>
import { h } from 'vue'
import {
  HandIcon, ZoomInIcon,
  PencilIcon, EraserIcon, PaintBucketIcon, PipetteIcon,
  MinusIcon, SquareIcon, CircleIcon, TypeIcon,
  PointerIcon, Wand2Icon,
  Grid3x3Icon, EyeIcon, EyeOffIcon,
} from 'lucide-vue-next'

const ReplaceIcon = {
  render() {
    return h('svg', {
      width: 15, height: 15, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }, [
      h('path', { d: 'M20 7h-6l2 2-8 8-4-4 2-2' }),
      h('path', { d: 'M4 17h6l-2-2 8-8 4 4-2 2' }),
    ])
  }
}

const SymmetryIcon = {
  render() {
    return h('svg', {
      width: 17, height: 17, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }, [
      h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
      h('line', { x1: 12, y1: 3, x2: 12, y2: 21 }),
      h('line', { x1: 3, y1: 12, x2: 21, y2: 12 }),
    ])
  }
}

defineProps({
  currentTool: { type: String, default: 'brush' },
  showGrid: { type: Boolean, default: true },
  refOpacity: { type: Number, default: 0 },
  symmetryMode: { type: String, default: 'none' },
})

defineEmits([
  'selectTool', 'toggleGrid', 'cycleSymmetry', 'cycleRefOpacity',
])

const symLabels = { none: '关闭', h: '水平', v: '垂直', quad: '四向' }
</script>

<style scoped>
.toolbar-btn {
  @apply relative w-9 h-9 flex items-center justify-center rounded-xl
         text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]
         hover:bg-[var(--ui-bg-tertiary)] transition-all duration-150;
}
.toolbar-btn:hover { transform: scale(1.08); }
.toolbar-btn:active { transform: scale(0.92); }
.toolbar-btn.active {
  @apply text-white;
  background-color: var(--ui-accent);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.tool-group {
  @apply flex flex-col items-center gap-0.5;
}

.tool-divider {
  @apply w-6 border-t border-[var(--ui-border-glass)] my-1.5;
}
</style>
