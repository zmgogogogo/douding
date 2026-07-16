<!-- ============================================
  EditorGuideBar.vue — 施工引导栏
  ohmybead.cn 风格：悬浮在画布顶部中央，逐色导航
  ============================================ -->
<template>
  <div class="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-2xl
              shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[var(--ui-border)] px-4 py-2
              flex items-center gap-3 z-10 animate-bounce-in select-none">
    <!-- 上一个颜色 -->
    <button class="w-6 h-6 rounded-full bg-[var(--ui-bg-tertiary)] flex items-center justify-center
                   hover:bg-[var(--ui-border)] transition-colors"
      @click="$emit('prev')" :disabled="!hasPrev">
      <ChevronLeftIcon :size="14" class="text-[var(--ui-text-secondary)]" />
    </button>

    <!-- 当前颜色信息 -->
    <div class="flex items-center gap-2">
      <div class="w-5 h-5 rounded ring-1 ring-black/10 flex-shrink-0"
        :style="{ background: currentColor?.hex || '#ccc' }" />
      <span class="text-xs font-semibold text-[var(--ui-text-primary)] whitespace-nowrap">
        {{ currentColor?.name || '-' }}
      </span>
      <span class="text-[10px] text-[var(--ui-text-tertiary)] whitespace-nowrap">
        {{ currentColor?.count || 0 }}颗
      </span>
    </div>

    <!-- 下一个颜色 -->
    <button class="w-6 h-6 rounded-full bg-[var(--ui-bg-tertiary)] flex items-center justify-center
                   hover:bg-[var(--ui-border)] transition-colors"
      @click="$emit('next')">
      <ChevronRightIcon :size="14" class="text-[var(--ui-text-secondary)]" />
    </button>

    <!-- 进度条 -->
    <div class="w-16 h-1.5 bg-[var(--ui-bg-tertiary)] rounded-full overflow-hidden">
      <div class="h-full bg-emerald-500 rounded-full transition-all duration-300"
        :style="{ width: progress + '%' }" />
    </div>
    <span class="text-[10px] text-[var(--ui-text-tertiary)] w-8">{{ progress }}%</span>

    <!-- 退出 -->
    <button class="text-[10px] text-[var(--ui-text-tertiary)] hover:text-red-500 transition-colors"
      @click="$emit('exit')">退出</button>
  </div>
</template>

<script setup>
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'

defineProps({
  currentColor: { type: Object, default: null },
  progress: { type: Number, default: 0 },
  hasPrev: { type: Boolean, default: false },
})

defineEmits(['prev', 'next', 'exit'])
</script>
