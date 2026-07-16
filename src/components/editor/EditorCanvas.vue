<!-- ============================================
  EditorCanvas.vue — 画布区域（核心交互）
  锚定原点式三级分层画布体系
    底层：CSS 全局坐标网格（无限延伸浅蓝细网格）
    中层：有效拼豆范围层（深蓝内部网格 + 红色边框）
    顶层：拼豆图案内容层（实际珠子渲染）

  坐标原点 (0,0) = 有效拼豆范围左上角
  X轴 → 右正左负，Y轴 → 下正上负
  ============================================ -->
<template>
  <div
    ref="canvasWrap"
    class="flex-1 relative overflow-hidden"
    :style="containerStyle"
    @pointerdown="onPointerDown" @pointermove="onPointerMove"
    @pointerup="onPointerUp" @pointerleave="onPointerUp" @pointercancel="onPointerUp"
    @wheel.prevent="onWheel" @contextmenu.prevent
    @dblclick.prevent="onDoubleClick"
    @keydown="onKeyDown" @keyup="onKeyUp" tabindex="0">

    <!-- === 底层：CSS 全局坐标网格（无限延伸，铺满整个可视区域）=== -->

    <!-- === 中层：有效范围网格 + 红色边框 === -->
    <canvas ref="gridCanvas" class="absolute pointer-events-none pixel-thumb" />

    <!-- === 顶层：拼豆图案内容层 === -->
    <canvas ref="mainCanvas" class="absolute pixel-thumb" />

    <!-- === 参考图叠加层 === -->
    <canvas ref="refCanvas" class="absolute pointer-events-none pixel-thumb" />

    <!-- === 顶部 X 轴标尺（全屏宽度）=== -->
    <div v-if="showGrid" class="absolute top-0 left-0 right-0 pointer-events-none z-10"
      style="height:22px;background:rgba(255,255,255,0.88);backdrop-filter:blur(6px);border-bottom:1px solid #e5e7eb">
      <div class="absolute inset-0 overflow-hidden">
        <template v-for="c in rulerCols" :key="'ct'+c">
          <div
            class="absolute flex flex-col items-center justify-end"
            :style="{
              left: Math.round(gridLeft + c * zoom + zoom / 2) + 'px',
              transform: 'translateX(-50%)',
              top: '0',
              height: '22px'
            }">
            <span class="text-[11px] text-slate-600 font-medium leading-none mb-0.5 font-mono select-none">{{ c }}</span>
            <div class="h-[5px] w-px bg-slate-350" />
          </div>
        </template>
      </div>
    </div>

    <!-- === 左侧 Y 轴标尺（全屏高度）=== -->
    <div v-if="showGrid" class="absolute top-0 left-0 bottom-0 pointer-events-none z-10"
      style="width:32px;background:rgba(255,255,255,0.88);backdrop-filter:blur(6px);border-right:1px solid #e5e7eb">
      <div class="absolute inset-0 overflow-hidden">
        <template v-for="r in rulerRows" :key="'rt'+r">
          <div
            class="absolute flex items-center w-full"
            :style="{
              top: Math.round(gridTop + r * zoom + zoom / 2) + 'px',
              transform: 'translateY(-50%)',
              height: zoom + 'px'
            }">
            <span class="text-[11px] text-slate-600 font-medium leading-none ml-1 font-mono select-none w-5 text-right">{{ r }}</span>
            <div class="w-[5px] h-px bg-slate-350 ml-0.5" />
          </div>
        </template>
      </div>
    </div>

    <!-- 坐标悬停提示 -->
    <div v-if="showGrid && crossCol >= 0 && crossRow >= 0"
      class="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md rounded-full
             px-3 py-1 shadow-md border border-slate-200 text-[11px] font-mono font-semibold
             text-slate-600 z-10 select-none pointer-events-none">
      ({{ crossCol + 1 }}, {{ crossRow + 1 }})
    </div>

    <!-- 画笔大小预览 — 网格点阵 -->
    <div v-if="showBrushPreview" class="absolute pointer-events-none z-20"
      :style="{ left: brushLeft + 'px', top: brushTop + 'px', width: brushSize * zoom + 'px', height: brushSize * zoom + 'px' }">
      <div class="w-full h-full grid"
        :style="{ gridTemplateColumns: `repeat(${brushSize}, 1fr)`, gridTemplateRows: `repeat(${brushSize}, 1fr)` }">
        <div v-for="i in brushSize * brushSize" :key="i"
          class="border border-slate-700/30"
          :style="{ background: curColor?.hex ? curColor.hex + '40' : 'transparent' }" />
      </div>
    </div>

    <!-- 施工引导栏 -->
    <EditorGuideBar v-if="guideMode"
      :currentColor="guideCurrentColor"
      :progress="guideProgress"
      :hasPrev="guideColorIdx > 0"
      @prev="$emit('guidePrev')" @next="$emit('guideNext')" @exit="$emit('toggleGuide')" />

    <!-- 参考图控制面板 -->
    <div v-if="refOpacity > 0 && refPixels" class="absolute top-10 right-3 bg-white/85 backdrop-blur rounded-xl
                shadow-sm border border-[var(--ui-border)] px-2.5 py-1.5 flex flex-col gap-1 z-10 select-none"
                style="min-width:150px">
      <div class="flex items-center gap-1.5">
        <EyeIcon :size="11" class="text-[var(--ui-text-tertiary)]" />
        <input type="range" min="0.05" max="0.7" step="0.05" :value="refOpacity"
          class="w-12 h-1 accent-primary cursor-pointer"
          @input="$emit('setRefOpacity', parseFloat($event.target.value))" />
        <span class="text-[10px] font-mono text-[var(--ui-text-tertiary)] w-7">{{ Math.round(refOpacity*100) }}%</span>
        <button class="text-[9px] text-slate-400 hover:text-primary ml-auto" @click="$emit('refReset')" title="重置参考图">↺</button>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-[8px] text-slate-400 w-7">缩放</span>
        <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refZoomOut')">−</button>
        <span class="text-[9px] font-mono w-7 text-center text-slate-500">{{ Math.round((refScale||1)*100) }}%</span>
        <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refZoomIn')">+</button>
        <div class="flex gap-0.5 ml-1">
          <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refMove',0,-1)">↑</button>
          <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refMove',-1,0)">←</button>
          <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refMove',1,0)">→</button>
          <button class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200" @click="$emit('refMove',0,1)">↓</button>
        </div>
      </div>
    </div>

    <!-- 底部信息卡 -->
    <div class="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl
                shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-[var(--ui-border)] px-4 py-2 flex items-center gap-3 z-10 select-none">
      <div class="flex flex-col items-start">
        <span class="text-[9px] text-[var(--ui-text-tertiary)] leading-none">{{ editMode ? '编辑模式' : '完成模式' }}</span>
        <span class="text-[13px] font-bold text-[var(--ui-text-primary)]">{{ gridW }}×{{ gridH }} 个豆子</span>
      </div>
      <button class="h-7 px-2.5 rounded-full bg-[var(--ui-bg-tertiary)] text-[10px] text-[var(--ui-text-secondary)]
                   font-medium hover:bg-[var(--ui-border)] transition-colors flex items-center gap-1"
        @click="$emit('openSizeDialog')"><PencilIcon :size="10" />修改大小</button>
      <button class="h-7 px-2.5 rounded-full text-[10px] font-medium text-white transition-colors flex items-center gap-1"
        :class="guideMode ? 'bg-emerald-500' : 'bg-primary'"
        @click="$emit('toggleGuide')"><Wand2Icon :size="10" />{{ guideMode ? '退出' : '辅助' }}</button>
    </div>

    <!-- 去除杂色按钮 -->
    <button v-if="beadCount > 0"
      class="absolute bottom-3 right-3 bg-white/90 backdrop-blur rounded-full
             shadow-sm border border-[var(--ui-border)] px-3 py-1.5 flex items-center gap-1.5
             text-[10px] text-[var(--ui-text-secondary)] hover:text-primary transition-colors z-10"
      @click="$emit('removeNoise')" title="去除杂色">
      <span>🧹 去杂色</span>
    </button>

    <!-- 底部缩放控件 -->
    <EditorZoomControl
      :zoom="zoom" :minZoom="0.5" :maxZoom="30" :step="0.5"
      @zoomToFit="$emit('zoomToFit')" @zoomOut="$emit('zoomOut')"
      @zoomIn="$emit('zoomIn')" @setZoom="v => $emit('setZoom', v)"
      @zoomTo1x="$emit('zoomTo1x')" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { PencilIcon, Wand2Icon, EyeIcon } from 'lucide-vue-next'
