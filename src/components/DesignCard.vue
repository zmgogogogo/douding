<!-- ============================================
  DesignCard.vue — 设计卡片（发现页/仓库页/个人页共用）
============================================ -->
<template>
  <div class="design-card" @click="$router.push(`/detail/${design.id}`)">
    <!-- 缩略图 -->
    <div
      class="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden relative"
    >
      <canvas
        v-if="!design.thumbnail && gridData.length"
        ref="thumbCanvas"
        class="w-full h-full pixel-thumb"
      />
      <img
        v-else-if="design.thumbnail"
        :src="design.thumbnail"
        :alt="design.title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="text-slate-300 text-4xl">🧩</div>
    </div>
    <!-- 信息区 -->
    <div class="p-2.5 pb-3">
      <div class="text-sm font-semibold text-slate-900 truncate mb-1">{{ design.title }}</div>
      <div v-if="authorName" class="text-[11px] text-slate-400 truncate mb-0.5">
        {{ authorName }}
      </div>
      <div class="text-[11px] text-slate-400 flex gap-2.5 items-center">
        <span>{{ design.gridWidth }}×{{ design.gridHeight }}</span>
        <span>{{ design.beadCount || 0 }}颗</span>
        <span>❤ {{ design.likesCount || 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  design: { type: Object, required: true },
  authorName: { type: String, default: '' },
})

const thumbCanvas = ref(null)
const gridData = Array.isArray(props.design.gridData) ? props.design.gridData : []

onMounted(() => {
  nextTick(renderThumbnail)
})

watch(
  () => props.design,
  () => {
    nextTick(renderThumbnail)
  }
)

function renderThumbnail() {
  const canvas = thumbCanvas.value
  if (!canvas || !gridData.length) return
  if (canvas.dataset.rendered) return
  canvas.dataset.rendered = '1'

  try {
    const size = Math.min(80, gridData.length || 30)
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(size, size)
    for (let r = 0; r < size && r < gridData.length; r++) {
      const row = gridData[r] || []
      for (let c = 0; c < size && c < row.length; c++) {
        const cell = row[c]
        const idx = (r * size + c) * 4
        if (cell && cell.hex) {
          const h = cell.hex.replace('#', '')
          img.data[idx] = parseInt(h.substring(0, 2), 16)
          img.data[idx + 1] = parseInt(h.substring(2, 4), 16)
          img.data[idx + 2] = parseInt(h.substring(4, 6), 16)
          img.data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(img, 0, 0)
  } catch {
    /* 忽略渲染错误 */
  }
}
</script>
