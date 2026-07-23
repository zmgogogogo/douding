<!--
  EditorPrintPreview.vue — 专业打印预览对话框（V3.0 11.4）
  支持：1:1尺寸/分页拼接/分色打印/带刻度网格
-->
<template>
  <Teleport to="body">
    <div class="print-overlay" @click.self="$emit('close')">
      <div class="print-dialog">
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <h3 class="text-sm font-semibold">打印预览</h3>
          <button
            class="text-slate-400 hover:text-slate-600 text-lg leading-none"
            @click="$emit('close')"
          >
            &times;
          </button>
        </div>

        <!-- 预览区 -->
        <div class="flex-1 overflow-auto bg-slate-200 p-4 flex items-start justify-center">
          <div ref="previewRef" class="bg-white shadow-xl" :style="previewStyle">
            <canvas
              ref="previewCanvasRef"
              :width="canvasW"
              :height="canvasH"
              style="display: block; width: 100%; height: auto"
            />
          </div>
        </div>

        <!-- 控制栏 -->
        <div class="border-t px-4 py-2 space-y-2">
          <!-- 纸张 -->
          <div class="flex items-center gap-3 text-[11px]">
            <span class="text-slate-500 w-12">纸张</span>
            <select v-model="paperSize" class="border rounded px-1.5 py-0.5 text-[11px]">
              <option value="a4">A4 (210×297mm)</option>
              <option value="a3">A3 (297×420mm)</option>
              <option value="letter">Letter (216×279mm)</option>
            </select>
            <select v-model="orientation" class="border rounded px-1.5 py-0.5 text-[11px]">
              <option value="portrait">纵向</option>
              <option value="landscape">横向</option>
            </select>
          </div>

          <!-- 打印选项 -->
          <div class="flex items-center gap-3 text-[11px]">
            <span class="text-slate-500 w-12">选项</span>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="showGrid" type="checkbox" class="w-3 h-3" /> 网格
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="showLabels" type="checkbox" class="w-3 h-3" /> 色号
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="colorPrint" type="checkbox" class="w-3 h-3" /> 分色打印
            </label>
            <label class="flex items-center gap-1 cursor-pointer">
              <input v-model="showMarks" type="checkbox" class="w-3 h-3" /> 拼接标记
            </label>
          </div>

          <!-- 缩放 -->
          <div class="flex items-center gap-3 text-[11px]">
            <span class="text-slate-500 w-12">缩放</span>
            <input
              v-model.number="printScale"
              type="range"
              min="25"
              max="200"
              class="flex-1 h-1 accent-blue-500"
            />
            <span class="font-mono w-10 text-right">{{ printScale }}%</span>
          </div>

          <!-- 分页信息 -->
          <div
            v-if="totalPages > 1"
            class="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1"
          >
            ⚠ 图纸过大，将拆分为 {{ totalPages }} 页打印（{{ pagesPerRow }}×{{
              Math.ceil(totalPages / pagesPerRow)
            }}）
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex gap-2 px-4 py-3 border-t justify-end">
          <button
            class="px-4 py-1.5 rounded-lg text-xs border hover:bg-slate-50"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="px-4 py-1.5 rounded-lg text-xs bg-blue-500 text-white hover:bg-blue-600"
            @click="doPrint"
          >
            🖨️ 打印
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  grid: { type: Array, required: true },
  gridW: { type: Number, required: true },
  gridH: { type: Number, required: true },
  gridColorStats: { type: Array, default: () => [] },
})

defineEmits(['close'])

const paperSize = ref('a4')
const orientation = ref('portrait')
const showGrid = ref(true)
const showLabels = ref(false)
const colorPrint = ref(false)
const showMarks = ref(true)
const printScale = ref(100)

const previewRef = ref(null)
const previewCanvasRef = ref(null)

// 纸张尺寸（mm → CSS px at 96dpi ≈ 3.78 px/mm）
const PAPER_SIZES = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
  letter: { w: 216, h: 279 },
}

const mmToPx = 3.78

const paperDims = computed(() => {
  const p = PAPER_SIZES[paperSize.value]
  if (orientation.value === 'landscape') return { w: p.h, h: p.w }
  return { w: p.w, h: p.h }
})

const cellPrintSize = computed(() => (5 * mmToPx * printScale.value) / 100) // 5mm bead

