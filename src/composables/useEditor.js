// ============================================
//  useEditor — 拼豆编辑器核心状态管理
//  提取自 EditorView.vue，供所有编辑器子组件共享
//  ohmybead.cn 风格
// ============================================
import { ref, computed, reactive } from 'vue'

// ---- 单例状态（模块级，全局共享） ----
const gridW = ref(58)
const gridH = ref(58)
const grid = ref([])            // 当前活动层的 grid（兼容旧代码）
const layers = ref([])          // [{id, name, visible, opacity, grid}]
const currentLayerId = ref(null)
const zoom = ref(10)
const panX = ref(0)
const panY = ref(0)
const tool = ref('brush')       // 'brush'|'eraser'|'fill'|'picker'|'select'|'replace'|'move'
const brushSize = ref(1)
const curColor = ref(null)      // {name, hex, brand, series, id}
const highlightHex = ref(null)  // 同色高亮的颜色 hex
const symmetryMode = ref('none') // 'none'|'h'|'v'|'quad'
const showGrid = ref(true)
const showMinorGrid = ref(true) // 细网格（每格）
const showMajorGrid = ref(true) // 粗网格（每10格）
const refOpacity = ref(0)
const refLocked = ref(false)
const editMode = ref(true)      // true=编辑, false=预览
const guideMode = ref(false)
const focusMode = ref(false)    // 专注模式

// 参考图数据
const refPixels = ref(null)     // ImageData 或像素数组
const refW = ref(0)
const refH = ref(0)
const refImage = ref(null)      // 原始参考图 URL
const refOffsetX = ref(0)       // 参考图水平偏移（网格单位）
const refOffsetY = ref(0)       // 参考图垂直偏移
const refScale = ref(1)         // 参考图缩放

// 选区工具
const selectionRect = ref(null)      // {r1, c1, r2, c2}
const selectionDragging = ref(false)
const clipboard = ref(null)          // {grid, w, h}

// 颜色搜索和最近使用
const colorSearch = ref('')
const recentColors = ref([])  // 最近使用的颜色 [{name, hex, brand, series}]
const MAX_RECENT = 12

function addRecentColor(color) {
  if (!color?.hex) return
  recentColors.value = [
    color,
    ...recentColors.value.filter(c => c.hex !== color.hex)
  ].slice(0, MAX_RECENT)
}

// 替换工具
const replaceSourceHex = ref(null)

// 施工引导
const guideColorIdx = ref(0)
const guideDone = ref(new Set())
const guideColors = computed(() => {
  const map = new Map()
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = grid.value[r]?.[c]
      if (!cell?.hex) continue
      const key = cell.hex.toUpperCase()
      if (!map.has(key)) map.set(key, { ...cell, count: 0 })
      map.get(key).count++
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})
const guideCurrentColor = computed(() => guideColors.value[guideColorIdx.value] || null)
const guideProgress = computed(() => {
  if (!guideColors.value.length) return 0
  return Math.round((guideDone.value.size / guideColors.value.length) * 100)
})

// 撤销/重做
const historyArr = ref([])
const historyIdx = ref(-1)
const MAX_HISTORY = 200

// 珠子数据
const beadData = ref([])       // 从服务器加载的颜色列表
const inventory = ref({})      // color_id -> quantity

// 保存状态
const editId = ref(null)
const editTitle = ref('未命名图纸')
const hasUnsavedChanges = ref(false)
const lastSavedTime = ref(null)
const autoSaveKey = 'douding_autosave_v2'

// 弹窗状态
const showInfo = ref(false)
const showSizeDialog = ref(false)
const sizeDialogW = ref(58)
const sizeDialogH = ref(58)
const showExportMenu = ref(false)
const showColorStats = ref(false)

// 指针状态
const mousePos = ref({ x: -100, y: -100 })
const crossCol = ref(-1)
const crossRow = ref(-1)
const isDrawing = ref(false)

// 品牌/系列筛选
const brand = ref('全部')
const seriesActive = ref('')

// ---- 计算属性 ----
const brands = computed(() => ['全部', ...new Set(beadData.value.map(c => c.brand))])

const series = computed(() => {
  if (brand.value === '全部') {
    return [...new Set(beadData.value.map(c => c.brand + ' · ' + c.series))]
  }
  return [...new Set(beadData.value.filter(c => c.brand === brand.value).map(c => c.series))]
})

