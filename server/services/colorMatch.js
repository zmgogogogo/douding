// ============================================
//  颜色匹配服务 — CIEDE2000 + Oklab 双算法匹配
// ============================================
import db from '../db/connection.js'
import { rgbToLab, rgbToOklab, deltaE2000, oklabDist } from '../utils/colorSpace.js'

/**
 * 加载珠子颜色并预计算 Lab/Oklab 值
 * @param {string} [brand] - 可选品牌筛选。null=全部品牌
 * @returns {Array<{id, name, hex, brand, lab: {L, a, b}, oklab: {L, a, b}}>}
 */
export function loadBeadColors(brand) {
  let colors
  if (brand && brand !== '全部') {
    colors = db.prepare(`
      SELECT c.id, c.name, c.hex, b.name as brand
      FROM bead_colors c
      JOIN bead_series s ON c.series_id = s.id
      JOIN bead_brands b ON s.brand_id = b.id
      WHERE b.name = ?
      ORDER BY c.id
    `).all(brand)
  } else {
    colors = db.prepare(`
      SELECT c.id, c.name, c.hex, b.name as brand
      FROM bead_colors c
      JOIN bead_series s ON c.series_id = s.id
      JOIN bead_brands b ON s.brand_id = b.id
      ORDER BY c.id
    `).all()
  }

  return colors.map(c => {
    const hex = c.hex.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return {
      ...c,
      lab: rgbToLab(r, g, b),
      oklab: rgbToOklab(r, g, b)
    }
  })
}

/**
 * 使用 CIEDE2000 进行最近邻颜色匹配（精确色貌感知）
 * @param {object} pixelLab - 像素的 Lab 值 {L, a, b}
 * @param {Array} beadColors - loadBeadColors 返回的珠子颜色数组
 * @returns {object} 最佳匹配的珠子颜色
 */
export function findBestMatchCIEDE2000(pixelLab, beadColors) {
  let best = null, bestDist = Infinity
  for (const c of beadColors) {
    const dist = deltaE2000(pixelLab, c.lab)
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return best
}

/**
 * 使用 Oklab 进行最近邻颜色匹配（计算更快，适合实时预览）
 * @param {object} pixelOklab - 像素的 Oklab 值 {L, a, b}
 * @param {Array} beadColors - loadBeadColors 返回的珠子颜色数组
 * @returns {object} 最佳匹配的珠子颜色
 */
export function findBestMatchOklab(pixelOklab, beadColors) {
  let best = null, bestDist = Infinity
  for (const c of beadColors) {
    const dist = oklabDist(pixelOklab, c.oklab)
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return best
}

/**
 * 跨品牌色号映射 — 查找另一品牌中最接近的替代颜色
 * @param {string} hex - 源颜色 hex
 * @param {string} targetBrand - 目标品牌
 * @param {Array} [allColors] - 全部颜色缓存（可选，传null则查询数据库）
 * @returns {{color: object|null, deltaE: number}} 替代色及其色差值
 */
export function findCrossBrandAlternative(hex, targetBrand, allColors = null) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const lab = rgbToLab(r, g, b)

  const targetColors = allColors
    ? allColors.filter(c => c.brand === targetBrand)
    : loadBeadColors(targetBrand)

  let best = null, bestDist = Infinity
  for (const c of targetColors) {
    const dist = deltaE2000(lab, c.lab)
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return { color: best, deltaE: bestDist }
}

/**
 * 预计算跨品牌色差矩阵（用于替代色推荐缓存）
 * 返回 { sourceBrand: { targetBrand: [{source, target, deltaE}, ...] } }
 */
export function buildCrossBrandMatrix() {
  const allColors = loadBeadColors()
  const brands = [...new Set(allColors.map(c => c.brand))]
  const matrix = {}

  for (const srcBrand of brands) {
    matrix[srcBrand] = {}
    const srcColors = allColors.filter(c => c.brand === srcBrand)
    for (const tgtBrand of brands) {
      if (srcBrand === tgtBrand) continue
      const tgtColors = allColors.filter(c => c.brand === tgtBrand)
      const mappings = []
      for (const sc of srcColors) {
        let best = null, bestDist = Infinity
        for (const tc of tgtColors) {
          const dist = deltaE2000(sc.lab, tc.lab)
          if (dist < bestDist) { bestDist = dist; best = tc }
        }
        mappings.push({
          source: { name: sc.name, hex: sc.hex },
          target: { name: best.name, hex: best.hex },
          deltaE: Math.round(bestDist * 100) / 100
        })
      }
      matrix[srcBrand][tgtBrand] = mappings
    }
  }
  return matrix
}