import { CanvasRenderer } from '@/utils/canvas.js'
import EditorGuideBar from './EditorGuideBar.vue'
import EditorZoomControl from './EditorZoomControl.vue'

const props = defineProps({
  gridW: Number, gridH: Number, grid: Array,
  zoom: Number, panX: Number, panY: Number,
  tool: String, brushSize: Number, curColor: Object,
  highlightHex: String, symmetryMode: String,
  showGrid: Boolean, editMode: Boolean, guideMode: Boolean,
  refOpacity: Number, refPixels: Array, refW: Number, refH: Number,
  refOffsetX: Number, refOffsetY: Number, refScale: Number,
  guideCurrentColor: Object, guideProgress: Number, guideColorIdx: Number,
  selectionRect: Object,
  beadCount: Number, hasSelection: Boolean,
  replaceSourceHex: String, focusDimHex: String,
})

const emit = defineEmits([
  'setCell', 'saveSnapshot', 'scheduleRender',
  'update:panX', 'update:panY', 'update:zoom',
  'setZoom', 'zoomIn', 'zoomOut', 'zoomToFit', 'zoomTo1x',
  'setRefOpacity', 'refZoomIn', 'refZoomOut', 'refMove', 'refReset',
  'toggleGuide', 'guidePrev', 'guideNext',
  'openSizeDialog', 'removeNoise',
  'update:crossCol', 'update:crossRow', 'update:mousePos',
  'update:selectionRect', 'deleteSelection', 'copySelection', 'pasteSelection',
  'pickColor',
])

