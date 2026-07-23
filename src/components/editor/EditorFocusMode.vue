<!-- ============================================
  EditorFocusMode.vue — 专注模式覆盖层
  ohmybead.cn 风格：单击颜色后其他颜色变暗，仅高亮当前色
  ============================================ -->
<template>
  <div
    v-if="focusColor"
    class="fixed inset-0 z-[140] flex flex-col items-center pointer-events-none select-none"
  >
    <!-- 半透明遮罩（画布区域） -->
    <div class="absolute inset-0 bg-black/45 backdrop-blur-md" />

    <!-- 顶部颜色名称 -->
    <div class="relative z-10 mt-20 pointer-events-auto animate-scale-in">
      <div
        class="flex items-center gap-3 glass-panel rounded-2xl px-5 py-3"
        style="box-shadow: var(--ui-shadow-xl)"
      >
        <div
          class="w-8 h-8 rounded-full ring-2 ring-white shadow-md"
          :style="{ background: focusColor.hex }"
        />
        <div>
          <div class="text-sm font-bold text-[var(--ui-text-primary)]">{{ focusColor.name }}</div>
          <div class="text-[11px] text-[var(--ui-text-tertiary)] font-mono">
            {{ focusColor.hex }}
          </div>
        </div>
        <div class="text-[11px] font-medium text-[var(--ui-text-secondary)] ml-2">
          {{ beadCount }}颗
        </div>
      </div>
    </div>

    <!-- 提示文字 -->
    <div class="relative z-10 mt-4 text-[12px] text-white/70">点击空白处退出专注模式</div>

    <!-- 点击空白退出 -->
    <button class="absolute inset-0 pointer-events-auto" @click="$emit('exit')" />
  </div>
</template>

<script setup>
defineProps({
  focusColor: { type: Object, default: null },
  beadCount: { type: Number, default: 0 },
})

defineEmits(['exit'])
</script>