const filteredColors = computed(() => {
  let result = beadData.value

  // 品牌/系列筛选
  if (brand.value === '全部') {
    const s = seriesActive.value
    if (s) {
      const [b, sn] = s.split(' · ')
      result = result.filter(c => c.brand === b && c.series === sn)
    }
  } else {
    result = result.filter(c => c.brand === brand.value)
    if (seriesActive.value) result = result.filter(c => c.series === seriesActive.value)
  }

  // 颜色搜索
  if (colorSearch.value.trim()) {
    const q = colorSearch.value.trim().toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.hex.toLowerCase().includes(q) ||
      (c.brand && c.brand.toLowerCase().includes(q))
    )
  }

  return result
})

const beadCount = computed(() => {
  let n = 0
  for (const r of grid.value) if (r) for (const c of r) if (c?.hex) n++
  return n
})

const gridColorStats = computed(() => {
  const map = new Map()
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = grid.value[r]?.[c]
      if (!cell?.hex) continue
      const key = cell.hex.toUpperCase()
      if (!map.has(key)) map.set(key, { name: cell.name, hex: cell.hex, count: 0 })
      map.get(key).count++
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
})

const brandColorCounts = computed(() => {
  const map = {}
  for (const c of beadData.value) map[c.brand] = (map[c.brand] || 0) + 1
  return map
})

const totalColorCount = computed(() => beadData.value.length)
const seriesColorCount = computed(() => filteredColors.value.length)

// 画笔预览样式
const brushPreviewStyle = computed(() => {
  const size = brushSize.value * zoom.value
  return {
    width: `${size}px`, height: `${size}px`,
    left: `${mousePos.value.x - size / 2}px`,
    top: `${mousePos.value.y - size / 2}px`
  }
})

// ---- 网格操作方法 ----
function initGrid(w, h) {
  gridW.value = w
  gridH.value = h
  const newGrid = Array.from({ length: h }, () => Array(w).fill(null))
  grid.value = newGrid
  layers.value = [{ id: 'l1', name: '图层 1', visible: true, opacity: 1, grid: newGrid }]
  currentLayerId.value = 'l1'
}

// 根据内容自动扩展画布尺寸
function autoFitGrid(padding = 4) {
  let minR = gridH.value, maxR = 0, minC = gridW.value, maxC = 0
  const comp = getCompositeGrid()
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      if (comp[r]?.[c]?.hex) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r)
        minC = Math.min(minC, c); maxC = Math.max(maxC, c)
      }
    }
  }
  if (maxR < minR) return // 空画布

  const newW = Math.max(10, maxC - minC + 1 + padding * 2)
  const newH = Math.max(10, maxR - minR + 1 + padding * 2)

  if (newW === gridW.value && newH === gridH.value) return false

  // 裁剪/扩展
  const newGrid = Array.from({ length: newH }, () => Array(newW).fill(null))
  for (let r = 0; r < newH; r++) {
    for (let c = 0; c < newW; c++) {
      const srcR = r - padding + minR, srcC = c - padding + minC
      if (srcR >= 0 && srcR < gridH.value && srcC >= 0 && srcC < gridW.value) {
        newGrid[r][c] = comp[srcR]?.[srcC] ? { ...comp[srcR][srcC] } : null
      }
    }
  }
  gridW.value = newW; gridH.value = newH
  layers.value = [{ id: 'l1', name: '图层 1', visible: true, opacity: 1, grid: newGrid }]
  currentLayerId.value = 'l1'
  grid.value = newGrid
  return true
}

// ---- 图层管理 ----
function addLayer(name) {
  const id = 'l' + Date.now()
  const newGrid = Array.from({ length: gridH.value }, () => Array(gridW.value).fill(null))
  layers.value.push({ id, name: name || `图层 ${layers.value.length + 1}`, visible: true, opacity: 1, grid: newGrid })
  currentLayerId.value = id
  grid.value = newGrid
}

function removeLayer(id) {
  if (layers.value.length <= 1) return
  const idx = layers.value.findIndex(l => l.id === id)
  if (idx < 0) return
  layers.value.splice(idx, 1)
  const newIdx = Math.min(idx, layers.value.length - 1)
  currentLayerId.value = layers.value[newIdx].id
  grid.value = layers.value[newIdx].grid
}

function selectLayer(id) {
  const layer = layers.value.find(l => l.id === id)
  if (!layer) return
  currentLayerId.value = id
  grid.value = layer.grid
}

function toggleLayerVisibility(id) {
  const layer = layers.value.find(l => l.id === id)
  if (layer) layer.visible = !layer.visible
}

function setLayerOpacity(id, opacity) {
  const layer = layers.value.find(l => l.id === id)
  if (layer) layer.opacity = Math.max(0, Math.min(1, opacity))
}

function mergeLayerDown(id) {
  const idx = layers.value.findIndex(l => l.id === id)
  if (idx <= 0) return // 不能合并最底层
  const upper = layers.value[idx]
  const lower = layers.value[idx - 1]
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      if (upper.grid[r]?.[c] && !lower.grid[r]?.[c]) {
        lower.grid[r][c] = { ...upper.grid[r][c] }
      }
    }
  }
  layers.value.splice(idx, 1)
  selectLayer(lower.id)
  saveSnapshot()
}