const canvasWrap = ref(null)
const mainCanvas = ref(null)
const gridCanvas = ref(null)
const refCanvas = ref(null)

let mainRenderer, gridRenderer, refRenderer
const crossCol = ref(-1)
const crossRow = ref(-1)
const mousePos = ref({ x: -100, y: -100 })
const isDrawing = ref(false)
const lastCell = ref(null)
const strokeCells = new Set()
const spaceHeld = ref(false)  // 空格键拖拽平移

// ---- 原点锚定坐标计算 ----
// 原点 (0,0) = 拼豆有效范围左上角
// gridLeft/gridTop = 原点在容器中的 CSS 像素位置
const gridLeft = computed(() => {
  const cw = props.gridW * props.zoom
  return (canvasWrap.value?.clientWidth || 0) / 2 + props.panX - cw / 2
})
const gridTop = computed(() => {
  const ch = props.gridH * props.zoom
  return (canvasWrap.value?.clientHeight || 0) / 2 + props.panY - ch / 2
})

// ---- 容器样式（CSS 全局背景网格） ----
// 无限延伸的浅灰蓝细网格，每格 = zoom 像素，原点锚定有效范围左上角
const containerStyle = computed(() => {
  const z = props.zoom
  if (!props.showGrid || z < 2) {
    return { backgroundColor: '#F5F8FC', touchAction: 'none' }
  }
  const gl = gridLeft.value
  const gt = gridTop.value
  return {
    backgroundColor: '#F5F8FC',
    touchAction: 'none',
    // 全局坐标网格：浅灰蓝细线，1px 线宽
    backgroundImage: `
      linear-gradient(to right, #DCE6F2 1px, transparent 1px),
      linear-gradient(to bottom, #DCE6F2 1px, transparent 1px)
    `.replace(/\s+/g, ' ').trim(),
    backgroundSize: `${z}px ${z}px`,
    backgroundPosition: `${gl}px ${gt}px`,
    backgroundRepeat: 'repeat'
  }
})

// ---- 标尺：每5格标注，密度随缩放自适应 ----
const rulerCols = computed(() => {
  const z = props.zoom
  let step = 5
  if (z < 4) step = 25
  else if (z < 7) step = 10
  else if (z < 12) step = 5
  else step = 2

  const cols = []
  for (let c = 0; c < props.gridW; c += step) {
    cols.push(c)
  }
  // 确保包含最后一格
  if (cols[cols.length - 1] !== props.gridW - 1) {
    cols.push(props.gridW - 1)
  }
  return cols
})

const rulerRows = computed(() => {
  const z = props.zoom
  let step = 5
  if (z < 4) step = 25
  else if (z < 7) step = 10
  else if (z < 12) step = 5
  else step = 2

  const rows = []
  for (let r = 0; r < props.gridH; r += step) {
    rows.push(r)
  }
  if (rows[rows.length - 1] !== props.gridH - 1) {
    rows.push(props.gridH - 1)
  }
  return rows
})

