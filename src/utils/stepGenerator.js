// ============================================================
//  stepGenerator.js — 拼豆制作模式分步数据生成器
//  支持三种分步方式：按颜色 / 按区域 / 按图层
// ============================================================

/**
 * 按颜色分步 — 每种颜色为一个步骤，按用量降序
 * @param {Array<Array<Object|null>>} gridData — 图纸网格数据 [r][c] = {hex, name} | null
 * @param {'desc'|'asc'|'hue'} sort — 排序方式
 * @returns {Array<{hex:string, name:string, count:number, cells:Array<{r:number,c:number}>}>}
 */
export function generateColorSteps(gridData, sort = 'desc') {
  const colorMap = new Map()
  for (let r = 0; r < gridData.length; r++) {
    const row = gridData[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (!cell || !cell.hex) continue
      const key = cell.hex.toUpperCase()
      if (!colorMap.has(key)) {
        colorMap.set(key, {
          hex: cell.hex,
          name: cell.name || cell.hex,
          count: 0,
          cells: [],
        })
      }
      const entry = colorMap.get(key)
      entry.count++
      entry.cells.push({ r, c })
    }
  }

  const steps = Array.from(colorMap.values())

  switch (sort) {
    case 'asc':
      steps.sort((a, b) => a.count - b.count)
      break
    case 'hue':
      steps.sort((a, b) => {
        const ha = hexToHue(a.hex)
        const hb = hexToHue(b.hex)
        return ha - hb
      })
      break
    case 'desc':
    default:
      steps.sort((a, b) => b.count - a.count)
      break
  }

  return steps
}

/**
 * 按区域分步 — 将图纸等分为 N×M 个区块
 * @param {Array<Array<Object|null>>} gridData — 图纸网格数据
 * @param {number} gridW — 图纸宽度
 * @param {number} gridH — 图纸高度
 * @param {number} cols — 区块列数 (2/3/4)
 * @param {number} rows — 区块行数 (2/3/4)
 * @returns {Array<{id:string, label:string, count:number, cells:Array, colorSummary:Array, bounds:Object}>}
 */
export function generateRegionSteps(gridData, gridW, gridH, cols = 3, rows = 3) {
  const blockW = Math.ceil(gridW / cols)
  const blockH = Math.ceil(gridH / rows)
  const steps = []

  for (let br = 0; br < rows; br++) {
    for (let bc = 0; bc < cols; bc++) {
      const rStart = br * blockH
      const rEnd = Math.min((br + 1) * blockH, gridH)
      const cStart = bc * blockW
      const cEnd = Math.min((bc + 1) * blockW, gridW)
      const cells = []
      const colorMap = new Map()

      for (let r = rStart; r < rEnd; r++) {
        const row = gridData[r]
        if (!row) continue
        for (let c = cStart; c < cEnd; c++) {
          const cell = row[c]
          if (!cell || !cell.hex) continue
          cells.push({ r, c, hex: cell.hex, name: cell.name })
          const key = cell.hex.toUpperCase()
          colorMap.set(key, (colorMap.get(key) || 0) + 1)
        }
      }

      if (cells.length > 0) {
        const idx = br * cols + bc + 1
        steps.push({
          id: `region-${br}-${bc}`,
          label: `区域 ${idx}`,
          description: `(${rStart + 1},${cStart + 1}) ~ (${rEnd},${cEnd})`,
          count: cells.length,
          cells,
          colorSummary: Array.from(colorMap.entries())
            .map(([hex, cnt]) => ({ hex, count: cnt }))
            .sort((a, b) => b.count - a.count),
          bounds: { rStart, rEnd, cStart, cEnd },
        })
      }
    }
  }

  return steps
}

/**
 * 按图层分步 — 按图纸图层顺序，无图层数据时按颜色亮度自动分层
 * @param {Array<Array<Object|null>>} gridData — 图纸网格数据
 * @param {Array|null} layerData — 图层数据（可选）
 * @param {number} autoLayerCount — 自动分层时的层数（默认3）
 * @returns {Array<{id:string, label:string, count:number, cells:Array}>}
 */
export function generateLayerSteps(gridData, layerData = null, autoLayerCount = 3) {
  if (layerData && layerData.length > 0) {
    return generateFromExplicitLayers(gridData, layerData)
  }
  return generateAutoLayers(gridData, autoLayerCount)
}

/**
 * 从显式图层数据生成步骤
 */
function generateFromExplicitLayers(gridData, layerData) {
  const steps = []
  for (let i = 0; i < layerData.length; i++) {
    const layer = layerData[i]
    const cells = []
    for (let r = 0; r < gridData.length; r++) {
      const row = gridData[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (!cell || !cell.hex) continue
        if (cell.layer === layer.id || cell.layer === i) {
          cells.push({ r, c, hex: cell.hex, name: cell.name })
        }
      }
    }
    if (cells.length > 0) {
      steps.push({
        id: `layer-${i}`,
        label: layer.name || `图层 ${i + 1}`,
        count: cells.length,
        cells,
      })
    }
  }
  return steps
}

/**
 * 按颜色亮度自动分层
 * 将颜色按感知亮度（加权灰度）分为 N 层
 */
function generateAutoLayers(gridData, layerCount = 3) {
  // 第一步：统计每种颜色的亮度
  const colorMap = new Map()
  for (let r = 0; r < gridData.length; r++) {
    const row = gridData[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (!cell || !cell.hex) continue
      const key = cell.hex.toUpperCase()
      if (!colorMap.has(key)) {
        const lum = hexLuminance(cell.hex)
        colorMap.set(key, {
          hex: cell.hex,
          name: cell.name || cell.hex,
          luminance: lum,
          cells: [],
        })
      }
      colorMap.get(key).cells.push({ r, c, hex: cell.hex, name: cell.name })
    }
  }

  // 第二步：按亮度排序
  const colors = Array.from(colorMap.values()).sort((a, b) => a.luminance - b.luminance)

  // 第三步：均分到 N 层
  const steps = []
  const perLayer = Math.ceil(colors.length / layerCount)
  for (let i = 0; i < layerCount; i++) {
    const slice = colors.slice(i * perLayer, (i + 1) * perLayer)
    if (slice.length === 0) continue
    const cells = slice.flatMap((c) => c.cells)
    steps.push({
      id: `auto-layer-${i}`,
      label: ['浅色层', '中间层', '深色层'][i] || `第 ${i + 1} 层`,
      count: cells.length,
      cells,
    })
  }

  return steps
}

// ========== 颜色工具 ==========

/**
 * 十六进制颜色 → 色相值 (0~360)
 */
function hexToHue(hex) {
  const { r, g, b } = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  let h = 0
  const d = max - min
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return h * 360
}

/**
 * 十六进制颜色 → 感知亮度 (0~255)
 * 使用加权公式：L = 0.299*R + 0.587*G + 0.114*B
 */
function hexLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * 十六进制颜色 → RGB 对象
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/**
 * 从网格数据统计颜色信息
 * @returns {Array<{hex:string, name:string, count:number}>}
 */
export function getColorStats(gridData) {
  const colorMap = new Map()
  for (const row of gridData) {
    if (!row) continue
    for (const cell of row) {
      if (!cell || !cell.hex) continue
      const key = cell.hex.toUpperCase()
      if (!colorMap.has(key)) {
        colorMap.set(key, { hex: cell.hex, name: cell.name || cell.hex, count: 0 })
      }
      colorMap.get(key).count++
    }
  }
  return Array.from(colorMap.values()).sort((a, b) => b.count - a.count)
}
