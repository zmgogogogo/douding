<!-- ============================================
  双层 Canvas 分离渲染：
    底层 globalGridCanvas — 全局坐标网格（无限延伸）
    顶层 mainCanvas — 珠子 + 参考图 + 范围网格 + 色号标签
  坐标原点 (0,0) = 有效拼豆范围左上角
  ============================================ -->
<template>
  <div
    ref="canvasWrap"
    class="absolute inset-0 overflow-hidden"
    :style="{ backgroundColor: 'var(--ui-bg-canvas)', touchAction: 'none' }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel.prevent="onWheel"
    @contextmenu.prevent
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    tabindex="0"
  >
    <!-- === 底层：全局坐标网格层（无限延伸，覆盖整个可视区域）=== -->
    <canvas
      ref="globalGridCanvas"
      class="absolute inset-0 pointer-events-none"
      style="z-index: 0"
    />

    <!-- === 顶层：白底 + 珠子 + 参考图 + 范围网格 + 色号 === -->
    <canvas ref="mainCanvas" class="absolute" style="background: #ffffff; z-index: 1" />

    <!-- 画笔大小预览 — 网格点阵 -->
    <div
      v-if="showBrushPreview"
      class="absolute pointer-events-none z-20"
      :style="{
        left: brushLeft + 'px',
        top: brushTop + 'px',
        width: brushSize * zoom + 'px',
        height: brushSize * zoom + 'px',
      }"
    >
      <div
        class="w-full h-full grid"
        :style="{
          gridTemplateColumns: `repeat(${brushSize}, 1fr)`,
          gridTemplateRows: `repeat(${brushSize}, 1fr)`,
        }"
      >
        <div
          v-for="i in brushSize * brushSize"
          :key="i"
          class="border border-slate-400/25"
          :style="{
            background: curColor?.hex ? curColor.hex + '40' : 'transparent',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }"
        />
      </div>
    </div>

    <!-- 施工引导栏 -->
    <EditorGuideBar
      v-if="guideMode"
      :currentColor="guideCurrentColor"
      :progress="guideProgress"
      :hasPrev="guideColorIdx > 0"
      :autoPlay="guideAutoPlay"
      :speed="guideSpeed"
      @prev="$emit('guidePrev')"
      @next="$emit('guideNext')"
      @exit="$emit('toggleGuide')"
      @toggleAutoPlay="$emit('toggleAutoPlay')"
      @setSpeed="(v) => $emit('setGuideSpeed', v)"
    />

    <!-- 参考图控制面板 -->
    <div
      v-if="refOpacity > 0 && refPixels"
      class="absolute top-10 right-3 glass-panel rounded-2xl px-2.5 py-1.5 flex flex-col gap-1 z-10 select-none"
      style="min-width: 150px"
    >
      <div class="flex items-center gap-1.5">
        <EyeIcon :size="11" class="text-[var(--ui-text-tertiary)]" />
        <input
          type="range"
          min="0.05"
          max="0.7"
          step="0.05"
          :value="refOpacity"
          class="w-12 h-1 accent-primary cursor-pointer"
          @input="$emit('setRefOpacity', parseFloat($event.target.value))"
        />
        <span class="text-[10px] font-mono text-[var(--ui-text-tertiary)] w-7"
          >{{ Math.round(refOpacity * 100) }}%</span
        >
        <button
          class="text-[9px] text-slate-400 hover:text-primary ml-auto"
          @click="$emit('refReset')"
          title="重置参考图"
        >
          ↺
        </button>
      </div>
      <div class="flex items-center gap-1">
        <span class="text-[8px] text-slate-400 w-7">缩放</span>
        <button
          class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
          @click="$emit('refZoomOut')"
        >
          −
        </button>
        <span class="text-[9px] font-mono w-7 text-center text-slate-500"
          >{{ Math.round((refScale || 1) * 100) }}%</span
        >
        <button
          class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
          @click="$emit('refZoomIn')"
        >
          +
        </button>
        <div class="flex gap-0.5 ml-1">
          <button
            class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
            @click="$emit('refMove', 0, -1)"
          >
            ↑
          </button>
          <button
            class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
            @click="$emit('refMove', -1, 0)"
          >
            ←
          </button>
          <button
            class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
            @click="$emit('refMove', 1, 0)"
          >
            →
          </button>
          <button
            class="w-5 h-5 rounded bg-slate-100 text-[10px] hover:bg-slate-200"
            @click="$emit('refMove', 0, 1)"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { EyeIcon } from 'lucide-vue-next'
