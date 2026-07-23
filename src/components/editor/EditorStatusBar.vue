<!-- ============================================
  EditorStatusBar.vue — 底部状态栏
  V3.0 文档第7节：28px高度，左中右三区信息展示
  ============================================ -->
<template>
  <footer
    class="h-7 bg-[var(--ui-bg-surface)] border-t border-[var(--ui-border)] flex items-center px-3 gap-4 select-none flex-shrink-0 text-[10px] z-10"
  >
    <!-- 左侧：模式 + 尺寸 + 豆子数 + 颜色数 -->
    <div class="flex items-center gap-3">
      <span class="font-medium text-[var(--ui-text-primary)]">{{ modeLabel }}</span>
      <span class="w-px h-3 bg-[var(--ui-border)]" />
      <span class="text-[var(--ui-text-tertiary)]">
        <span class="text-[var(--ui-text-secondary)] font-medium">{{ gridW }}×{{ gridH }}</span>
        豆子
      </span>
      <span class="text-[var(--ui-text-tertiary)]">
        <span class="text-[var(--ui-text-secondary)] font-medium">{{ beadCount }}</span> 颗
      </span>
      <span class="text-[var(--ui-text-tertiary)]">
        <span class="text-[var(--ui-text-secondary)] font-medium">{{ colorCount }}</span> 色
      </span>
    </div>

    <!-- 中间：鼠标坐标 + 当前位置颜色 -->
    <div class="flex-1 flex items-center justify-center gap-2">
      <span class="text-[var(--ui-text-tertiary)] font-mono">
        X:
        <span class="text-[var(--ui-text-secondary)]">{{ mouseCol >= 0 ? mouseCol : '–' }}</span>
        &nbsp; Y:
        <span class="text-[var(--ui-text-secondary)]">{{ mouseRow >= 0 ? mouseRow : '–' }}</span>
      </span>
      <template v-if="mouseColor">
        <span class="w-px h-3 bg-[var(--ui-border)]" />
        <span
          class="w-3 h-3 rounded-sm ring-1 ring-black/10 flex-shrink-0"
          :style="{ background: mouseColor.hex }"
        />
        <span class="text-[var(--ui-text-tertiary)] font-mono">{{ mouseColor.hex }}</span>
      </template>
    </div>

    <!-- 右侧：缩放控制 -->
    <div class="flex items-center gap-1.5">
      <button
        class="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-secondary)] transition-colors"
        @click="$emit('zoomOut')"
        title="缩小"
      >
        −
      </button>
      <input
        type="range"
        :min="0.5"
        :max="30"
        :step="0.5"
        :value="zoom"
        class="w-16 h-1 accent-blue-500 cursor-pointer"
        @input="$emit('update:zoom', parseFloat($event.target.value))"
      />
      <button
        class="w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--ui-bg-tertiary)] text-[var(--ui-text-secondary)] transition-colors"
        @click="$emit('zoomIn')"
        title="放大"
      >
        +
      </button>
      <span
        class="text-[var(--ui-text-secondary)] font-mono font-medium w-9 text-right tabular-nums"
      >
        {{ Math.round(zoom * 10) }}%
      </span>
    </div>
  </footer>
</template>

<script setup>
defineProps({
  gridW: { type: Number, default: 58 },
  gridH: { type: Number, default: 58 },
  beadCount: { type: Number, default: 0 },
  colorCount: { type: Number, default: 0 },
  zoom: { type: Number, default: 10 },
  mouseCol: { type: Number, default: -1 },
  mouseRow: { type: Number, default: -1 },
  mouseColor: { type: Object, default: null },
  modeLabel: { type: String, default: '编辑模式' },
})

defineEmits(['update:zoom', 'zoomIn', 'zoomOut'])
</script>