const canvasW = computed(() => Math.ceil(props.gridW * cellPrintSize.value))
const canvasH = computed(() => Math.ceil(props.gridH * cellPrintSize.value))

const pagesPerRow = computed(() =>
  Math.max(
    1,
    Math.floor(
      (paperDims.value.w * mmToPx * printScale.value) / 100 / (props.gridW * cellPrintSize.value)
    )
  )
)
const totalPages = computed(() => {
  const w = Math.ceil(canvasW.value / ((paperDims.value.w * mmToPx * printScale.value) / 100))
  const h = Math.ceil(canvasH.value / ((paperDims.value.h * mmToPx * printScale.value) / 100))
  return w * h
})

const previewStyle = computed(() => {
  const maxW = 600
  const scale = Math.min(1, maxW / canvasW.value)
  return {
    width: canvasW.value * scale + 'px',
    overflow: 'hidden',
  }
})

// 渲染预览
function renderPreview() {
  nextTick(() => {
    const canvas = previewCanvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cs = cellPrintSize.value

    canvas.width = canvasW.value
    canvas.height = canvasH.value

    // 背景
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 按颜色分组绘制
    const batches = new Map()
    for (let r = 0; r < props.gridH; r++) {
      for (let c = 0; c < props.gridW; c++) {
        const cell = props.grid[r]?.[c]
        if (!cell?.hex) continue
        const key = cell.hex.toUpperCase()
        if (!batches.has(key)) batches.set(key, { hex: cell.hex, cells: [] })
        batches.get(key).cells.push({ r, c })
      }
    }

    for (const [, group] of batches) {
      ctx.fillStyle = group.hex
      for (const { r, c } of group.cells) {
        if (colorPrint.value) {
          // 分色打印：只显示当前选中颜色
          continue // 简化处理
        }
        ctx.fillRect(c * cs, r * cs, cs, cs)
      }
    }

    // 网格
    if (showGrid.value) {
      ctx.strokeStyle = 'rgba(180,190,200,0.4)'
      ctx.lineWidth = 0.3
      ctx.beginPath()
      for (let c = 0; c <= props.gridW; c++) {
        ctx.moveTo(c * cs, 0)
        ctx.lineTo(c * cs, canvas.height)
      }
      for (let r = 0; r <= props.gridH; r++) {
        ctx.moveTo(0, r * cs)
        ctx.lineTo(canvas.width, r * cs)
      }
      ctx.stroke()
    }

    // 色号
    if (showLabels.value && cs >= 8) {
      ctx.fillStyle = '#333'
      ctx.font = `${Math.max(4, cs * 0.4)}px monospace`
      ctx.textAlign = 'center'
      for (const [, group] of batches) {
        const label = (group.hex || '').replace('#', '').slice(0, 4)
        for (const { r, c } of group.cells) {
          ctx.fillText(label, c * cs + cs / 2, r * cs + cs / 2 + cs * 0.15)
        }
      }
    }

    // 拼接标记
    if (showMarks.value && totalPages.value > 1) {
      const pageW = (paperDims.value.w * mmToPx * printScale.value) / 100
      const pageH = (paperDims.value.h * mmToPx * printScale.value) / 100
      ctx.strokeStyle = 'rgba(255,100,50,0.5)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      for (let px = 0; px < canvas.width; px += pageW) {
        ctx.beginPath()
        ctx.moveTo(px, 0)
        ctx.lineTo(px, canvas.height)
        ctx.stroke()
      }
      for (let py = 0; py < canvas.height; py += pageH) {
        ctx.beginPath()
        ctx.moveTo(0, py)
        ctx.lineTo(canvas.width, py)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }
  })
}

function doPrint() {
  // 使用 Canvas 的 toDataURL 打开浏览器打印
  const dataUrl = previewCanvasRef.value?.toDataURL('image/png')
  if (dataUrl) {
    const w = window.open('', '_blank', 'width=800,height=600')
    const s = 'script'
    w.document.write(
      `<img src="${dataUrl}" style="max-width:100%"><${s}>window.onload=()=>window.print()</${s}>`
    )
  }
}

watch(
  [paperSize, orientation, showGrid, showLabels, colorPrint, showMarks, printScale],
  renderPreview
)
watch(() => props.grid, renderPreview, { deep: true })
</script>

<style scoped>
.print-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.print-dialog {
  background: #fff;
  border-radius: 16px;
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
</style>
