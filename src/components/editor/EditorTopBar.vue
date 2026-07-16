<!-- ============================================
  EditorTopBar.vue — 顶部导航栏
  ohmybead.cn 风格：毛玻璃背景 + 项目名 + 操作按钮
  ============================================ -->
<template>
  <header class="h-11 bg-white/95 backdrop-blur-md border-b border-[var(--ui-border)] flex items-center px-2 gap-1 flex-shrink-0 z-10 select-none">
    <!-- 左侧：返回 + 标题 -->
    <button class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--ui-bg-tertiary)] transition-colors flex-shrink-0"
      @click="$emit('back')" title="返回">
      <ArrowLeftIcon :size="18" class="text-[var(--ui-text-secondary)]" />
    </button>

    <div class="flex items-center gap-1.5 flex-1 min-w-0 ml-0.5">
      <input
        ref="titleInput"
        :value="title"
        class="text-[13px] font-semibold text-[var(--ui-text-primary)] bg-transparent border-none outline-none
               truncate min-w-0 max-w-[200px] rounded-md px-1.5 py-0.5
               focus:bg-[var(--ui-bg-tertiary)] transition-colors"
        placeholder="未命名图纸"
        @blur="$emit('update:title', $event.target.value)"
        @keydown.enter="$event.target.blur()"
      />
      <!-- 未保存指示器 -->
      <span v-if="hasUnsaved" class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="有未保存的更改" />
      <!-- 已保存提示 -->
      <span v-if="showSaved" class="text-[10px] text-emerald-500 font-medium animate-fade-in flex-shrink-0">已保存</span>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-0.5">
      <!-- 撤销 -->
      <button class="topbar-action-btn" :class="{ 'opacity-30': !canUndo }"
        :disabled="!canUndo" @click="$emit('undo')" title="撤销 (Ctrl+Z)">
        <UndoIcon :size="16" />
      </button>
      <!-- 重做 -->
      <button class="topbar-action-btn" :class="{ 'opacity-30': !canRedo }"
        :disabled="!canRedo" @click="$emit('redo')" title="重做 (Ctrl+Y)">
        <RedoIcon :size="16" />
      </button>

      <div class="w-px h-5 bg-[var(--ui-border)] mx-1" />

      <!-- 网格切换 -->
      <button class="topbar-action-btn" :class="{ 'text-primary': showGrid }"
        @click="$emit('toggleGrid')" title="网格 (H)">
        <GridIcon :size="16" />
      </button>

      <!-- 参考图切换 -->
      <button class="topbar-action-btn" :class="{ 'text-primary': refOpacity > 0 }"
        @click="$emit('toggleRef')" title="参考图 (R)">
        <EyeIcon v-if="refOpacity > 0" :size="16" />
        <EyeOffIcon v-else :size="16" />
      </button>

      <!-- 导出下拉 -->
      <div class="relative">
        <button class="topbar-action-btn" @click="showExport = !showExport" title="导出">
          <DownloadIcon :size="16" />
        </button>
        <div v-if="showExport" class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[var(--ui-border)]
                      py-1 w-36 z-[150] animate-bounce-in"
          @mouseleave="showExport = false">
          <button class="export-menu-item" @click="$emit('exportPNG'); showExport = false">
            <ImageIcon :size="14" /><span>导出 PNG 图片</span>
          </button>
          <button class="export-menu-item" @click="$emit('exportPDF'); showExport = false">
            <FileTextIcon :size="14" /><span>导出 PDF 图纸</span>
          </button>
          <button class="export-menu-item" @click="$emit('exportJSON'); showExport = false">
            <CodeIcon :size="14" /><span>导出 JSON 数据</span>
          </button>
        </div>
      </div>

      <!-- 更多菜单 -->
      <div class="relative">
        <button class="topbar-action-btn" @click="showMore = !showMore" title="更多">
          <MoreHorizontalIcon :size="16" />
        </button>
        <div v-if="showMore" class="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[var(--ui-border)]
                      py-1 w-40 z-[150] animate-bounce-in"
          @mouseleave="showMore = false">
          <button class="export-menu-item" @click="$emit('save'); showMore = false">
            <SaveIcon :size="14" /><span>保存到云端</span>
          </button>
          <button class="export-menu-item" @click="$emit('showInfo'); showMore = false">
            <InfoIcon :size="14" /><span>图纸信息</span>
          </button>
          <button class="export-menu-item" @click="$emit('openSizeDialog'); showMore = false">
            <MaximizeIcon :size="14" /><span>修改尺寸</span>
          </button>
          <button class="export-menu-item" @click="$emit('clear'); showMore = false">
            <Trash2Icon :size="14" /><span class="text-red-500">清空画布</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  ArrowLeftIcon, UndoIcon, RedoIcon,
  Grid3x3Icon as GridIcon, EyeIcon, EyeOffIcon,
  DownloadIcon, ImageIcon, FileTextIcon,
  MoreHorizontalIcon, SaveIcon, InfoIcon,
  MaximizeIcon, Trash2Icon, CodeIcon
} from 'lucide-vue-next'

const props = defineProps({
  title: { type: String, default: '未命名图纸' },
  hasUnsaved: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  refOpacity: { type: Number, default: 0 },
})

defineEmits([
  'back', 'update:title', 'undo', 'redo',
  'toggleGrid', 'toggleRef',
  'exportPNG', 'exportPDF', 'exportJSON',
  'save', 'showInfo', 'openSizeDialog', 'clear'
])

const showExport = ref(false)
const showMore = ref(false)
const showSaved = ref(false)
const titleInput = ref(null)

// 已保存提示（3秒后消失）
watch(() => props.hasUnsaved, (val) => {
  if (!val) {
    showSaved.value = true
    setTimeout(() => { showSaved.value = false }, 3000)
  }
})
</script>

<style scoped>
.topbar-action-btn {
  @apply w-8 h-8 flex items-center justify-center rounded-lg
         text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]
         hover:text-[var(--ui-text-primary)] transition-colors flex-shrink-0;
}
.export-menu-item {
  @apply w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[var(--ui-text-secondary)]
         hover:bg-[var(--ui-bg-tertiary)] hover:text-[var(--ui-text-primary)] transition-colors text-left;
}
</style>
