// ============================================
//  useEditor — 拼豆编辑器核心状态管理
//  提取自 EditorView.vue，供所有编辑器子组件共享
//  ohmybead.cn 风格
// ============================================
import { ref, computed, reactive } from 'vue'

// ---- 单例状态（模块级，全局共享） ----
const gridW = ref(50)
const gridH = ref(50)
const grid = ref([]) // 当前活动层的 grid（兼容旧代码）
const layers = ref([]) // [{id, name, visible, opacity, blendMode, grid}]
const currentLayerId = ref(null)
const zoom = ref(10)
const panX = ref(0)
const panY = ref(0)
const tool = ref('brush') // 'brush'|'eraser'|'fill'|'picker'|'select'|'replace'|'move'|'wand'|'lasso'

// 16 种图层混合模式（文档 5.2）
const BLEND_MODES = [
  { id: 'normal', label: '正常' },
  { id: 'multiply', label: '正片叠底' },
  { id: 'screen', label: '滤色' },
  { id: 'overlay', label: '叠加' },
  { id: 'darken', label: '变暗' },
  { id: 'lighten', label: '变亮' },
  { id: 'color-dodge', label: '颜色减淡' },
  { id: 'color-burn', label: '颜色加深' },
  { id: 'hard-light', label: '强光' },
  { id: 'soft-light', label: '柔光' },
  { id: 'difference', label: '差值' },
  { id: 'exclusion', label: '排除' },
  { id: 'hue', label: '色相' },
  { id: 'saturation', label: '饱和度' },
  { id: 'color', label: '颜色' },
  { id: 'luminosity', label: '明度' },
]
const brushSize = ref(1)
const curColor = ref(null) // {name, hex, brand, series, id}
const highlightHex = ref(null) // 同色高亮的颜色 hex
const symmetryMode = ref('none') // 'none'|'h'|'v'|'quad'
const showGrid = ref(true)
const showMinorGrid = ref(true) // 细网格（每格）
const showMajorGrid = ref(true) // 粗网格（每10格）
const refOpacity = ref(0)
const refLocked = ref(false)
const editMode = ref(true) // true=编辑, false=预览
const guideMode = ref(false)
const focusMode = ref(false) // 专注模式
const maskEditMode = ref(false) // 蒙版编辑模式

// 参考图数据
const refPixels = ref(null) // ImageData 或像素数组
const refW = ref(0)
const refH = ref(0)
const refImage = ref(null) // 原始参考图 URL
const refOffsetX = ref(0) // 参考图水平偏移（网格单位）
const refOffsetY = ref(0) // 参考图垂直偏移
const refScale = ref(1) // 参考图缩放

// 选区工具
const selectionRect = ref(null) // {r1, c1, r2, c2}
const selectionDragging = ref(false)
const selectionMode = ref('new') // 'new'|'add'|'subtract'|'intersect' 选区模式
const clipboard = ref(null) // {grid, w, h}

// 颜色搜索和最近使用
const colorSearch = ref('')
const codeOnly = ref(true) // 默认仅显示有编号色卡
const recentColors = ref([]) // 最近使用的颜色 [{name, hex, brand, series}]
const MAX_RECENT = 12

function addRecentColor(color) {
  if (!color?.hex) return
  const key = color.id ?? color.hex
  recentColors.value = [
    { ...color },
    ...recentColors.value.filter((c) => (c.id ?? c.hex) !== key),
  ].slice(0, MAX_RECENT)
}

// 替换工具
const replaceSourceHex = ref(null)

// 施工引导
const guideColorIdx = ref(0)
const guideDone = ref(new Set())
const guideAutoPlay = ref(false)
const guideSpeed = ref(3) // 秒/步，1-10
const guideGroupBy = ref('color') // 'color'|'region'|'layer'
const guideRegionSize = ref(10) // 区域分组时的区域大小（格）
let guideTimer = null

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
const beadData = ref([]) // 从服务器加载的颜色列表
const inventory = ref({}) // color_id -> quantity
const warehouseOnly = ref(false) // 仅显示豆仓已有颜色

