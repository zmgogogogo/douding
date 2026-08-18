<!-- ============================================
  EditorTopBar.vue — 顶部导航栏
  触摸适配：平板端按钮 44px，桌面端 40px
  ============================================ -->
<template>
  <header
    class="h-14 lg:h-14 bg-[var(--ui-bg-base)]/95 backdrop-blur-lg border-b border-[var(--ui-border-glass)] flex items-center px-2 lg:px-3 gap-0.5 lg:gap-1 flex-shrink-0 z-10 select-none sticky top-0"
  >
    <!-- 左侧：返回 + 标题 -->
    <button
      class="w-11 h-11 lg:w-10 lg:h-10 flex items-center justify-center rounded-full hover:bg-[var(--ui-bg-tertiary)] transition-colors flex-shrink-0"
      @click="$emit('back')"
      title="返回"
    >
      <ArrowLeftIcon :size="iconSize" class="text-[var(--ui-text-secondary)]" />
    </button>

    <div class="flex items-center gap-1.5 flex-1 min-w-0 ml-0.5">
      <input
        ref="titleInput"
        :value="title"
        class="text-[14px] lg:text-[13px] font-semibold text-[var(--ui-text-primary)] bg-transparent border-none outline-none truncate min-w-0 max-w-[160px] lg:max-w-[200px] rounded-md px-1.5 py-0.5 focus:bg-[var(--ui-bg-tertiary)] transition-colors"
        placeholder="未命名图纸"
        @blur="$emit('update:title', $event.target.value)"
        @keydown.enter="$event.target.blur()"
      />
      <!-- 未保存指示器 -->
      <span
        v-if="hasUnsaved"
        class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse"
        title="有未保存的更改"
      />
      <!-- 已保存提示 -->
      <span
        v-if="showSaved"
        class="text-[10px] text-emerald-500 font-medium animate-fade-in flex-shrink-0"
        >已保存</span
      >
      <!-- 库存预警 --><span
        v-if="stockWarnings?.length"
        class="text-[10px] font-medium flex-shrink-0 px-1.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
        :class="isCompact ? 'text-amber-600 bg-amber-50' : 'text-amber-600 bg-amber-50'"
        :title="stockWarnings.map(w => w.name + ': 缺' + w.lack + '颗').join('\n')"
        @click="$emit('scrollToWarn')"
      >
        <AlertTriangleIcon :size="11" />
        <span class="whitespace-nowrap">{{ stockWarnings.length }}色缺料</span>
      </span>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-0.5">
      <!-- 撤销 -->
      <button
        class="topbar-action-btn"
        :class="{ 'opacity-30': !canUndo }"
        :disabled="!canUndo"
        @click="$emit('undo')"
        title="撤销 (Ctrl+Z)"
      >
        <UndoIcon :size="iconSize" />
      </button>
      <!-- 重做 -->
      <button
        class="topbar-action-btn"
        :class="{ 'opacity-30': !canRedo }"
        :disabled="!canRedo"
        @click="$emit('redo')"
        title="重做 (Ctrl+Y)"
      >
        <RedoIcon :size="iconSize" />
      </button>
      <!-- 保存 -->
      <button class="topbar-action-btn" @click="$emit('save')" title="保存 (Ctrl+S)">
        <SaveIcon :size="iconSize" />
      </button>

      <!-- 发布按钮（已保存但未发布时显示） -->
      <button
        v-if="designSaved && !isPublic"
        class="topbar-action-btn text-[var(--ui-color-primary)]"
        @click="$emit('publish')"
        title="发布到首页"
      >
        <SendIcon :size="iconSize" />
      </button>

      <!-- 已发布标签（已发布时显示，点击可取消发布） -->
      <button
        v-if="designSaved && isPublic"
        class="topbar-action-btn text-emerald-500"
        @click="$emit('unpublish')"
        title="已发布 — 点击取消发布"
      >
        <SendIcon :size="iconSize" />
      </button>

      <div class="w-px h-5 bg-[var(--ui-border)] mx-0.5 lg:mx-1" />

      <!-- 网格切换 -->
      <button
        class="topbar-action-btn"
        :class="{ 'text-primary': showGrid }"
        @click="$emit('toggleGrid')"
        title="网格 (H)"
      >
        <GridIcon :size="iconSize" />
      </button>

      <!-- 参考图切换 -->
      <button
        class="topbar-action-btn"
        :class="{ 'text-primary': refOpacity > 0 }"
        @click="$emit('toggleRef')"
        title="参考图 (R)"
      >
        <EyeIcon v-if="refOpacity > 0" :size="iconSize" />
        <EyeOffIcon v-else :size="iconSize" />
      </button>

      <!-- 镜像切换 -->
      <button
        class="topbar-action-btn"
        :class="{ 'text-primary': symmetryMode !== 'none' }"
        @click="$emit('toggleSymmetry')"
        title="绘图镜像 (K)"
      >
        <ShuffleIcon :size="iconSize" />
      </button>

      <!-- 全画布水平翻转（烫豆文字防反） -->
      <button
        class="topbar-action-btn"
        @click="$emit('flipCanvas')"
        title="水平翻转画布 → 烫豆后文字不会反"
      >
        <FlipHorizontalIcon :size="iconSize" />
      </button>

      <!-- 施工引导 -->
      <button
        class="topbar-action-btn"
        :class="{ 'text-primary': guideMode }"
        @click="$emit('toggleGuide')"
        title="施工引导"
      >
        <Wand2Icon :size="iconSize" />
      </button>

      <!-- 制作模式入口 -->
      <button
        v-if="designId"
        class="topbar-action-btn !px-3 !gap-1 !text-emerald-600 !border-emerald-200 !bg-emerald-50"
        title="制作模式"
        @click="$router.push('/make/' + designId)"
      >
        <PlayIcon :size="iconSize - 2" />
        <span class="text-[11px] font-semibold">制作</span>
      </button>

      <!-- 导出 -->
      <button class="topbar-action-btn" @click="$emit('openExport')" title="导出图纸">
        <DownloadIcon :size="iconSize" />
      </button>

      <!-- 更多菜单 -->
      <div class="relative">
        <button class="topbar-action-btn" @click="showMore = !showMore" title="更多">
          <MoreHorizontalIcon :size="iconSize" />
        </button>
        <div
          v-if="showMore"
          class="absolute right-0 top-full mt-1 bg-white rounded-2xl border border-[var(--ui-border-glass)] py-1 w-44 z-[150] animate-scale-in"
          style="box-shadow: var(--ui-shadow-lg)"
          @mouseleave="showMore = false"
        >
          <button
            class="export-menu-item"
            @click="$emit('save'); showMore = false"
          >
            <SaveIcon :size="15" /><span>保存到云端</span>
          </button>
          <button
            class="export-menu-item"
            @click="$emit('showInfo'); showMore = false"
          >
            <InfoIcon :size="15" /><span>图纸信息</span>
          </button>
          <button
            class="export-menu-item"
            @click="$emit('openSizeDialog'); showMore = false"
          >
            <MaximizeIcon :size="15" /><span>修改尺寸</span>
          </button>
          <button
            class="export-menu-item"
            @click="$emit('clear'); showMore = false"
          >
            <Trash2Icon :size="15" /><span class="text-red-500">清空画布</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  UndoIcon,
  RedoIcon,
  Grid3x3Icon as GridIcon,
  EyeIcon,
  EyeOffIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  SaveIcon,
  InfoIcon,
  MaximizeIcon,
  Trash2Icon,
  ShuffleIcon,
  Wand2Icon,
  PlayIcon,
  AlertTriangleIcon,
  FlipHorizontalIcon,
  SendIcon,
} from 'lucide-vue-next'
import { useResponsive } from '@/composables/useResponsive.js'