import { CanvasRenderer } from '@/utils/canvas.js'
import EditorGuideBar from './EditorGuideBar.vue'

const props = defineProps({
  gridW: Number,
  gridH: Number,
  grid: Array,
  zoom: Number,
  panX: Number,
  panY: Number,
  tool: String,
  brushSize: Number,
  curColor: Object,
  highlightHex: String,
  symmetryMode: String,
  showGrid: { type: Boolean, default: true },
  editMode: { type: Boolean, default: true },
  guideMode: { type: Boolean, default: false },
  refOpacity: Number,
  refPixels: Array,
  refW: Number,
  refH: Number,
  refOffsetX: Number,
  refOffsetY: Number,
  refScale: Number,
  guideCurrentColor: Object,
  guideProgress: Number,
  guideColorIdx: Number,
  guideAutoPlay: Boolean,
  guideSpeed: Number,
  selectionRect: Object,
  beadCount: Number,
  hasSelection: Boolean,
  replaceSourceHex: String,
  focusDimHex: String,
})

const emit = defineEmits([
  'setCell',
  'saveSnapshot',
  'scheduleRender',
  'expandGrid',
  'update:panX',
  'update:panY',
  'setRefOpacity',
  'refZoomIn',
  'refZoomOut',
  'refMove',
  'refReset',
  'toggleGuide',
  'guidePrev',
  'guideNext',
  'toggleAutoPlay',
  'setGuideSpeed',
  'update:mouseCol',
  'update:mouseRow',
  'update:mouseColor',
  'pickColor',
  'floodFill',
  'magicWand',
  'lassoClick',
  'shapePreview',
  'drawShape',
  'placeText',
])

const canvasWrap = ref(null)
const mainCanvas = ref(null)
const globalGridCanvas = ref(null)

let renderer
const crossCol = ref(-1)
const crossRow = ref(-1)
const mousePos = ref({ x: -100, y: -100 })
const isDrawing = ref(false)
const lastCell = ref(null)

