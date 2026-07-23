// ============================================
//  styleTransfer — AI 风格迁移与图案增强（轻量版）
//  图案简化 + 轮廓增强 + 无缝平铺
// ============================================
import { hexToRgb } from '../utils/colorSpace.js'

/**
 * K-Means 颜色聚类 + 图案简化
 * 减少图案中的颜色数量，生成简洁版本
 */
export function simplifyPattern(grid, targetColors = 8) {
  // 收集所有出现的颜色
  const colorMap = new Map()
  for (const row of grid) {
    if (!row) continue
    for (const cell of row) {
      if (!cell?.hex) continue
      const key = cell.hex.toUpperCase()
      if (!colorMap.has(key)) colorMap.set(key, { hex: cell.hex, name: cell.name, count: 0 })
      colorMap.get(key).count++
    }
  }

  const allColors = [...colorMap.values()].sort((a, b) => b.count - a.count)

  // 如果颜色已经少于目标，不需要简化
  if (allColors.length <= targetColors) return grid

  // 保留 top N 颜色，其余映射到最接近的保留色
  const keepColors = allColors.slice(0, targetColors)
  const keepHexes = new Set(keepColors.map((c) => c.hex.toUpperCase()))

  const result = grid.map((row) => {
    if (!row) return row
    return row.map((cell) => {
      if (!cell?.hex || keepHexes.has(cell.hex.toUpperCase())) return cell
      // 找最接近的保留颜色
      let best = keepColors[0],
        bestDist = Infinity
      for (const kc of keepColors) {
        const d = hexDist(cell.hex, kc.hex)
        if (d < bestDist) {
          bestDist = d
          best = kc
        }
      }
      return { hex: best.hex, name: best.name || cell.name, brand: cell.brand, series: cell.series }
    })
  })

  return result
}

/**
 * 轮廓增强：加深相邻不同色珠子的边界
 */
export function enhanceEdges(grid) {
  const h = grid.length
  const w = grid[0]?.length || 0
  const result = grid.map((row) => (row ? [...row] : row))

  for (let r = 0; r < h; r++) {
    if (!result[r]) continue
    for (let c = 0; c < w; c++) {
      const cell = result[r][c]
      if (!cell?.hex) continue

      // 检查四邻域
      let isEdge = false
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nr = r + dr,
          nc = c + dc
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue
        const neighbor = grid[nr]?.[nc]
        if (neighbor?.hex && neighbor.hex.toUpperCase() !== cell.hex.toUpperCase()) {
          isEdge = true
          break
        }
      }

      // 边缘像素加深 15%
      if (isEdge) {
        const darker = darkenHex(cell.hex, 0.85)
        result[r][c] = { ...cell, hex: darker }
      }
    }
  }

  return result
}

/**
 * 无缝平铺：镜像边缘 + 边界融合
 */
export function makeTileable(grid) {
  const h = grid.length
  const w = grid[0]?.length || 0
  const result = grid.map((row) => (row ? [...row] : row))

  // 四边镜像填充，创建过渡区
  const blendWidth = Math.max(1, Math.floor(Math.min(w, h) * 0.05))

  for (let i = 0; i < blendWidth; i++) {
    // 左边界 ← 右边界
    for (let r = 0; r < h; r++) {
      const src = result[r]?.[w - 1 - i]
      if (src && !result[r][i]) result[r][i] = { ...src }
      const dst = result[r]?.[i]
      if (dst && !result[r][w - 1 - i]) result[r][w - 1 - i] = { ...dst }
    }
    // 上边界 ← 下边界
    for (let c = 0; c < w; c++) {
      const src = result[h - 1 - i]?.[c]
      if (src && !result[i][c]) result[i][c] = { ...src }
      const dst = result[i]?.[c]
      if (dst && !result[h - 1 - i][c]) result[h - 1 - i][c] = { ...dst }
    }
  }

  return result
}

/**
 * 像素风格转换
 * @param {string} style - '8bit'|'minecraft'|'vintage'|'neon'
 */
export function applyPixelStyle(grid, style = '8bit') {
  const h = grid.length
  const w = grid[0]?.length || 0
  const result = grid.map((row) => (row ? [...row] : row))

  for (let r = 0; r < h; r++) {
    if (!result[r]) continue
    for (let c = 0; c < w; c++) {
      const cell = result[r][c]
      if (!cell?.hex) continue

      let newHex = cell.hex
      switch (style) {
        case '8bit':
          newHex = posterizeColor(cell.hex, 4) // 4-bit 色彩
          break
        case 'minecraft':
          newHex = quantizeToMinecraft(cell.hex)
          break
        case 'vintage':
          newHex = applyVintage(cell.hex)
          break
        case 'neon':
          newHex = applyNeon(cell.hex)
          break
      }
      if (newHex !== cell.hex) {
        result[r][c] = { ...cell, hex: newHex }
      }
    }
  }

  return result
}

/**
 * Posterize: 量化颜色通道为 n 级
 */
function posterizeColor(hex, levels) {
  const { r, g, b } = hexToRgb(hex)
  const step = 256 / levels
  return (
    '#' +
    [
      Math.round(Math.round(r / step) * step),
      Math.round(Math.round(g / step) * step),
      Math.round(Math.round(b / step) * step),
    ]
      .map((v) => Math.min(255, v).toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * Minecraft 风格：像素色块化
 */
function quantizeToMinecraft(hex) {
  const mcPalette = [
    '#FFFFFF',
    '#D4A574',
    '#8B4513',
    '#2C3E50',
    '#27AE60',
    '#1E8449',
    '#15803D',
    '#45AAF2',
    '#3498DB',
    '#2980B9',
    '#A55EEA',
    '#8E44AD',
    '#FF4757',
    '#E74C3C',
    '#C0392B',
    '#FFA502',
    '#FFD700',
    '#F39C12',
    '#1ABC9C',
    '#16A085',
  ]
  return findClosest(hex, mcPalette)
}

function applyVintage(hex) {
  const { r, g, b } = hexToRgb(hex)
  // 降低饱和度 + 暖色调
  const gray = r * 0.299 + g * 0.587 + b * 0.114
  return (
    '#' +
    [
      Math.round(r * 0.7 + gray * 0.3 + 20),
      Math.round(g * 0.7 + gray * 0.3 + 10),
      Math.round(b * 0.7 + gray * 0.3),
    ]
      .map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
      .join('')
  )
}

function applyNeon(hex) {
  const { r, g, b } = hexToRgb(hex)
  // 高饱和度 + 发光感
  return (
    '#' +
    [
      Math.round(Math.min(255, r * 1.3 + 30)),
      Math.round(Math.min(255, g * 1.3 + 30)),
      Math.round(Math.min(255, b * 1.3 + 30)),
    ]
      .map((v) => Math.min(255, v).toString(16).padStart(2, '0'))
      .join('')
  )
}

// ---- 工具函数 ----

// hexToRgb 已迁移到 server/utils/colorSpace.js

function hexDist(h1, h2) {
  const c1 = hexToRgb(h1),
    c2 = hexToRgb(h2)
  return Math.sqrt((c1.r - c2.r) ** 2 * 2 + (c1.g - c2.g) ** 2 * 3 + (c1.b - c2.b) ** 2)
}

function findClosest(hex, palette) {
  let best = palette[0],
    bestDist = Infinity
  for (const p of palette) {
    const d = hexDist(hex, p)
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return best
}

function darkenHex(hex, factor) {
  const { r, g, b } = hexToRgb(hex)
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(v * factor)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}
