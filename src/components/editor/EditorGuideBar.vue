<!--
  EditorGuideBar.vue — 施工引导栏（V3.0 升级版）
  悬浮画布顶部，支持逐色导航 + 自动播放 + 速度调节
-->
<template>
  <div class="absolute top-3 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-3 py-1.5
              flex items-center gap-2 z-10 animate-scale-in select-none" style="box-shadow: var(--ui-shadow-lg)">
    <!-- 上一个 -->
    <button class="w-5 h-5 rounded-full bg-[var(--ui-bg-tertiary)] flex items-center justify-center
                   hover:bg-[var(--ui-border)] transition-colors disabled:opacity-30"
      @click="$emit('prev')" :disabled="!hasPrev">
      <ChevronLeftIcon :size="12" />
    </button>

    <!-- 颜色信息 -->
    <div class="flex items-center gap-1.5">
      <div class="w-4 h-4 rounded-sm ring-1 ring-black/10 flex-shrink-0"
        :style="{ background: currentColor?.hex || '#ccc' }" />
      <span class="text-[11px] font-semibold whitespace-nowrap">{{ currentColor?.name || '-' }}</span>
      <span class="text-[9px] text-[var(--ui-text-tertiary)]">{{ currentColor?.count || 0 }}颗</span>
    </div>

    <!-- 下一个 -->
    <button class="w-5 h-5 rounded-full bg-[var(--ui-bg-tertiary)] flex items-center justify-center
                   hover:bg-[var(--ui-border)] transition-colors"
      @click="$emit('next')">
      <ChevronRightIcon :size="12" />
    </button>

    <!-- 自动播放 -->
    <button class="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
      :class="autoPlay ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-tertiary)]'"
      @click="$emit('toggleAutoPlay')" title="自动播放">
      <PlayIcon v-if="!autoPlay" :size="10" />
      <PauseIcon v-else :size="10" />
    </button>

    <!-- 速度 -->
    <select v-if="autoPlay"
      :value="speed"
      class="w-11 h-5 border border-[var(--ui-border)] rounded text-[9px] px-0.5 bg-[var(--ui-bg-base)]"
      @change="$emit('setSpeed', parseInt($event.target.value))">
      <option v-for="s in [1,2,3,5,8,10]" :key="s" :value="s">{{ s }}s</option>
    </select>

    <!-- 进度 -->
    <div class="w-12 h-1.5 bg-[var(--ui-bg-tertiary)] rounded-full overflow-hidden">
      <div class="h-full bg-emerald-500 rounded-full transition-all" :style="{ width: progress + '%' }" />
    </div>
    <span class="text-[9px] text-[var(--ui-text-tertiary)] w-6 text-right">{{ progress }}%</span>

    <!-- 退出 -->
    <button class="text-[9px] text-[var(--ui-text-tertiary)] hover:text-red-500 transition-colors"
      @click="$emit('exit')">✕</button>
  </div>
</template>

<script setup>
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon } from 'lucide-vue-next'

defineProps({
  currentColor: { type: Object, default: null },
  progress: { type: Number, default: 0 },
  hasPrev: { type: Boolean, default: false },
  autoPlay: { type: Boolean, default: false },
  speed: { type: Number, default: 3 },
})

defineEmits(['prev', 'next', 'exit', 'toggleAutoPlay', 'setSpeed'])
</script>
