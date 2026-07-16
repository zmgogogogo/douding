<!-- ============================================
  EditorLayerPanel.vue — 图层面板
  ============================================ -->
<template>
  <div class="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md rounded-xl
              shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[var(--ui-border)] z-10 select-none"
              style="width:160px;max-height:240px">
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ui-border)]">
      <span class="text-[10px] font-semibold text-slate-500">📑 图层</span>
      <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200 transition-colors"
        @click="$emit('addLayer')" title="新建图层">+</button>
    </div>
    <div class="overflow-y-auto max-h-[200px]">
      <div v-for="(layer, i) in layers" :key="layer.id"
        class="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-50 cursor-pointer
               hover:bg-slate-50 transition-colors text-[10px]"
        :class="layer.id === currentLayerId ? 'bg-blue-50/80' : ''"
        @click="$emit('selectLayer', layer.id)">
        <!-- 可见性切换 -->
        <button class="w-4 h-4 flex items-center justify-center rounded flex-shrink-0"
          :class="layer.visible ? 'text-slate-500' : 'text-slate-300'"
          @click.stop="$emit('toggleVisibility', layer.id)">
          <EyeIcon v-if="layer.visible" :size="10" /><EyeOffIcon v-else :size="10" /></button>
        <!-- 名称 -->
        <span class="flex-1 truncate font-medium"
          :class="layer.id === currentLayerId ? 'text-primary' : 'text-slate-600'">
          {{ layer.name }}</span>
        <!-- 操作 -->
        <button v-if="layers.length > 1 && i > 0"
          class="w-4 h-4 flex items-center justify-center rounded text-slate-300 hover:text-primary"
          @click.stop="$emit('mergeDown', layer.id)" title="向下合并">↓</button>
        <button v-if="layers.length > 1"
          class="w-4 h-4 flex items-center justify-center rounded text-slate-300 hover:text-red-500"
          @click.stop="$emit('removeLayer', layer.id)" title="删除">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { EyeIcon, EyeOffIcon } from 'lucide-vue-next'

defineProps({
  layers: { type: Array, default: () => [] },
  currentLayerId: { type: String, default: null },
})

defineEmits(['addLayer', 'removeLayer', 'selectLayer', 'toggleVisibility', 'mergeDown'])
</script>