// 保存状态
const editId = ref(null)
const editTitle = ref('未命名图纸')
const hasUnsavedChanges = ref(false)
const lastSavedTime = ref(null)
const autoSaveKey = 'douding_autosave_v2'

// 弹窗状态
const showInfo = ref(false)
const showSizeDialog = ref(false)
const sizeDialogW = ref(50)
const sizeDialogH = ref(50)
const showExportMenu = ref(false)
const showColorStats = ref(false)

// 指针状态
const mousePos = ref({ x: -100, y: -100 })
const crossCol = ref(-1)
const crossRow = ref(-1)
const isDrawing = ref(false)

// 指针状态（画布坐标，给状态栏用）
const mouseCol = ref(-1)
const mouseRow = ref(-1)
const mouseColor = computed(() => {
  if (mouseRow.value < 0 || mouseCol.value < 0) return null
  const comp = getCompositeGrid()
  return comp[mouseRow.value]?.[mouseCol.value] || null
})

// 右侧面板
const activePanelTab = ref('color') // 'color'|'layer'|'swatch'|'history'|'properties'

// 模式标签
const modeLabel = computed(() => {
  if (guideMode.value) return '施工引导模式'
  if (focusMode.value) return '专注模式'
  return '编辑模式'
})

// 品牌/系列筛选
const brand = ref('全部')
const seriesActive = ref('')

// ---- 计算属性 ----
const brands = computed(() => ['全部', ...new Set(beadData.value.map((c) => c.brand))])

const series = computed(() => {
  if (brand.value === '全部') {
    return [...new Set(beadData.value.map((c) => c.brand + ' · ' + c.series))]
  }
  return [...new Set(beadData.value.filter((c) => c.brand === brand.value).map((c) => c.series))]
})

const filteredColors = computed(() => {
  let result = beadData.value

  // 品牌/系列筛选
  if (brand.value === '全部') {
    const s = seriesActive.value
    if (s) {
      const [b, sn] = s.split(' · ')
      result = result.filter((c) => c.brand === b && c.series === sn)
    }
  } else {
    result = result.filter((c) => c.brand === brand.value)
    if (seriesActive.value) result = result.filter((c) => c.series === seriesActive.value)
  }

  // 颜色搜索
  if (colorSearch.value.trim()) {
    const q = colorSearch.value.trim().toLowerCase()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.hex.toLowerCase().includes(q) ||
        (c.brand && c.brand.toLowerCase().includes(q))
    )
  }

  // 仅显示有编号的色卡（名称中包含数字，如 S01、H01、M-01）
  if (codeOnly.value) {
    result = result.filter((c) => /\d/.test(c.name))
  }

  // 豆仓限定：仅显示库存中有的颜色
  if (warehouseOnly.value && Object.keys(inventory.value).length > 0) {
    result = result.filter((c) => inventory.value[c.id] > 0)
  }

  return result
})

const beadCount = computed(() => {
  let n = 0
  const comp = getCompositeGrid()
  for (const r of comp) if (r) for (const c of r) if (c?.hex) n++
  return n
})

const gridColorStats = computed(() => {
  const map = new Map()
  const comp = getCompositeGrid()
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const cell = comp[r]?.[c]
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
    width: `${size}px`,
    height: `${size}px`,
    left: `${mousePos.value.x - size / 2}px`,
    top: `${mousePos.value.y - size / 2}px`,
  }
})

// ---- 网格操作方法 ----
/** 新建/进入编辑器时重置镜像、参考图等会话状态 */
function resetEditorSession() {
  symmetryMode.value = 'none'
  refPixels.value = null
  refOpacity.value = 0
  refImage.value = null
  refOffsetX.value = 0
  refOffsetY.value = 0
  refScale.value = 1
  highlightHex.value = null
  replaceSourceHex.value = null
  guideMode.value = false
}

function initGrid(w, h) {
  gridW.value = w
  gridH.value = h
  const newGrid = Array.from({ length: h }, () => Array(w).fill(null))
  grid.value = newGrid
  layers.value = [
    { id: 'l1', name: '图层 1', visible: true, opacity: 1, blendMode: 'normal', grid: newGrid },
  ]
  currentLayerId.value = 'l1'
}

