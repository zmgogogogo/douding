<!--
  EditorMaterialPanel.vue — 用料成本估算面板（V3.0 11.3）
  重量/成本计算、采购清单、耗材估算
-->
<template>
  <div class="flex-1 flex flex-col overflow-hidden text-[11px]">
    <!-- 规格设置 -->
    <div class="px-3 py-2 border-b border-[var(--ui-border)] space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[var(--ui-text-tertiary)]">豆子规格</span>
        <select v-model.number="beadSize" class="border rounded px-1 py-0.5 text-[10px]">
          <option :value="5">5mm (标准)</option>
          <option :value="2.6">2.6mm (迷你)</option>
        </select>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[var(--ui-text-tertiary)]">每颗克重</span>
        <span class="font-mono">{{ gramPerBead.toFixed(3) }}g</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[var(--ui-text-tertiary)]">每克单价</span>
        <input v-model.number="pricePerGram" type="number" step="0.01" min="0"
          class="w-16 border rounded px-1 py-0.5 text-[10px] text-right" />
        <span class="text-[var(--ui-text-tertiary)]">元/g</span>
      </div>
    </div>

    <!-- 汇总 -->
    <div class="px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg-tertiary)]/50">
      <div class="grid grid-cols-2 gap-1 text-[10px]">
        <div class="flex justify-between"><span class="text-[var(--ui-text-tertiary)]">总豆子数</span>
          <span class="font-semibold">{{ totalBeads }} 颗</span></div>
        <div class="flex justify-between"><span class="text-[var(--ui-text-tertiary)]">总重量</span>
          <span class="font-semibold">{{ totalWeight.toFixed(1) }}g</span></div>
        <div class="flex justify-between"><span class="text-[var(--ui-text-tertiary)]">预估时长</span>
          <span class="font-semibold">{{ estimatedTime }}</span></div>
        <div class="flex justify-between"><span class="text-[var(--ui-text-tertiary)]">预估成本</span>
          <span class="font-semibold text-[var(--ui-accent)]">¥{{ totalCost.toFixed(2) }}</span></div>
      </div>
    </div>

    <!-- 颜色明细 -->
    <div class="flex-1 overflow-y-auto">
      <div v-for="(s, i) in colorList" :key="s.hex"
        class="flex items-center gap-1.5 px-2 py-1 border-b border-[var(--ui-border)]/50 hover:bg-[var(--ui-bg-tertiary)]">
        <span class="text-[9px] text-[var(--ui-text-tertiary)] w-4 text-right">{{ i + 1 }}</span>
        <div class="w-3 h-3 rounded-sm ring-1 ring-black/10 flex-shrink-0" :style="{ background: s.hex }" />
        <span class="flex-1 truncate">{{ s.name }}</span>
        <span class="font-mono text-[var(--ui-text-tertiary)]">{{ s.count }}</span>
        <span class="font-mono text-[var(--ui-text-secondary)] w-10 text-right">{{ (s.count * gramPerBead).toFixed(1) }}g</span>
      </div>
    </div>

    <!-- 导出按钮 -->
    <div class="flex gap-1 px-2 py-1.5 border-t border-[var(--ui-border)]">
      <button class="flex-1 h-6 rounded text-[10px] bg-[var(--ui-bg-tertiary)] hover:bg-[var(--ui-accent)]/10 hover:text-[var(--ui-accent)] transition-colors"
        @click="$emit('exportCSV')">📋 导出 CSV</button>
      <button class="flex-1 h-6 rounded text-[10px] bg-[var(--ui-accent)]/10 text-[var(--ui-accent)] hover:bg-[var(--ui-accent)]/20 transition-colors"
        @click="$emit('exportPDF')">📄 采购清单 PDF</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  stats: { type: Array, default: () => [] },
  beadCount: { type: Number, default: 0 },
})

defineEmits(['exportCSV', 'exportPDF'])

const beadSize = ref(5)
const pricePerGram = ref(0.05)

const gramPerBead = computed(() => beadSize.value === 5 ? 0.13 : 0.03)
const totalBeads = computed(() => props.beadCount)
const totalWeight = computed(() => totalBeads.value * gramPerBead.value)
const totalCost = computed(() => totalWeight.value * pricePerGram.value)

const estimatedTime = computed(() => {
  const min = Math.ceil(totalBeads.value / 60) // 每秒1颗 ≈ 60颗/分钟
  if (min < 60) return `${min}分钟`
  return `${Math.floor(min / 60)}h${min % 60}m`
})

const colorList = computed(() => props.stats)
</script>