// 获取合成后的完整 grid（所有可见层合并）
function getCompositeGrid() {
  const result = Array.from({ length: gridH.value }, () => Array(gridW.value).fill(null))
  for (const layer of layers.value) {
    if (!layer.visible) continue
    for (let r = 0; r < gridH.value; r++) {
      for (let c = 0; c < gridW.value; c++) {
        if (layer.grid[r]?.[c] && !result[r][c]) {
          result[r][c] = { ...layer.grid[r][c] }
        }
      }
    }
  }
  return result
}

function getCell(r, c) {
  if (r < 0 || r >= gridH.value || c < 0 || c >= gridW.value) return null
  return grid.value[r]?.[c] ?? null
}

function setCell(r, c, color) {
  if (r < 0 || r >= gridH.value || c < 0 || c >= gridW.value) return
  if (!grid.value[r]) grid.value[r] = []
  grid.value[r][c] = color ? { ...color } : null
}

// ---- 对称坐标计算 ----
function getSymmetryCells(r, c) {
  const cells = [[r, c]]
  const m = symmetryMode.value
  if (m === 'h' || m === 'quad') cells.push([r, gridW.value - 1 - c])
  if (m === 'v' || m === 'quad') cells.push([gridH.value - 1 - r, c])
  if (m === 'quad') cells.push([gridH.value - 1 - r, gridW.value - 1 - c])
  return cells
}

// ---- 历史快照 ----
function saveSnapshot() {
  const snapshot = {
    grid: grid.value.map(r => r ? r.map(c => c ? { ...c } : null) : []),
    layers: layers.value.map(l => ({
      ...l,
      grid: l.grid.map(r => r ? r.map(c => c ? { ...c } : null) : [])
    })),
    currentLayerId: currentLayerId.value,
    w: gridW.value,
    h: gridH.value
  }
  // 清除当前位置之后的历史
  historyArr.value = historyArr.value.slice(0, historyIdx.value + 1)
  historyArr.value.push(snapshot)
  // 限制历史长度
  if (historyArr.value.length > MAX_HISTORY) historyArr.value.shift()
  historyIdx.value = historyArr.value.length - 1
  hasUnsavedChanges.value = true
}

function undo() {
  if (historyIdx.value <= 0) return
  historyIdx.value--
  restoreSnapshot(historyArr.value[historyIdx.value])
}

function redo() {
  if (historyIdx.value >= historyArr.value.length - 1) return
  historyIdx.value++
  restoreSnapshot(historyArr.value[historyIdx.value])
}

function restoreSnapshot(snapshot) {
  gridW.value = snapshot.w
  gridH.value = snapshot.h
  grid.value = snapshot.grid.map(r => r ? r.map(c => c ? { ...c } : null) : [])
  if (snapshot.layers) {
    layers.value = snapshot.layers.map(l => ({
      ...l,
      grid: l.grid.map(r => r ? r.map(c => c ? { ...c } : null) : [])
    }))
    currentLayerId.value = snapshot.currentLayerId || layers.value[0]?.id
  }
}

// ---- 对称模式 ----
function cycleSymmetry() {
  const modes = ['none', 'h', 'v', 'quad']
  const idx = modes.indexOf(symmetryMode.value)
  symmetryMode.value = modes[(idx + 1) % modes.length]
}

// ---- 参考图透明度 ----
function cycleRefOpacity() {
  const steps = [0, 0.2, 0.4, 0.7]
  const idx = steps.indexOf(refOpacity.value)
  refOpacity.value = steps[(idx + 1) % steps.length]
}

function setRefOpacity(v) {
  refOpacity.value = Math.max(0.05, Math.min(0.7, v))
}

function toggleRefLock() {
  refLocked.value = !refLocked.value
}

// ---- 施工引导 ----
function toggleGuideMode() {
  guideMode.value = !guideMode.value
  if (guideMode.value) {
    guideColorIdx.value = 0
    guideDone.value = new Set()
  }
}

function guidePrev() {
  if (guideColorIdx.value > 0) guideColorIdx.value--
}

function guideNext() {
  guideDone.value.add(guideColorIdx.value)
  if (guideColorIdx.value < guideColors.value.length - 1) {
    guideColorIdx.value++
  } else {
    // 全部完成
    guideMode.value = false
    guideDone.value = new Set()
  }
}

// ---- 弹窗 ----
function openSizeDialog() {
  sizeDialogW.value = gridW.value
  sizeDialogH.value = gridH.value
  showSizeDialog.value = true
}

