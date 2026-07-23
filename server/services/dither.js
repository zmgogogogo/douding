// ============================================
//  Floyd-Steinberg 抖动算法 — 连续色调映射到有限色板
//  支持区域受限调色板（防止跨区串色）
//
//  ⚠️ @deprecated — 按文档规范，拼豆转图流程全程禁止误差扩散抖动。
//  文档明确要求「零抖动硬量化」，从根源杜绝椒盐杂点。
//  当前主流程使用 regionConstrainedQuantize（纯色硬量化），
//  本文件仅保留作为算法参考，不再被主流程调用。
// ============================================
import { rgbToLab, deltaE, clamp, rgbToOklab, oklabDist } from '../utils/colorSpace.js'

/**
 * Floyd-Steinberg 误差扩散抖动（全局调色板）
 * 将 RGB 像素映射到最接近的珠子颜色，误差扩散到相邻像素
 *
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array|Array} pixels - RGB 像素数据 [R,G,B, R,G,B, ...]
 * @param {Array} labColors - 预计算 Lab 值的珠子颜色列表
 * @returns {{ grid: Array<Array<object|null>> }}
 */
export function floydSteinbergDither(w, h, pixels, labColors) {
  return floydSteinbergDitherWithRegions(w, h, pixels, labColors, null, null)
}

/**
 * Floyd-Steinberg 抖动（支持区域受限调色板）
 *
 * 每个像素只在其所属区域的调色板中搜索最佳匹配，
 * 从根源消除跨区域串色。
 *
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array|Array} pixels - RGB 像素数据 [R,G,B, R,G,B, ...]
 * @param {Array} globalColors - 全局珠子颜色（预计算 Lab）
 * @param {Uint8Array|null} regionMask - 区域掩码 w*h（0背景 1轮廓 2皮肤 3主色块 4细节），null=全局模式
 * @param {Object|null} regionPalettes - 区域调色板映射 {0:[c1,c2], 1:[c3,c4], ...}，null=全局模式
 * @returns {{ grid: Array<Array<object|null>> }}
 */
export function floydSteinbergDitherWithRegions(
  w,
  h,
  pixels,
  globalColors,
  regionMask,
  regionPalettes
) {
  const len = w * h * 3
  const errors = new Float32Array(len)
  for (let i = 0; i < len; i++) errors[i] = pixels[i]

  // 是否使用分区模式
  const useRegions = regionMask && regionPalettes

  const grid = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const idx = y * w + x
      const r = clamp(Math.round(errors[i]))
      const g = clamp(Math.round(errors[i + 1]))
      const b = clamp(Math.round(errors[i + 2]))

      // 确定当前像素可用的调色板
      let palette
      if (useRegions) {
        const regionType = regionMask[idx] !== undefined ? regionMask[idx] : 4
        palette = regionPalettes[regionType]
        // 如果该区域调色板为空，回退到全局
        if (!palette || palette.length === 0) palette = globalColors
      } else {
        palette = globalColors
      }

      // Oklab 最邻近匹配（感知均匀色彩空间）
      const pixelOklab = rgbToOklab(r, g, b)
      let best = palette[0],
        bestDist = Infinity
      for (const c of palette) {
        const d = oklabDist(pixelOklab, c.oklab || c.lab)
        if (d < bestDist) {
          bestDist = d
          best = c
        }
      }

      row.push(best ? { id: best.id, name: best.name, hex: best.hex.toUpperCase() } : null)

      // 量化误差 = 原始 - 量化后
      const qh = best.hex.replace('#', '')
      const er = r - parseInt(qh.substring(0, 2), 16)
      const eg = g - parseInt(qh.substring(2, 4), 16)
      const eb = b - parseInt(qh.substring(4, 6), 16)

      // Floyd-Steinberg 误差扩散权重
      //        *    7/16
      //   3/16 5/16 1/16
      const dist = (dx, dy, wgt) => {
        const nx = x + dx,
          ny = y + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) return
        const ni = (ny * w + nx) * 3
        errors[ni] += er * wgt
        errors[ni + 1] += eg * wgt
        errors[ni + 2] += eb * wgt
      }
      dist(1, 0, 7 / 16)
      dist(-1, 1, 3 / 16)
      dist(0, 1, 5 / 16)
      dist(1, 1, 1 / 16)
    }
    grid.push(row)
  }
  return { grid }
}