// 形状工具拖拽状态
const shapeStart = ref(null) // {r, c} 起始点
const shapePreview = ref(null) // [{r, c}, ...] 预览格子
const strokeCells = new Set()
const spaceHeld = ref(false) // 空格键拖拽平移
const shiftHeld = ref(false) // Shift 画直线
const lineStartCell = ref(null) // 直线起点

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
const showBrushPreview = computed(
  () => (props.tool === 'brush' || props.tool === 'eraser') && !props.guideMode
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

// 检测画笔是否超出边界，若超出则触发画布动态扩展
// 返回调整后的 {row, col}（扩展后需重新计算坐标）
function ensureBrushInBounds(row, col, e) {
  const bs = props.brushSize
  if (row >= 0 && row + bs <= props.gridH && col >= 0 && col + bs <= props.gridW) {
    return { row, col } // 在边界内，无需扩展
  }
  // 触发同步扩展（父组件 expandGridToFit + 调整 pan）
  emit('expandGrid', { row, col, brushSize: bs })
  // 扩展后 pan 已调整，需用同一事件重新计算网格坐标
  return posToGrid(e)
}

function onPointerDown(e) {
  canvasWrap.value.focus()
  const { row, col, x, y } = posToGrid(e)

  // —— 空格键 + 拖拽 = 始终平移（最高优先级） ——
  if (spaceHeld.value || e.button === 1) {
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    lastCell.value = {
      x: e.clientX,
      y: e.clientY,
      panX: props.panX,
      panY: props.panY,
      button: e.button,
    }
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

  if (props.tool === 'wand') {
    if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
      emit('magicWand', row, col)
    }
    return
  }

  if (props.tool === 'lasso') {
    emit('lassoClick', row, col)
    return
  }

  // 形状工具：记录起点，拖拽时预览
  if (['line', 'rect', 'circle'].includes(props.tool)) {
    shapeStart.value = { r: row, c: col }
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    return
  }

  // 文字工具：点击放置
  if (props.tool === 'text') {
    if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
      emit('placeText', row, col)
    }
    return
  }

  if (props.tool === 'brush' || props.tool === 'eraser') {
    canvasWrap.value.setPointerCapture(e.pointerId)
    isDrawing.value = true
    strokeCells.clear()
    // 检测边界，必要时动态扩展画布
    const adjusted = ensureBrushInBounds(row, col, e)
    if (shiftHeld.value) lineStartCell.value = { row: adjusted.row, col: adjusted.col }
    drawAt(adjusted.row, adjusted.col)
    lastCell.value = { row: adjusted.row, col: adjusted.col }
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

  if (crossTimer) {
    clearTimeout(crossTimer)
    crossTimer = null
  }
  crossTimer = setTimeout(() => {
    crossCol.value = -1
    crossRow.value = -1
  }, 300)

  // 通知父组件鼠标坐标（给状态栏使用）
  emit('update:mouseCol', col)
  emit('update:mouseRow', row)
  // 获取当前位置颜色
  const cellAtMouse =
    row >= 0 && row < props.gridH && col >= 0 && col < props.gridW ? props.grid[row]?.[col] : null
  emit('update:mouseColor', cellAtMouse?.hex ? cellAtMouse : null)

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

  // 形状工具拖拽预览
  if (['line', 'rect', 'circle'].includes(props.tool) && isDrawing.value && shapeStart.value) {
    const start = shapeStart.value
    lastCell.value = { row, col }
    emit('shapePreview', { tool: props.tool, r1: start.r, c1: start.c, r2: row, c2: col })
    return
  }

  if ((props.tool === 'brush' || props.tool === 'eraser') && isDrawing.value) {
    if (e.buttons === 2) {
      if (row >= 0 && row < props.gridH && col >= 0 && col < props.gridW) {
        emit('setCell', row, col, null)
      }
      return
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    // 检测边界，必要时动态扩展画布
    const adjusted = ensureBrushInBounds(row, col, e)
    if (adjusted.row !== lastCell.value?.row || adjusted.col !== lastCell.value?.col) {
      drawAt(adjusted.row, adjusted.col)
      lastCell.value = { row: adjusted.row, col: adjusted.col }
    }
  }
}

function onPointerUp(e) {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  if (isDrawing.value) {
    // 形状工具：结束拖拽，绘制形状
    if (['line', 'rect', 'circle'].includes(props.tool) && shapeStart.value) {
      emit('drawShape', {
        tool: props.tool,
        r1: shapeStart.value.r,
        c1: shapeStart.value.c,
        r2: lastCell.value?.row ?? shapeStart.value.r,
        c2: lastCell.value?.col ?? shapeStart.value.c,
      })
      shapeStart.value = null
      shapePreview.value = null
      isDrawing.value = false
      return
    }
    if (strokeCells.size > 0) emit('saveSnapshot')
    isDrawing.value = false
    strokeCells.clear()
    try {
      canvasWrap.value?.releasePointerCapture(e.pointerId)
    } catch (_) {
      /* noop */
    }
  }
}

// 画直线（Shift 吸附）
function drawLine(r1, c1, r2, c2) {
  const dr = Math.abs(r2 - r1),
    dc = Math.abs(c2 - c1)
  const steps = Math.max(dr, dc)
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    const r = Math.round(r1 + (r2 - r1) * t)
    const c = Math.round(c1 + (c2 - c1) * t)
    drawSingleCell(r, c)
  }
}

function drawAt(row, col) {
  // Shift 画直线
  if (shiftHeld.value && lineStartCell.value) {
    strokeCells.clear()
    drawLine(lineStartCell.value.row, lineStartCell.value.col, row, col)
    return
  }
  const cells = getSymmetryCells(row, col)
  for (const [r, c] of cells) {
    drawSingleCell(r, c)
  }
  emit('scheduleRender')
}

function drawSingleCell(row, col) {
  if (row < 0 || row >= props.gridH || col < 0 || col >= props.gridW) return
  const key = `${row},${col}`
  if (strokeCells.has(key)) return
  strokeCells.add(key)
  for (let dr = 0; dr < props.brushSize; dr++) {
    for (let dc = 0; dc < props.brushSize; dc++) {
      const tr = row + dr,
        tc = col + dc
      if (tr >= 0 && tr < props.gridH && tc >= 0 && tc < props.gridW) {
        emit('setCell', tr, tc, props.tool === 'eraser' ? null : props.curColor)
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
    emit('update:zoom', Math.max(0.5, Math.min(30, props.zoom * factor)))
    return
  }
  // deltaMode: 0=像素, 1=行, 2=页 — 统一处理为像素级平移
  const lineHeight = 18
  const scale = e.deltaMode === 0 ? 1 : e.deltaMode === 1 ? lineHeight : 800
  emit('update:panX', props.panX - e.deltaX * scale)
  emit('update:panY', props.panY - e.deltaY * scale)
}

function onKeyDown(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    spaceHeld.value = true
    canvasWrap.value.style.cursor = 'grab'
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    shiftHeld.value = true
    canvasWrap.value.style.cursor = 'crosshair'
  }
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    spaceHeld.value = false
    canvasWrap.value.style.cursor = ''
  }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    shiftHeld.value = false
    lineStartCell.value = null
    canvasWrap.value.style.cursor = ''
  }
}