// 动态扩展画布：画笔超出边界时自动扩大
// padding: { top, bottom, left, right } — 每边需要增加的格数
// 返回 { offsetC, offsetR } — 旧内容在新网格中的偏移量
function expandGridToFit(padding) {
  const MAX_SIZE = 300
  const top = padding.top || 0
  const bottom = padding.bottom || 0
  const left = padding.left || 0
  const right = padding.right || 0

  const newW = Math.min(MAX_SIZE, gridW.value + left + right)
  const newH = Math.min(MAX_SIZE, gridH.value + top + bottom)

  // 已达上限则不再扩展
  if (newW === gridW.value && newH === gridH.value) return { offsetC: 0, offsetR: 0 }

  // 实际扩展量（可能因上限被截断）
  const actualLeft = newW - gridW.value - right
  const actualTop = newH - gridH.value - bottom

  // 创建新网格，将旧内容偏移到正确位置
  const shiftGrid = (oldGrid) => {
    const newGrid = Array.from({ length: newH }, () => Array(newW).fill(null))
    for (let r = 0; r < gridH.value; r++) {
      const oldRow = oldGrid[r]
      if (!oldRow) continue
      for (let c = 0; c < gridW.value; c++) {
        if (oldRow[c]) {
          newGrid[r + actualTop][c + actualLeft] = { ...oldRow[c] }
        }
      }
    }
    return newGrid
  }

  // 更新所有图层
  for (const layer of layers.value) {
    layer.grid = shiftGrid(layer.grid)
  }

  // 更新当前活动层引用
  const curLayer = layers.value.find((l) => l.id === currentLayerId.value)
  if (curLayer) grid.value = curLayer.grid

  gridW.value = newW
  gridH.value = newH

  return { offsetC: actualLeft, offsetR: actualTop }
}

// 根据内容自动扩展画布尺寸
function autoFitGrid(padding = 4) {
  let minR = gridH.value,
    maxR = 0,
    minC = gridW.value,
    maxC = 0
  const comp = getCompositeGrid()
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      if (comp[r]?.[c]?.hex) {
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
      }
    }
  }
  if (maxR < minR) return // 空画布

  const newW = Math.max(10, maxC - minC + 1 + padding * 2)
  const newH = Math.max(10, maxR - minR + 1 + padding * 2)

  if (newW === gridW.value && newH === gridH.value) return false

  // 对每个图层分别执行裁剪/扩展，保留所有图层数据
  for (const layer of layers.value) {
    const newGrid = Array.from({ length: newH }, () => Array(newW).fill(null))
    for (let r = 0; r < newH; r++) {
      for (let c = 0; c < newW; c++) {
        const srcR = r - padding + minR,
          srcC = c - padding + minC
        if (srcR >= 0 && srcR < gridH.value && srcC >= 0 && srcC < gridW.value) {
          newGrid[r][c] = layer.grid[srcR]?.[srcC] ? { ...layer.grid[srcR][srcC] } : null
        }
      }
    }
    layer.grid = newGrid
  }

  gridW.value = newW
  gridH.value = newH
  // 更新当前活动层的 grid 引用
  const curLayer = layers.value.find((l) => l.id === currentLayerId.value)
  if (curLayer) grid.value = curLayer.grid
  return true
}

// ---- 图层管理 ----
function addLayer(name) {
  const id = 'l' + Date.now()
  const newGrid = Array.from({ length: gridH.value }, () => Array(gridW.value).fill(null))
  layers.value.push({
    id,
    name: name || `图层 ${layers.value.length + 1}`,
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    grid: newGrid,
  })
  currentLayerId.value = id
  grid.value = newGrid
  saveSnapshot()
}

function removeLayer(id) {
  if (layers.value.length <= 1) return
  const idx = layers.value.findIndex((l) => l.id === id)
  if (idx < 0) return
  layers.value.splice(idx, 1)
  const newIdx = Math.min(idx, layers.value.length - 1)
  currentLayerId.value = layers.value[newIdx].id
  grid.value = layers.value[newIdx].grid
  saveSnapshot()
}

