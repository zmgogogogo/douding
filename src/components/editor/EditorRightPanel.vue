<!-- ============================================
  EditorRightPanel.vue — 右侧调色板面板
  ohmybead.cn 风格：品牌选择 → 系列标签 → 7列颜色网格 → 画笔 → 统计
  ============================================ -->
<template>
  <div class="w-[200px] bg-[var(--ui-bg-surface)] border-l border-[var(--ui-border)] flex flex-col flex-shrink-0 overflow-hidden max-md:hidden select-none">
    <!-- 品牌选择 -->
    <div class="p-2 border-b border-[var(--ui-border)] space-y-1.5">
      <select :value="brand" @change="$emit('update:brand', $event.target.value)"
        class="w-full h-7 border border-[var(--ui-border)] rounded-md text-[11px] px-1.5 bg-[var(--ui-bg-base)]
               text-[var(--ui-text-primary)] outline-none focus:border-[var(--ui-accent)] transition-colors cursor-pointer">
        <option v-for="b in brands" :key="b" :value="b">
          {{ b === '全部' ? `全部 · ${totalColorCount}色` : `${b} · ${(brandColorCounts[b] || 0)}色` }}
        </option>
      </select>
      <div class="text-[9px] text-[var(--ui-text-tertiary)] text-center">共 {{ totalColorCount }} 种颜色</div>
    </div>

    <!-- 系列标签（水平滚动） -->
    <div class="flex gap-0.5 px-1.5 py-1.5 border-b border-[var(--ui-border)] overflow-x-auto scrollbar-hide">
      <button v-for="s in seriesList" :key="s"
        class="px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0"
        :class="seriesActive === s ? 'bg-primary/10 text-primary' : 'text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-tertiary)]'"
        @click="$emit('update:seriesActive', s)">
        {{ s.length > 12 ? s.slice(0, 12) + '…' : s }}
      </button>
      <span v-if="seriesList.length === 0" class="text-[10px] text-[var(--ui-text-tertiary)] px-1">全部系列</span>
    </div>

    <!-- 当前筛选色卡数 -->
    <div class="px-2 py-0.5 text-[9px] text-[var(--ui-text-tertiary)] border-b border-[var(--ui-border)] text-center">
      {{ seriesActive || '全部' }} · {{ seriesColorCount }}色
    </div>

    <!-- 当前颜色指示 -->
    <div v-if="curColor" class="flex items-center gap-2 px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg-base)]">
      <div class="w-5 h-5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
        :style="{ background: curColor.hex }" />
      <div class="text-[11px] font-semibold text-[var(--ui-text-primary)] truncate">{{ curColor.name }}</div>
      <div class="text-[10px] text-[var(--ui-text-tertiary)] font-mono ml-auto">{{ curColor.hex }}</div>
    </div>

    <!-- 颜色网格（7列，ohmybead 风格） -->
    <div class="flex-1 overflow-y-auto p-1.5">
      <div class="grid grid-cols-7 gap-1">
        <button v-for="c in colors" :key="c.hex"
          class="aspect-square rounded-lg transition-all duration-100 relative
                 hover:scale-125 hover:z-10 hover:shadow-md flex items-end justify-center"
          :class="curColor?.hex === c.hex ? 'ring-2 ring-primary ring-offset-1' : 'ring-1 ring-black/5'"
          :style="{ background: c.hex }"
          :title="c.name + ' ' + c.hex + (inventory[c.id] != null ? ' 库存:' + inventory[c.id] : '')"
          @click="$emit('selectColor', c)">
          <!-- 色卡编号标签 -->
          <span class="text-[7px] font-semibold text-white/90 bg-black/25 rounded-sm px-0.5 leading-tight mb-0.5 select-none"
            style="text-shadow: 0 1px 2px rgba(0,0,0,0.4);letter-spacing:-0.3px;">
            {{ c.name.length > 4 ? c.name.slice(0,4) : c.name }}
          </span>
          <!-- 库存标记 -->
          <span v-if="inventory[c.id] != null && inventory[c.id] <= 0"
            class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400 ring-1 ring-white shadow-sm" />
          <span v-else-if="inventory[c.id] != null && inventory[c.id] < 50"
            class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white shadow-sm" />
        </button>
      </div>
      <div v-if="colors.length === 0" class="text-[10px] text-[var(--ui-text-tertiary)] text-center py-8">
        加载中...
      </div>
    </div>

    <!-- 画笔大小 -->
    <div class="px-3 py-2 border-t border-[var(--ui-border)] bg-[var(--ui-bg-base)]">
      <div class="flex items-center justify-between text-[10px] text-[var(--ui-text-tertiary)] mb-1">
        <span>画笔</span><span>{{ brushSize }}px</span>
      </div>
      <input :value="brushSize" type="range" min="1" max="8"
        class="w-full h-1 accent-primary cursor-pointer"
        @input="$emit('update:brushSize', parseInt($event.target.value))" />
    </div>

    <!-- 颜色统计面板（可折叠） -->
    <div class="border-t border-[var(--ui-border)] bg-[var(--ui-bg-base)]">
      <button class="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-[var(--ui-text-secondary)]
                     hover:bg-[var(--ui-bg-tertiary)] transition-colors"
        @click="expanded = !expanded">
        <span>📊 颜色统计 {{ stats.length > 0 ? '(' + stats.length + '色)' : '' }}</span>
        <ChevronRightIcon :size="12" :class="expanded && 'rotate-90'" class="transition-transform" />
      </button>
      <div v-if="expanded && stats.length" class="max-h-[180px] overflow-y-auto px-2 pb-2">
        <div v-for="s in stats" :key="s.hex"
          class="flex items-center gap-1.5 py-0.5 text-[10px] hover:bg-white/60 rounded px-1 cursor-pointer transition-colors"
          @click="$emit('highlightColor', s.hex)">
          <div class="w-3 h-3 rounded-sm ring-1 ring-black/10 flex-shrink-0" :style="{ background: s.hex }" />
          <span class="text-[var(--ui-text-primary)] truncate flex-1">{{ s.name }}</span>
          <span class="text-[var(--ui-text-tertiary)] font-mono">{{ s.count }}</span>
        </div>
      </div>
    </div>

    <!-- AI 配色助手 -->
    <EditorPaletteAdvisor
      :gridColorStats="stats"
      :filteredColors="colors"
      :gridW="58" :gridH="58"
      @selectColor="c => $emit('selectColor', c)"
      @applyFill="grid => $emit('applyFill', grid)" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronRightIcon } from 'lucide-vue-next'
import EditorPaletteAdvisor from './EditorPaletteAdvisor.vue'

defineProps({
  brand: { type: String, default: '全部' },
  seriesActive: { type: String, default: '' },
  brands: { type: Array, default: () => [] },
  seriesList: { type: Array, default: () => [] },
  colors: { type: Array, default: () => [] },
  curColor: { type: Object, default: null },
  brushSize: { type: Number, default: 1 },
  stats: { type: Array, default: () => [] },
  inventory: { type: Object, default: () => ({}) },
  totalColorCount: { type: Number, default: 0 },
  seriesColorCount: { type: Number, default: 0 },
  brandColorCounts: { type: Object, default: () => ({}) },
})

defineEmits([
  'update:brand', 'update:seriesActive', 'update:brushSize',
  'selectColor', 'highlightColor'
])

const expanded = ref(false)
</script>
