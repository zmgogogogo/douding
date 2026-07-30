<!-- 首页作品缩略图 canvas 渲染器 -->
<template>
  <canvas ref="c" class="thumb-canvas" />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  gridData: { type: Array, default: () => [] },
  gridWidth: { type: Number, default: 58 },
  gridHeight: { type: Number, default: 58 },
})

const c = ref(null)

function render() {
  const canvas = c.value
  if (!canvas || !props.gridData?.length) return
  const rows = props.gridData
  const cols = rows[0]?.length || 0
  const size = Math.min(160, Math.max(rows.length, cols))
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const scaleR = rows.length / size
  const scaleC = cols / size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.floor(y * scaleR)
      const c = Math.floor(x * scaleC)
      const cell = rows[r]?.[c]
      const idx = (y * size + x) * 4
      if (cell?.hex) {
        const h = cell.hex.replace('#', '')
        img.data[idx] = parseInt(h.substring(0, 2), 16)
        img.data[idx + 1] = parseInt(h.substring(2, 4), 16)
        img.data[idx + 2] = parseInt(h.substring(4, 6), 16)
        img.data[idx + 3] = 255
      } else {
        img.data[idx + 3] = 0
      }
    }
  }
  ctx.putImageData(img, 0, 0)
}

onMounted(() => render())
watch(() => props.gridData, () => render(), { deep: true })
</script>

<style scoped>
.thumb-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