function applyResize() {
  const nw = Math.max(10, Math.min(300, sizeDialogW.value))
  const nh = Math.max(10, Math.min(300, sizeDialogH.value))
  const newGrid = Array.from({ length: nh }, (_, r) =>
    Array.from({ length: nw }, (_, c) => getCell(r, c))
  )
  gridW.value = nw
  gridH.value = nh
  grid.value = newGrid
  showSizeDialog.value = false
  saveSnapshot()
}

// ---- 选区操作 ----
function deleteSelection() {
  if (!selectionRect.value) return
  const { r1, c1, r2, c2 } = getOrderedRect(selectionRect.value)
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      setCell(r, c, null)
    }
  }
  selectionRect.value = null
  saveSnapshot()
}

function copySelection() {
  if (!selectionRect.value) return
  const { r1, c1, r2, c2 } = getOrderedRect(selectionRect.value)
  const w = c2 - c1 + 1
  const h = r2 - r1 + 1
  const g = Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => {
      const cell = getCell(r1 + r, c1 + c)
      return cell ? { ...cell } : null
    })
  )
  clipboard.value = { grid: g, w, h }
}

function pasteSelection() {
  if (!clipboard.value) return
  // 粘贴到左上角
  for (let r = 0; r < clipboard.value.h; r++) {
    for (let c = 0; c < clipboard.value.w; c++) {
      if (r < gridH.value && c < gridW.value) {
        setCell(r, c, clipboard.value.grid[r][c])
      }
    }
  }
  saveSnapshot()
}

function flipSelectionH() {
  if (!selectionRect.value) return
  const { r1, c1, r2, c2 } = getOrderedRect(selectionRect.value)
  for (let r = r1; r <= r2; r++) {
    for (let c = 0; c < Math.floor((c2 - c1 + 1) / 2); c++) {
      const left = getCell(r, c1 + c)
      const right = getCell(r, c2 - c)
      setCell(r, c1 + c, right)
      setCell(r, c2 - c, left)
    }
  }
  saveSnapshot()
}

function flipSelectionV() {
  if (!selectionRect.value) return
  const { r1, c1, r2, c2 } = getOrderedRect(selectionRect.value)
  for (let c = c1; c <= c2; c++) {
    for (let r = 0; r < Math.floor((r2 - r1 + 1) / 2); r++) {
      const top = getCell(r1 + r, c)
      const bottom = getCell(r2 - r, c)
      setCell(r1 + r, c, bottom)
      setCell(r2 - r, c, top)
    }
  }
  saveSnapshot()
}

function getOrderedRect(rect) {
  return {
    r1: Math.min(rect.r1, rect.r2),
    c1: Math.min(rect.c1, rect.c2),
    r2: Math.max(rect.r1, rect.r2),
    c2: Math.max(rect.c1, rect.c2)
  }
}

export function useEditor() {
  return {
    // 状态
    gridW, gridH, grid, zoom, panX, panY,
    tool, brushSize, curColor, highlightHex,
    symmetryMode, showGrid, showMinorGrid, showMajorGrid,
    refOpacity, refLocked, refPixels, refW, refH, refImage, refOffsetX, refOffsetY, refScale,
    editMode, guideMode, focusMode,
    selectionRect, selectionDragging, clipboard,
    replaceSourceHex,
    guideColorIdx, guideDone, guideColors, guideCurrentColor, guideProgress,
    historyArr, historyIdx,
    beadData, inventory,
    editId, editTitle, hasUnsavedChanges, lastSavedTime, autoSaveKey,
    showInfo, showSizeDialog, sizeDialogW, sizeDialogH,
    showExportMenu, showColorStats,
    colorSearch, recentColors, addRecentColor,
    mousePos, crossCol, crossRow, isDrawing,
    brand, seriesActive,

    // 计算属性
    brands, series, filteredColors,
    beadCount, gridColorStats,
    brandColorCounts, totalColorCount, seriesColorCount,
    brushPreviewStyle,

    // 方法
    initGrid, getCell, setCell, autoFitGrid,
    getSymmetryCells,
    saveSnapshot, undo, redo, restoreSnapshot,
    // 图层
    layers, currentLayerId,
    addLayer, removeLayer, selectLayer,
    toggleLayerVisibility, setLayerOpacity, mergeLayerDown, getCompositeGrid,
    // 对称
    cycleSymmetry,
    cycleRefOpacity, setRefOpacity, toggleRefLock,
    toggleGuideMode, guidePrev, guideNext,
    openSizeDialog, applyResize,
    deleteSelection, copySelection, pasteSelection,
    flipSelectionH, flipSelectionV,
    getOrderedRect,
  }
}
