<!-- ============================================
  EditorToolbar.vue — 左侧工具栏
  ohmybead.cn 风格：垂直排列，工具+辅助+导入导出
  ============================================ -->
<template>
  <div class="flex flex-col items-center gap-0.5 w-11 bg-[var(--ui-bg-surface)] border-r border-[var(--ui-border)] py-2 overflow-y-auto flex-shrink-0 select-none">
    <!-- 绘制工具组 -->
    <button v-for="t in drawTools" :key="t.name"
      class="toolbar-btn" :class="{ active: currentTool === t.name }"
      @click="$emit('selectTool', t.name)"
      :title="`${t.label} (${t.key})`">
      <component :is="t.icon" :size="t.size || 18" />
    </button>

    <div class="w-8 border-t border-[var(--ui-border)] my-1" />

    <!-- 视图辅助组 -->
    <button class="toolbar-btn" :class="{ active: showGrid }"
      @click="$emit('toggleGrid')" title="网格 (H)">
      <GridIcon :size="18" />
    </button>
    <button class="toolbar-btn" :class="{ active: refOpacity > 0 }"
      @click="$emit('cycleRefOpacity')" title="参考图透明度 (R)">
      <EyeIcon v-if="refOpacity > 0" :size="18" />
      <EyeOffIcon v-else :size="18" />
    </button>
    <button class="toolbar-btn" :class="refLocked && 'text-amber-500'"
      @click="$emit('toggleRefLock')" title="锁定参考图 (Ctrl+L)">
      <LockIcon v-if="refLocked" :size="16" />
      <UnlockIcon v-else :size="16" />
    </button>
    <button class="toolbar-btn" :class="symmetryMode !== 'none' && 'text-primary'"
      @click="$emit('cycleSymmetry')" :title="`镜像 (K): ${symmetryLabels[symmetryMode]}`">
      <SymmetryIcon :size="18" />
    </button>

    <div class="w-8 border-t border-[var(--ui-border)] my-1" />

    <!-- 选区操作按钮（仅选中有选区时显示） -->
    <template v-if="currentTool === 'select' && hasSelection">
      <button class="toolbar-btn text-blue-500" @click="$emit('copySelection')" title="复制 (Ctrl+C)">
        <CopyIcon :size="15" /></button>
      <button class="toolbar-btn text-blue-500" @click="$emit('pasteSelection')" title="粘贴 (Ctrl+V)">
        <ClipboardPasteIcon :size="15" /></button>
      <button class="toolbar-btn text-red-500" @click="$emit('deleteSelection')" title="删除 (Del)">
        <Trash2Icon :size="15" /></button>
      <button class="toolbar-btn" @click="$emit('flipSelectionH')" title="水平翻转">
        <FlipHorizontalIcon :size="15" /></button>
      <button class="toolbar-btn" @click="$emit('flipSelectionV')" title="垂直翻转">
        <FlipVerticalIcon :size="15" /></button>
      <div class="w-8 border-t border-[var(--ui-border)] my-1" />
    </template>

    <!-- 导入导出组 -->
    <button class="toolbar-btn" @click="$emit('importImage')" title="导入图片">
      <ImageIcon :size="18" /></button>
    <button class="toolbar-btn" @click="$emit('exportPNG')" title="导出高清PNG">
      <DownloadIcon :size="18" /></button>
    <button class="toolbar-btn" @click="$emit('exportPDF')" title="导出PDF图纸">
      <FileTextIcon :size="16" /></button>

    <div class="flex-1" />

    <!-- 施工引导（底部） -->
    <button class="toolbar-btn" :class="guideMode && 'text-green-500'"
      @click="$emit('toggleGuide')" title="施工引导 (Ctrl+N)">
      <Wand2Icon :size="18" /></button>
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
import { shallowRef, h } from 'vue'

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