// ---- 画布坐标 → 网格坐标（0-based，原点左上角）----
function posToGrid(e) {
  const rect = canvasWrap.value.getBoundingClientRect()
  const x = e.clientX - rect.left - gridLeft.value
  const y = e.clientY - rect.top - gridTop.value
  const col = Math.floor(x / props.zoom)
  const row = Math.floor(y / props.zoom)
  return { row, col, x, y }
}

// ---- 画笔预览 ----
const showBrushPreview = computed(() =>
  (props.tool === 'brush' || props.tool === 'eraser') && !props.guideMode
)
const brushLeft = computed(() => {
  const { row, col } = posToGridFromMouse()
  if (col < 0 || row < 0) return -100
  return gridLeft.value + col * props.zoom
})
const brushTop = computed(() => {
  const { row, col } = posToGridFromMouse()
  if (col < 0 || row < 0) return -100
  return gridTop.value + row * props.zoom
})
function posToGridFromMouse() {
  if (!canvasWrap.value) return { row: -1, col: -1 }
  const rect = canvasWrap.value.getBoundingClientRect()
  const x = mousePos.value.x - gridLeft.value
  const y = mousePos.value.y - gridTop.value
  return { row: Math.floor(y / props.zoom), col: Math.floor(x / props.zoom) }
}

// ---- 指针事件 ----
let longPressTimer = null
let crossTimer = null

function onPointerDown(e) {
  canvasWrap.value.focus()
  const { row, col, x, y } = posToGrid(e)

  // —— 空格键 + 拖拽 = 始终平移（最高优先级） ——
  if (spaceHeld.value || e.button === 1) {
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    lastCell.value = { x: e.clientX, y: e.clientY, panX: props.panX, panY: props.panY }
    return
  }

  if (e.button === 2) {
    if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
      emit('setCell', row, col, null)
      emit('saveSnapshot')
      emit('scheduleRender')
    }
    return
  }

  if (props.tool === 'move') {
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    lastCell.value = { x, y, panX: props.panX, panY: props.panY }
    return
  }

  if (props.tool === 'picker') {
    if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
      emit('pickColor', row, col)
    }
    return
  }

  if (props.tool === 'fill') {
    if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
      emit('floodFill', row, col)
    }
    return
  }

  if (props.tool === 'brush' || props.tool === 'eraser') {
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    strokeCells.clear()
    drawAt(row, col)
    lastCell.value = { row, col }
    longPressTimer = setTimeout(() => {
      if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
        emit('pickColor', row, col)
      }
    }, 800)
    return
  }
}

function onPointerMove(e) {
  const { row, col } = posToGrid(e)
  const rect = canvasWrap.value.getBoundingClientRect()
  mousePos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  crossCol.value = col
  crossRow.value = row

  if (crossTimer) { clearTimeout(crossTimer); crossTimer = null }
  crossTimer = setTimeout(() => { crossCol.value = -1; crossRow.value = -1 }, 300)

  // —— 空格键/中键拖拽平移（最高优先级） ——
  if (isDrawing.value && (spaceHeld.value || lastCell.value?.button === 1)) {
    const dx = e.clientX - lastCell.value.x
    const dy = e.clientY - lastCell.value.y
    emit('update:panX', lastCell.value.panX + dx)
    emit('update:panY', lastCell.value.panY + dy)
    return
  }

  if (props.tool === 'move' && isDrawing.value) {
    const rect2 = canvasWrap.value.getBoundingClientRect()
    const dx = e.clientX - rect2.left - lastCell.value.x
    const dy = e.clientY - rect2.top - lastCell.value.y
    emit('update:panX', lastCell.value.panX + dx)
    emit('update:panY', lastCell.value.panY + dy)
    return
  }

  if ((props.tool === 'brush' || props.tool === 'eraser') && isDrawing.value) {
    if (e.buttons === 2) {
      if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
        emit('setCell', row, col, null)
      }
      return
    }
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
    if (row !== lastCell.value?.row || col !== lastCell.value?.col) {
      drawAt(row, col)
      lastCell.value = { row, col }
    }
  }
}