// ---- 渲染调度 ----
let rafId = null
function scheduleRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    renderAll()
  })
}

// ---- 渲染 ----
function renderAll() {
  if (!renderer) {
    // 渲染器未初始化，自动初始化
    if (mainCanvas.value) initCanvas()
    if (!renderer) return
  }
  try {
    renderer.renderAll(props.grid, {
      highlightHex: props.highlightHex || null,
      dimHex: props.focusDimHex || null,
      refPixels: props.refPixels,
      refW: props.refW,
      refH: props.refH,
      refOpacity: props.refOpacity,
      refOffsetX: props.refOffsetX || 0,
      refOffsetY: props.refOffsetY || 0,
      refScale: props.refScale || 1,
      showGrid: props.showGrid,
      zoom: props.zoom,
    })
  } catch (e) {
    console.error('Canvas renderAll 失败:', e)
  }
}

function positionCanvas() {
  renderer?.position(canvasWrap.value, props.zoom, props.panX, props.panY)
  renderGlobalGrid()
}

/** 渲染全局坐标网格（底层无限延伸） */
function renderGlobalGrid() {
  if (!renderer || !props.showGrid) return
  renderer.renderGlobalGrid(canvasWrap.value, props.zoom, props.panX, props.panY)
}

function initCanvas() {
  if (!mainCanvas.value) {
    console.warn('[EditorCanvas] Canvas 元素未就绪，延迟初始化')
    let retries = 0
    const maxRetries = 10
    const retry = () => {
      if (mainCanvas.value) {
        _doInitCanvas()
        renderAll()
        return
      }
      if (++retries < maxRetries) setTimeout(retry, 50)
      else console.error('[EditorCanvas] Canvas 初始化失败：元素始终不可用')
    }
    setTimeout(retry, 50)
    return
  }
  // 幂等：若已初始化则跳过，避免 resize() 清空画布
  if (renderer) return
  _doInitCanvas()
}

function _doInitCanvas() {
  renderer = new CanvasRenderer(mainCanvas.value, {
    gridW: props.gridW,
    gridH: props.gridH,
    zoom: props.zoom,
  })
  renderer.resize(props.gridW, props.gridH, props.zoom)
  if (globalGridCanvas.value) {
    renderer.setGlobalGridCanvas(globalGridCanvas.value)
  }
  positionCanvas()
}

onMounted(() => {
  nextTick(() => {
    initCanvas()
    renderAll()
    positionCanvas()
  })
})

watch([() => props.gridW, () => props.gridH], ([w, h]) => {
  nextTick(() => {
    renderer?.resize(w, h, props.zoom)
    positionCanvas()
    renderAll()
  })
})

// 缩放变化时需重设 canvas 尺寸（1:1 渲染要求）
watch(
  () => props.zoom,
  (z) => {
    nextTick(() => {
      renderer?.resize(props.gridW, props.gridH, z)
      positionCanvas()
      renderAll()
    })
  }
)

watch([() => props.panX, () => props.panY], () => {
  positionCanvas()
})

// 网格开关变化时重绘全局网格层
watch(
  () => props.showGrid,
  () => {
    if (props.showGrid) renderGlobalGrid()
  }
)

watch(
  [
    () => props.grid,
    () => props.highlightHex,
    () => props.showGrid,
    () => props.refOpacity,
    () => props.refPixels,
    () => props.guideMode,
    () => props.guideCurrentColor,
  ],
  () => {
    scheduleRender()
  },
  { deep: true }
)

defineExpose({ scheduleRender, renderAll, posToGrid, initCanvas, positionCanvas, canvasWrap })
</script>
