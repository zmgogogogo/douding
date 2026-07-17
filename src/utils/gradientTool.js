/**
 * 渐变工具 — 线性/径向/角度渐变，自动量化到色板
 */

/**
 * 生成渐变色阶
 * @param {string} hex1 起始颜色
 * @param {string} hex2 结束颜色
 * @param {number} steps 色阶数
 * @returns {string[]} hex 数组
 */
function generateColorStops(hex1, hex2, steps) {
  const r1 = parseInt(hex1.slice(1, 3), 16)
  const g1 = parseInt(hex1.slice(3, 5), 16)
  const b1 = parseInt(hex1.slice(5, 7), 16)
  const r2 = parseInt(hex2.slice(1, 3), 16)
  const g2 = parseInt(hex2.slice(3, 5), 16)
  const b2 = parseInt(hex2.slice(5, 7), 16)

  const stops = []
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0.5 : i / (steps - 1)
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    stops.push('#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''))
  }
  return stops
}

/**
 * 查找色板中最近的颜色
 * @param {string} hex
 * @param {Array<{hex:string}>} beadColors
 * @returns {string} 最近颜色 hex
 */
function nearestBeadColor(hex, beadColors) {
  const r1 = parseInt(hex.slice(1, 3), 16)
  const g1 = parseInt(hex.slice(3, 5), 16)
  const b1 = parseInt(hex.slice(5, 7), 16)

  let bestHex = hex
  let bestDist = Infinity
  for (const bc of beadColors) {
    const r2 = parseInt(bc.hex.slice(1, 3), 16)
    const g2 = parseInt(bc.hex.slice(3, 5), 16)
    const b2 = parseInt(bc.hex.slice(5, 7), 16)
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2
    const dist = dr * dr * 2 + dg * dg * 3 + db * db * 1 // 人眼绿色敏感度加权
    if (dist < bestDist) { bestDist = dist; bestHex = bc.hex }
  }
  return bestHex
}

/**
 * 线性渐变
 * @param {number} r1 起始行
 * @param {number} c1 起始列
 * @param {number} r2 结束行
 * @param {number} c2 结束列
 * @param {string} hex1 起始颜色
 * @param {string} hex2 结束颜色
 * @param {number} levels 色阶数 2-32
 * @param {Array<{hex:string}>} beadColors 珠子颜色列表
 * @param {number} gridW 画布宽度
 * @param {number} gridH 画布高度
 * @returns {Array<{r:number, c:number, hex:string}>}
 */
export function linearGradient(r1, c1, r2, c2, hex1, hex2, levels, beadColors, gridW, gridH) {
  const stops = generateColorStops(hex1, hex2, levels)
  const cells = []

  if (r1 === r2 && c1 === c2) {
    // 单点退化：全画布均匀填充
    const hex = nearestBeadColor(stops[0], beadColors)
    for (let r = 0; r < gridH; r++)
      for (let c = 0; c < gridW; c++)
        cells.push({ r, c, hex })
    return cells
  }

  // 投影距离范围
  const dx = c2 - c1, dy = r2 - r1
  const lenSq = dx * dx + dy * dy

  let minProj = Infinity, maxProj = -Infinity
  const projCache = []

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const t = ((c - c1) * dx + (r - r1) * dy) / lenSq
      projCache.push({ r, c, t })
      if (t < minProj) minProj = t
      if (t > maxProj) maxProj = t
    }
  }

  const range = maxProj - minProj || 1

  for (const { r, c, t } of projCache) {
    const normalizedT = Math.max(0, Math.min(1, (t - minProj) / range))
    const idx = Math.min(stops.length - 1, Math.floor(normalizedT * stops.length))
    const hex = nearestBeadColor(stops[idx], beadColors)
    cells.push({ r, c, hex })
  }

  return cells
}

/**
 * 径向渐变
 * @param {number} cr 圆心行
 * @param {number} cc 圆心列
 * @param {number} radius 半径（格子数）
 * @param {string} innerHex
 * @param {string} outerHex
 * @param {number} levels 色阶数
 * @param {Array<{hex:string}>} beadColors
 * @param {number} gridW
 * @param {number} gridH
 * @returns {Array<{r:number, c:number, hex:string}>}
 */
export function radialGradient(cr, cc, radius, innerHex, outerHex, levels, beadColors, gridW, gridH) {
  const stops = generateColorStops(innerHex, outerHex, levels)
  const cells = []

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const dist = Math.sqrt((r - cr) ** 2 + (c - cc) ** 2)
      const t = Math.min(1, dist / radius)
      const idx = Math.min(stops.length - 1, Math.floor(t * stops.length))
      const hex = nearestBeadColor(stops[idx], beadColors)
      cells.push({ r, c, hex })
    }
  }

  return cells
}

/**
 * 角度渐变（圆锥渐变）
 * @param {number} cr 圆心行
 * @param {number} cc 圆心列
 * @param {number} radius 半径
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} levels
 * @param {Array<{hex:string}>} beadColors
 * @param {number} gridW
 * @param {number} gridH
 * @returns {Array<{r:number, c:number, hex:string}>}
 */
export function angleGradient(cr, cc, radius, hex1, hex2, levels, beadColors, gridW, gridH) {
  const stops = generateColorStops(hex1, hex2, levels)
  const cells = []

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const dist = Math.sqrt((r - cr) ** 2 + (c - cc) ** 2)
      if (dist > radius) continue
      const angle = (Math.atan2(r - cr, c - cc) + Math.PI) / (2 * Math.PI) // 0-1
      const idx = Math.min(stops.length - 1, Math.floor(angle * stops.length))
      const hex = nearestBeadColor(stops[idx], beadColors)
      cells.push({ r, c, hex })
    }
  }

  return cells
}
