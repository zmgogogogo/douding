// ============================================
//  颜色匹配算法 — 加权欧几里得距离
//  人眼对绿色更敏感，绿色权重 ×3
// ============================================

/**
 * 在珠子颜色列表中查找与给定 RGB 像素最接近的颜色
 * @param {{r:number,g:number,b:number}} pixel
 * @param {Array<{hex:string}>} beadColors
 * @returns {{hex:string}|null}
 */
export function findNearestColor(pixel, beadColors) {
  let best = null, bestDist = Infinity
  for (const c of beadColors) {
    const hex = c.hex.replace('#', '')
    const cr = parseInt(hex.substring(0, 2), 16)
    const cg = parseInt(hex.substring(2, 4), 16)
    const cb = parseInt(hex.substring(4, 6), 16)
    const dr = pixel.r - cr
    const dg = pixel.g - cg
    const db = pixel.b - cb
    const dist = dr * dr * 2 + dg * dg * 3 + db * db
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return best
}

/**
 * 从 gridData 统计各颜色的使用数量
 */
export function countColorsByGrid(gridData) {
  const map = {}
  const grid = Array.isArray(gridData) ? gridData : []
  for (const row of grid) {
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      if (cell && cell.hex) {
        if (!map[cell.hex]) map[cell.hex] = { hex: cell.hex, name: cell.name || cell.hex, count: 0 }
        map[cell.hex].count++
      }
    }
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}