function selectLayer(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  // 切换图层前保存当前状态，使切换操作可撤销
  if (currentLayerId.value !== id) saveSnapshot()
  currentLayerId.value = id
  grid.value = layer.grid
}

function toggleLayerVisibility(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (layer) {
    layer.visible = !layer.visible
    saveSnapshot()
  }
}

function setLayerOpacity(id, opacity) {
  const layer = layers.value.find((l) => l.id === id)
  if (layer) {
    layer.opacity = Math.max(0, Math.min(1, opacity))
    saveSnapshot()
  }
}

function setLayerBlendMode(id, mode) {
  const layer = layers.value.find((l) => l.id === id)
  if (layer) {
    layer.blendMode = mode
    saveSnapshot()
  }
}

// ---- 蒙版管理 ----
function addMask(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer || layer.mask) return
  layer.mask = new Uint8Array(gridW.value * gridH.value).fill(255) // 全白 = 全部可见
  layer.maskEnabled = true
  saveSnapshot()
}

function removeMask(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer || !layer.mask) return
  delete layer.mask
  delete layer.maskEnabled
  maskEditMode.value = false
  saveSnapshot()
}

function applyMask(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer || !layer.mask) return
  // 将蒙版应用到像素：mask < 128 的格子清空
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      const m = layer.mask[r * gridW.value + c]
      if (m < 128) layer.grid[r][c] = null
    }
  }
  delete layer.mask
  delete layer.maskEnabled
  maskEditMode.value = false
  if (currentLayerId.value === id) grid.value = layer.grid
  saveSnapshot()
}

function toggleMaskEnabled(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer || !layer.mask) return
  layer.maskEnabled = !layer.maskEnabled
  saveSnapshot()
}

function setMaskCell(id, r, c, value) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer?.mask) return
  if (r < 0 || r >= gridH.value || c < 0 || c >= gridW.value) return
  layer.mask[r * gridW.value + c] = Math.max(0, Math.min(255, value))
}

/** 获取蒙版灰度色（用于渲染预览） */
function getMaskHex(value) {
  const v = Math.round((value / 255) * 100)
  return `rgba(0,0,0,${(100 - v) / 100})` // 白=透明，黑=不透明
}

