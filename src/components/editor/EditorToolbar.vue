<!-- ============================================
  EditorToolbar.vue — 左侧工具栏
  ohmybead.cn 风格：垂直排列，工具+辅助+导入导出
  使用 CSS 即时 tooltip 替代原生 title（零延迟）
============================================ -->
<template>
  <div class="flex flex-col items-center gap-0.5 w-11 bg-[var(--ui-bg-surface)] border-r border-[var(--ui-border)] py-2 flex-shrink-0 select-none relative z-20">
    <!-- 绘制工具组 -->
    <button v-for="t in drawTools" :key="t.name"
      class="toolbar-btn group" :class="{ active: currentTool === t.name }"
      @click="$emit('selectTool', t.name)">
      <component :is="t.icon" :size="t.size || 18" />
      <span class="tooltip">{{ t.label }} ({{ t.key }})</span>
    </button>

    <div class="w-8 border-t border-[var(--ui-border)] my-1" />

    <!-- 视图辅助组 -->
    <button class="toolbar-btn group" :class="{ active: showGrid }"
      @click="$emit('toggleGrid')">
      <GridIcon :size="18" />
      <span class="tooltip">网格 (H)</span>
    </button>
    <button class="toolbar-btn group" :class="{ active: refOpacity > 0 }"
      @click="$emit('cycleRefOpacity')">
      <EyeIcon v-if="refOpacity > 0" :size="18" />
      <EyeOffIcon v-else :size="18" />
      <span class="tooltip">参考图透明度 (R)</span>
    </button>
    <button class="toolbar-btn group" :class="refLocked && 'text-amber-500'"
      @click="$emit('toggleRefLock')">
      <LockIcon v-if="refLocked" :size="16" />
      <UnlockIcon v-else :size="16" />
      <span class="tooltip">锁定参考图 (Ctrl+L)</span>
    </button>
    <div class="relative group">
      <button class="toolbar-btn" :class="{ active: symmetryMode !== 'none' }"
        @pointerdown.prevent="$emit('cycleSymmetry')" @dblclick.prevent="$emit('cycleSymmetry')">
        <SymmetryIcon :size="18" />
        <span v-if="symmetryMode !== 'none'" class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
      </button>
      <span class="tooltip">镜像 (K): {{ symmetryLabels[symmetryMode] }}</span>
    </div>

    <div class="w-8 border-t border-[var(--ui-border)] my-1" />

    <!-- 选区操作按钮（仅选中有选区时显示） -->
    <template v-if="currentTool === 'select' && hasSelection">
      <button class="toolbar-btn group text-blue-500" @click="$emit('copySelection')">
        <CopyIcon :size="15" /><span class="tooltip">复制 (Ctrl+C)</span></button>
      <button class="toolbar-btn group text-blue-500" @click="$emit('pasteSelection')">
        <ClipboardPasteIcon :size="15" /><span class="tooltip">粘贴 (Ctrl+V)</span></button>
      <button class="toolbar-btn group text-red-500" @click="$emit('deleteSelection')">
        <Trash2Icon :size="15" /><span class="tooltip">删除 (Del)</span></button>
      <button class="toolbar-btn group" @click="$emit('flipSelectionH')">
        <FlipHorizontalIcon :size="15" /><span class="tooltip">水平翻转</span></button>
      <button class="toolbar-btn group" @click="$emit('flipSelectionV')">
        <FlipVerticalIcon :size="15" /><span class="tooltip">垂直翻转</span></button>
      <div class="w-8 border-t border-[var(--ui-border)] my-1" />
    </template>

    <!-- 导入导出组 -->
    <button class="toolbar-btn group" @click="$emit('importImage')">
      <ImageIcon :size="18" /><span class="tooltip">导入图片</span></button>
    <button class="toolbar-btn group" @click="$emit('exportPNG')">
      <DownloadIcon :size="18" /><span class="tooltip">导出高清PNG</span></button>
    <button class="toolbar-btn group" @click="$emit('exportPDF')">
      <FileTextIcon :size="16" /><span class="tooltip">导出PDF图纸</span></button>

    <div class="flex-1" />

    <!-- 施工引导（底部） -->
    <button class="toolbar-btn group" :class="guideMode && 'text-green-500'"
      @click="$emit('toggleGuide')">
      <Wand2Icon :size="18" /><span class="tooltip">施工引导 (Ctrl+N)</span></button>
  </div>
</template>

<script setup>
import {
  PencilIcon, EraserIcon, PaintBucketIcon, PipetteIcon,
  HandIcon, PointerIcon, ReplaceIcon,
  Grid3x3Icon as GridIcon, EyeIcon, EyeOffIcon,
  LockIcon, UnlockIcon, ImageIcon, DownloadIcon, FileTextIcon,
  Wand2Icon, CopyIcon, ClipboardPasteIcon, Trash2Icon,
  FlipHorizontalIcon, FlipVerticalIcon
} from 'lucide-vue-next'
import { h } from 'vue'

// 对称模式图标组件
const SymmetryIcon = {
  render() {
    return h('svg', {
      width: 18, height: 18, viewBox: '0 0 24 24',
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
  refLocked: { type: Boolean, default: false },
  symmetryMode: { type: String, default: 'none' },
  guideMode: { type: Boolean, default: false },
  hasSelection: { type: Boolean, default: false },
})

defineEmits([
  'selectTool', 'toggleGrid', 'cycleRefOpacity', 'toggleRefLock',
  'cycleSymmetry', 'copySelection', 'pasteSelection', 'deleteSelection',
  'flipSelectionH', 'flipSelectionV',
  'importImage', 'exportPNG', 'exportPDF', 'toggleGuide'
])

const drawTools = [
  { name: 'brush', label: '画笔', key: 'B', icon: PencilIcon },
  { name: 'eraser', label: '橡皮', key: 'E', icon: EraserIcon, size: 16 },
  { name: 'fill', label: '填充', key: 'G', icon: PaintBucketIcon },
  { name: 'picker', label: '吸色', key: 'I', icon: PipetteIcon },
  { name: 'select', label: '框选', key: 'S', icon: PointerIcon },
  { name: 'replace', label: '替换', key: 'R', icon: ReplaceIcon },
  { name: 'move', label: '移动', key: 'M', icon: HandIcon },
]

const symmetryLabels = { none: '关闭', h: '水平镜像', v: '垂直镜像', quad: '四向镜像' }
</script>

<style scoped>
.toolbar-btn {
  @apply relative w-9 h-9 flex items-center justify-center rounded-xl
         text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)]
         hover:bg-[var(--ui-bg-tertiary)] transition-colors;
}
.toolbar-btn.active {
  @apply text-primary bg-primary/10;
}

/* 即时 tooltip：悬停即显，零延迟，显示在按钮上方偏右 */
.tooltip {
  @apply absolute bottom-full mb-0.5 left-2 px-2 py-1 rounded-md
         bg-slate-800 text-white text-[10px] font-medium whitespace-nowrap
         opacity-0 pointer-events-none z-50;
}
.group:hover .tooltip {
  @apply opacity-100;
}
</style>