const router = useRouter()
const { isCompact } = useResponsive()

/** 图标大小：平板端 18px，桌面端 16px */
const iconSize = computed(() => isCompact.value ? 18 : 16)

const props = defineProps({
  title: { type: String, default: '未命名图纸' },
  hasUnsaved: { type: Boolean, default: false },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  showGrid: { type: Boolean, default: true },
  refOpacity: { type: Number, default: 0 },
  symmetryMode: { type: String, default: 'none' },
  guideMode: { type: Boolean, default: false },
  designSaved: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  designId: { type: [Number, String], default: null },
  stockWarnings: { type: Array, default: () => [] },
})

defineEmits([
  'back',
  'update:title',
  'undo',
  'redo',
  'toggleGrid',
  'toggleRef',
  'openExport',
  'save',
  'publish',
  'unpublish',
  'showInfo',
  'openSizeDialog',
  'clear',
  'toggleSymmetry',
  'toggleGuide',
  'flipCanvas',
])

const showMore = ref(false)
const showSaved = ref(false)
const titleInput = ref(null)

// 已保存提示（3秒后消失）
watch(
  () => props.hasUnsaved,
  (val) => {
    if (!val) {
      showSaved.value = true
      setTimeout(() => {
        showSaved.value = false
      }, 3000)
    }
  }
)
</script>

<style scoped>
/* 顶栏按钮 — 平板端 44px 触控区，桌面端 40px */
.topbar-action-btn {
  @apply w-11 h-11 lg:w-10 lg:h-10 flex items-center justify-center rounded-full
         text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]
         hover:text-[var(--ui-text-primary)] transition-all duration-150 flex-shrink-0;
}
.topbar-action-btn:active {
  transform: scale(0.93);
}
/* 下拉菜单项 — 平板端 44px 高度 */
.export-menu-item {
  @apply w-full flex items-center gap-2.5 px-3 py-2.5 lg:py-2 text-[13px] lg:text-[12px] text-[var(--ui-text-secondary)]
         hover:bg-[var(--ui-bg-tertiary)] hover:text-[var(--ui-text-primary)] transition-colors text-left;
}
</style>