function onPointerUp(e) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  if (isDrawing.value) {
    if (strokeCells.size > 0) emit('saveSnapshot')
    isDrawing.value = false
    strokeCells.clear()
    try { canvasWrap.value?.releasePointerCapture(e.pointerId) } catch (_) { /* noop */ }
  }
}

function drawAt(row, col) {
  if (row < 0 || row >= props.gridH || col < 0 || col >= props.gridW) return
  const cells = getSymmetryCells(row, col)
  for (const [r, c] of cells) {
    if (r < 0 || r >= props.gridH || c < 0 || c >= props.gridW) continue
    const key = `${r},${c}`
    if (strokeCells.has(key)) continue
    strokeCells.add(key)
    for (let dr = 0; dr < props.brushSize; dr++) {
      for (let dc = 0; dc < props.brushSize; dc++) {
        const tr = r + dr, tc = c + dc
        if (tr >= 0 && tr < props.gridH && tc >= 0 && tc < props.gridW) {
          emit('setCell', tr, tc, props.tool === 'eraser' ? null : props.curColor)
        }
      }
    }
  }
  emit('scheduleRender')
}

function getSymmetryCells(r, c) {
  const cells = [[r, c]]
  const m = props.symmetryMode
  if (m === 'h' || m === 'quad') cells.push([r, props.gridW - 1 - c])
  if (m === 'v' || m === 'quad') cells.push([props.gridH - 1 - r, c])
  if (m === 'quad') cells.push([props.gridH - 1 - r, props.gridW - 1 - c])
  return cells
}

// ---- 缩放/平移 ----
function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    emit('setZoom', Math.max(0.5, Math.min(30, props.zoom * factor)))
  } else if (e.deltaMode === 0) {
    emit('update:panX', props.panX - e.deltaX)
    emit('update:panY', props.panY - e.deltaY)
  }
}

function onDoubleClick() { emit('zoomTo1x') }

function onKeyDown(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    spaceHeld.value = true
    canvasWrap.value.style.cursor = 'grab'
  }
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    spaceHeld.value = false
    canvasWrap.value.style.cursor = ''
  }
}

// ---- 渲染调度 ----
let rafId = null
function scheduleRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => { rafId = null; renderAll() })
}

function renderAll() {
  if (!mainRenderer) return
  mainRenderer.renderBeads(props.grid, props.highlightHex || null, props.focusDimHex || null)
  gridRenderer.renderGridLines(props.showGrid, crossCol.value, crossRow.value)

  if (props.refPixels) {
    refRenderer.renderRefOverlay(props.refPixels, props.refW, props.refH, props.refOpacity, props.refOffsetX || 0, props.refOffsetY || 0, props.refScale || 1)
  } else {
    refRenderer.ctx.clearRect(0, 0, props.gridW, props.gridH)
  }
}

function positionCanvases() {
  [mainRenderer, gridRenderer, refRenderer].forEach(r => {
    r?.position(canvasWrap.value, props.zoom, props.panX, props.panY)
  })
}

function initCanvas() {
  if (!mainCanvas.value) return
  mainRenderer = new CanvasRenderer(mainCanvas.value, { gridW: props.gridW, gridH: props.gridH })
  gridRenderer = new CanvasRenderer(gridCanvas.value, { gridW: props.gridW, gridH: props.gridH })
  refRenderer = new CanvasRenderer(refCanvas.value, { gridW: props.gridW, gridH: props.gridH })
  mainRenderer.resize(props.gridW, props.gridH)
  gridRenderer.resize(props.gridW, props.gridH)
  refRenderer.resize(props.gridW, props.gridH)
}

onMounted(() => {
  nextTick(() => { initCanvas(); positionCanvases(); renderAll() })
})

watch([() => props.gridW, () => props.gridH], ([w, h]) => {
  nextTick(() => {
    mainRenderer?.resize(w, h)
    gridRenderer?.resize(w, h)
    refRenderer?.resize(w, h)
    positionCanvases()
    renderAll()
  })
})

watch([() => props.zoom, () => props.panX, () => props.panY], () => { positionCanvases() })

watch([
  () => props.grid, () => props.highlightHex, () => props.showGrid,
  () => props.refOpacity, () => props.refPixels,
  () => props.guideMode, () => props.guideCurrentColor
], () => { scheduleRender() }, { deep: true })

defineExpose({ scheduleRender, renderAll, posToGrid, initCanvas, positionCanvases })
</script>