function mergeLayerDown(id) {
  const idx = layers.value.findIndex((l) => l.id === id)
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

// ---- 图层分组 ----
function createGroup(layerIds, name) {
  const groupId = 'g' + Date.now()
  const children = layers.value.filter((l) => layerIds.includes(l.id))
  const other = layers.value.filter((l) => !layerIds.includes(l.id))

  // 找到第一个分组图层的位置
  const firstIdx = layers.value.findIndex((l) => l.id === layerIds[0])
  layers.value = [
    ...other.slice(0, firstIdx),
    { id: groupId, name: name || '分组', type: 'group', visible: true, children },
    ...other.slice(firstIdx),
  ]
  saveSnapshot()
}

function ungroup(groupId) {
  const idx = layers.value.findIndex((l) => l.id === groupId)
  if (idx < 0 || layers.value[idx].type !== 'group') return
  const group = layers.value[idx]
  layers.value = [
    ...layers.value.slice(0, idx),
    ...(group.children || []),
    ...layers.value.slice(idx + 1),
  ]
  saveSnapshot()
}

// ---- 图层对齐（基于内容包围盒） ----
function getLayerBounds(layer) {
  const g = layer.grid || layer._grid
  let minR = Infinity,
    maxR = -Infinity,
    minC = Infinity,
    maxC = -Infinity
  for (let r = 0; r < gridH.value; r++) {
    for (let c = 0; c < gridW.value; c++) {
      if (g[r]?.[c]) {
        minR = Math.min(minR, r)
        maxR = Math.max(maxR, r)
        minC = Math.min(minC, c)
        maxC = Math.max(maxC, c)
      }
    }
  }
  return minR === Infinity ? { minR: 0, maxR: 0, minC: 0, maxC: 0 } : { minR, maxR, minC, maxC }
}

function alignLayers(layerIds, align) {
  if (layerIds.length < 2) return
  const bounds = layerIds.map((id) => ({
    id,
    ...getLayerBounds(layers.value.find((l) => l.id === id)),
  }))

  // 以第一个图层为基准
  const ref = bounds[0]

  for (let i = 1; i < bounds.length; i++) {
    const b = bounds[i]
    const layer = layers.value.find((l) => l.id === b.id)
    if (!layer) continue
    const dy = b.maxR - b.minR,
      dx = b.maxC - b.minC

    let targetR = b.minR,
      targetC = b.minC
    switch (align) {
      case 'left':
        targetC = ref.minC
        break
      case 'center':
        targetC = ref.minC + (ref.maxC - ref.minC - dx) / 2
        break
      case 'right':
        targetC = ref.maxC - dx
        break
      case 'top':
        targetR = ref.minR
        break
      case 'middle':
        targetR = ref.minR + (ref.maxR - ref.minR - dy) / 2
        break
      case 'bottom':
        targetR = ref.maxR - dy
        break
    }

    const dR = Math.round(targetR - b.minR)
    const dC = Math.round(targetC - b.minC)

    if (dR !== 0 || dC !== 0) {
      // 移动图层内容
      const newGrid = Array.from({ length: gridH.value }, () => Array(gridW.value).fill(null))
      for (let r = 0; r < gridH.value; r++) {
        for (let c = 0; c < gridW.value; c++) {
          const sr = r - dR,
            sc = c - dC
          if (sr >= 0 && sr < gridH.value && sc >= 0 && sc < gridW.value) {
            newGrid[r][c] = layer.grid[sr]?.[sc] || null
          }
        }
      }
      layer.grid = newGrid
      if (layer.id === currentLayerId.value) grid.value = newGrid
    }
  }
  saveSnapshot()
}

// ---- 图层样式 ----
function setLayerStyle(id, style) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  layer.style = { ...layer.style, ...style }
  saveSnapshot()
}

function removeLayerStyle(id) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  delete layer.style
  saveSnapshot()
}
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
    grid: grid.value.map((r) => (r ? r.map((c) => (c ? { ...c } : null)) : [])),
    layers: layers.value.map((l) => ({
      ...l,
      grid: l.grid.map((r) => (r ? r.map((c) => (c ? { ...c } : null)) : [])),
    })),
    currentLayerId: currentLayerId.value,
    w: gridW.value,
    h: gridH.value,
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
  grid.value = snapshot.grid.map((r) => (r ? r.map((c) => (c ? { ...c } : null)) : []))
  if (snapshot.layers) {
    layers.value = snapshot.layers.map((l) => ({
      ...l,
      grid: l.grid.map((r) => (r ? r.map((c) => (c ? { ...c } : null)) : [])),
    }))
    currentLayerId.value = snapshot.currentLayerId || layers.value[0]?.id
  }
  // 关键：重新连接 grid 引用到活动图层的 grid，避免引用分离导致编辑丢失
  const activeLayer = layers.value.find((l) => l.id === currentLayerId.value)
  if (activeLayer) grid.value = activeLayer.grid
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
    stopAutoPlay()
  } else {
    stopAutoPlay()
  }
}

function guidePrev() {
  stopAutoPlay()
  if (guideColorIdx.value > 0) guideColorIdx.value--
}

function guideNext() {
  stopAutoPlay()
  guideDone.value.add(guideColorIdx.value)
  if (guideColorIdx.value < guideColors.value.length - 1) {
    guideColorIdx.value++
  } else {
    guideMode.value = false
    guideDone.value = new Set()
  }
}

function guideJumpTo(idx) {
  if (idx >= 0 && idx < guideColors.value.length) {
    guideColorIdx.value = idx
    stopAutoPlay()
  }
}

function toggleAutoPlay() {
  guideAutoPlay.value = !guideAutoPlay.value
  if (guideAutoPlay.value) _startAutoPlay()
  else stopAutoPlay()
}

