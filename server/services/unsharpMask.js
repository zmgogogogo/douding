// ============================================
//  Unsharp Mask 锐化 — 补偿引导滤波的柔和效应
//  公式: output = input + amount * (input - blurred)
//  仅对差异 > threshold 的像素生效，防止平坦区域引入噪点
// ============================================

/**
 * 3×3 盒式模糊（超快，用于 USM）
 */
function boxBlur3x3(pixels, w, h) {
  const result = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sr = 0, sg = 0, sb = 0, count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.max(0, Math.min(w - 1, x + dx))
          const ny = Math.max(0, Math.min(h - 1, y + dy))
          const off = (ny * w + nx) * 3
          sr += pixels[off]; sg += pixels[off + 1]; sb += pixels[off + 2]
          count++
        }
      }
      const idx = (y * w + x) * 3
      result[idx] = Math.round(sr / count)
      result[idx + 1] = Math.round(sg / count)
      result[idx + 2] = Math.round(sb / count)
    }
  }
  return result
}

/**
 * Unsharp Mask 锐化
 * @param {Uint8Array} pixels - RGB 交错像素
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {object} opts
 * @param {number} [opts.amount=0.5] - 锐化强度 (0-1)，越高越锐
 * @param {number} [opts.radius=1] - 模糊半径 (1=3×3, 2=5×5)
 * @param {number} [opts.threshold=2] - 差异阈值，低于此值不锐化（防噪）
 * @returns {Uint8Array} 锐化后 RGB 像素
 */
export function unsharpMask(pixels, w, h, opts = {}) {
  const amount = opts.amount ?? 0.5
  const threshold = opts.threshold ?? 2

  // Step 1: 模糊原图
  const blurred = boxBlur3x3(pixels, w, h)

  // Step 2: output = input + amount * (input - blurred)
  const total = w * h * 3
  const result = new Uint8Array(total)

  for (let i = 0; i < total; i += 3) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    const br = blurred[i], bg = blurred[i + 1], bb = blurred[i + 2]

    // 计算差异
    const dr = r - br, dg = g - bg, db = b - bb
    const diff = Math.abs(dr) + Math.abs(dg) + Math.abs(db)

    if (diff < threshold) {
      // 平坦区域：原样保留，不锐化
      result[i] = r; result[i + 1] = g; result[i + 2] = b
    } else {
      // 边缘区域：增强对比
      result[i]     = Math.max(0, Math.min(255, Math.round(r + amount * dr)))
      result[i + 1] = Math.max(0, Math.min(255, Math.round(g + amount * dg)))
      result[i + 2] = Math.max(0, Math.min(255, Math.round(b + amount * db)))
    }
  }

  return result
}