function _startAutoPlay() {
  stopAutoPlay()
  if (!guideAutoPlay.value) return
  guideTimer = setInterval(() => {
    if (!guideMode.value || !guideAutoPlay.value) {
      stopAutoPlay()
      return
    }
    guideDone.value.add(guideColorIdx.value)
    if (guideColorIdx.value < guideColors.value.length - 1) {
      guideColorIdx.value++
    } else {
      guideMode.value = false
      stopAutoPlay()
    }
  }, guideSpeed.value * 1000)
}

function stopAutoPlay() {
  guideAutoPlay.value = false
  if (guideTimer) {
    clearInterval(guideTimer)
    guideTimer = null
  }
}

function setGuideSpeed(speed) {
  guideSpeed.value = Math.max(1, Math.min(10, speed))
  if (guideAutoPlay.value) _startAutoPlay()
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
  const oldW = gridW.value,
    oldH = gridH.value

  // 对所有图层统一调整尺寸，避免切换图层时维度不匹配导致渲染崩溃
  for (const layer of layers.value) {
    const newGrid = Array.from({ length: nh }, (_, r) =>
      Array.from({ length: nw }, (_, c) =>
        r < oldH && c < oldW && layer.grid[r]?.[c] ? { ...layer.grid[r][c] } : null
      )
    )
    layer.grid = newGrid
  }

  gridW.value = nw
  gridH.value = nh
  // 重新连接活动图层引用
  const activeLayer = layers.value.find((l) => l.id === currentLayerId.value)
  if (activeLayer) grid.value = activeLayer.grid
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

// ==================== 魔棒选区（BFS 泛洪 + 容差） ====================
// 容差下颜色相似判断（RGB 欧几里得距离）
function _colorsMatch(hex1, hex2, tolerance) {
  if (!hex1 || !hex2) return !hex1 && !hex2
  if (hex1 === hex2) return true
  if (tolerance <= 0) return false
  const r1 = parseInt(hex1.slice(1, 3), 16),
    g1 = parseInt(hex1.slice(3, 5), 16),
    b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16),
    g2 = parseInt(hex2.slice(3, 5), 16),
    b2 = parseInt(hex2.slice(5, 7), 16)
  const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
  return dist <= tolerance * 4.5 // tolerance 0-100 → 0-450 RGB 距离
}

/** 魔棒选区：BFS 四连通区域选择 */
function magicWandSelect(r, c, tolerance = 0) {
  const sourceCell = getCell(r, c)
  const sourceHex = sourceCell?.hex || null
  const visited = new Set()
  const queue = [[r, c]]
  visited.add(`${r},${c}`)

  let minR = r,
    maxR = r,
    minC = c,
    maxC = c

  while (queue.length) {
    const [cr, cc] = queue.shift()
    for (const [nr, nc] of [
      [cr - 1, cc],
      [cr + 1, cc],
      [cr, cc - 1],
      [cr, cc + 1],
    ]) {
      if (nr < 0 || nr >= gridH.value || nc < 0 || nc >= gridW.value) continue
      const key = `${nr},${nc}`
      if (visited.has(key)) continue
      const cell = getCell(nr, nc)
      const cellHex = cell?.hex || null
      if (_colorsMatch(sourceHex, cellHex, tolerance)) {
        visited.add(key)
        queue.push([nr, nc])
        if (nr < minR) minR = nr
        if (nr > maxR) maxR = nr
        if (nc < minC) minC = nc
        if (nc > maxC) maxC = nc
      }
    }
  }

  const newRect = { r1: minR, c1: minC, r2: maxR, c2: maxC }

  // 选区模式处理
  if (selectionMode.value === 'add' && selectionRect.value) {
    const old = getOrderedRect(selectionRect.value)
    newRect.r1 = Math.min(old.r1, newRect.r1)
    newRect.c1 = Math.min(old.c1, newRect.c1)
    newRect.r2 = Math.max(old.r2, newRect.r2)
    newRect.c2 = Math.max(old.c2, newRect.c2)
  } else if (selectionMode.value === 'subtract') {
    // 简化：直接清空选区
    selectionRect.value = null
    return
  }

  selectionRect.value = newRect
}

/** 自由选区（套索）：接收路径点列表，计算包围盒 */
function lassoSelect(points) {
  if (!points || points.length < 3) return
  let minR = Infinity,
    maxR = -Infinity,
    minC = Infinity,
    maxC = -Infinity
  for (const { r, c } of points) {
    if (r < minR) minR = r
    if (r > maxR) maxR = r
    if (c < minC) minC = c
    if (c > maxC) maxC = c
  }
  selectionRect.value = { r1: minR, c1: minC, r2: maxR, c2: maxC }
}

/** 循环选区模式 */
function cycleSelectionMode() {
  const modes = ['new', 'add', 'subtract']
  const idx = modes.indexOf(selectionMode.value)
  selectionMode.value = modes[(idx + 1) % modes.length]
}

function getOrderedRect(rect) {
  return {
    r1: Math.min(rect.r1, rect.r2),
    c1: Math.min(rect.c1, rect.c2),
    r2: Math.max(rect.r1, rect.r2),
    c2: Math.max(rect.c1, rect.c2),
  }
}

export function useEditor() {
  return {
    // 状态
    gridW,
    gridH,
    grid,
    zoom,
    panX,
    panY,
    tool,
    brushSize,
    curColor,
    highlightHex,
    symmetryMode,
    showGrid,
    showMinorGrid,
    showMajorGrid,
    refOpacity,
    refLocked,
    refPixels,
    refW,
    refH,
    refImage,
    refOffsetX,
    refOffsetY,
    refScale,
    editMode,
    guideMode,
    focusMode,
    maskEditMode,
    selectionRect,
    selectionDragging,
    selectionMode,
    clipboard,
    replaceSourceHex,
    guideColorIdx,
    guideDone,
    guideColors,
    guideCurrentColor,
    guideProgress,
    guideAutoPlay,
    guideSpeed,
    guideGroupBy,
    guideJumpTo,
    toggleAutoPlay,
    stopAutoPlay,
    setGuideSpeed,
    historyArr,
    historyIdx,
    beadData,
    inventory,
    warehouseOnly,
    editId,
    editTitle,
    hasUnsavedChanges,
    lastSavedTime,
    autoSaveKey,
    showInfo,
    showSizeDialog,
    sizeDialogW,
    sizeDialogH,
    showExportMenu,
    showColorStats,
    colorSearch,
    recentColors,
    addRecentColor,
    codeOnly,
    mousePos,
    crossCol,
    crossRow,
    isDrawing,
    mouseCol,
    mouseRow,
    mouseColor,
    activePanelTab,
    modeLabel,
    brand,
    seriesActive,

    // 计算属性
    brands,
    series,
    filteredColors,
    beadCount,
    gridColorStats,
    brandColorCounts,
    totalColorCount,
    seriesColorCount,
    brushPreviewStyle,

    // 方法
    initGrid,
    resetEditorSession,
    getCell,
    setCell,
    autoFitGrid,
    expandGridToFit,
    getSymmetryCells,
    saveSnapshot,
    undo,
    redo,
    restoreSnapshot,
    // 图层
    layers,
    currentLayerId,
    BLEND_MODES,
    addLayer,
    removeLayer,
    selectLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    setLayerBlendMode,
    mergeLayerDown,
    getCompositeGrid,
    // 蒙版
    addMask,
    removeMask,
    applyMask,
    toggleMaskEnabled,
    setMaskCell,
    getMaskHex,
    // 分组/对齐/样式
    createGroup,
    ungroup,
    alignLayers,
    setLayerStyle,
    removeLayerStyle,
    // 对称
    cycleSymmetry,
    cycleRefOpacity,
    setRefOpacity,
    toggleRefLock,
    toggleGuideMode,
    guidePrev,
    guideNext,
    openSizeDialog,
    applyResize,
    deleteSelection,
    copySelection,
    pasteSelection,
    flipSelectionH,
    flipSelectionV,
    magicWandSelect,
    lassoSelect,
    cycleSelectionMode,
    getOrderedRect,
  }
}
