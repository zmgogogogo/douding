// ============================================
//  边缘对齐最近邻像素化（Edge-Aligned Nearest Neighbor）
//
//  核心思想：
//    普通最近邻缩放 → 轮廓线可能落在像素格中间 → 半格混色杂边
//    边缘对齐最近邻 → Canny 检测轮廓 → 微调网格偏移量 →
//    硬轮廓线精确落在像素格边界上 → 每个像素格只属一个色块
//
//  绝对禁用：双线性、双三次、Lanczos（会产生过渡杂色）
// ============================================

// ============================================
//  Canny 边缘检测
// ============================================

/**
 * RGB → 灰度（加权亮度）
 */
function toGrayscale(pixels, w, h) {
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const off = i * 3
    gray[i] = pixels[off] * 0.299 + pixels[off + 1] * 0.587 + pixels[off + 2] * 0.114
  }
  return gray
}

/**
 * 5×5 高斯模糊核（σ≈1.4）
 */
function gaussianBlur5x5(src, w, h) {
  // 5×5 高斯核 σ=1.4 → 归一化权重
  const kernel = [
    2,  4,  5,  4, 2,
    4,  9, 12,  9, 4,
    5, 12, 15, 12, 5,
    4,  9, 12,  9, 4,
    2,  4,  5,  4, 2
  ]
  const kSum = 159 // kernel sum
  const dst = new Float32Array(w * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const nx = Math.max(0, Math.min(w - 1, x + kx))
          const ny = Math.max(0, Math.min(h - 1, y + ky))
          sum += src[ny * w + nx] * kernel[(ky + 2) * 5 + (kx + 2)]
        }
      }
      dst[y * w + x] = sum / kSum
    }
  }
  return dst
}

/**
 * Sobel 梯度计算
 * @returns {{ magnitude: Float32Array, direction: Float32Array }}
 */
function sobelGradients(src, w, h) {
  const mag = new Float32Array(w * h)
  const dir = new Float32Array(w * h) // 角度（弧度），0=水平，π/2=垂直

  // Sobel 3×3 核
  const Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
  const Gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = 0, sy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nx = Math.max(0, Math.min(w - 1, x + kx))
          const ny = Math.max(0, Math.min(h - 1, y + ky))
          const v = src[ny * w + nx]
          sx += v * Gx[ky + 1][kx + 1]
          sy += v * Gy[ky + 1][kx + 1]
        }
      }
      mag[y * w + x] = Math.sqrt(sx * sx + sy * sy)
      dir[y * w + x] = Math.atan2(sy, sx)
    }
  }
  return { magnitude: mag, direction: dir }
}

/**
 * 非极大值抑制（沿梯度方向）
 */
function nonMaxSuppression(mag, dir, w, h) {
  const result = new Float32Array(w * h)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      const m = mag[idx]
      if (m === 0) { result[idx] = 0; continue }

      // 梯度方向量化到 4 个方向：0°, 45°, 90°, 135°
      let angle = dir[idx] * (180 / Math.PI)
      if (angle < 0) angle += 180

      let n1 = 0, n2 = 0
      // 0° 方向（水平边缘 → 比较上下邻居）
      if (angle < 22.5 || angle >= 157.5) {
        n1 = mag[(y - 1) * w + x]
        n2 = mag[(y + 1) * w + x]
      }
      // 45° 方向
      else if (angle < 67.5) {
        n1 = mag[(y - 1) * w + (x + 1)]
        n2 = mag[(y + 1) * w + (x - 1)]
      }
      // 90° 方向（垂直边缘 → 比较左右邻居）
      else if (angle < 112.5) {
        n1 = mag[y * w + (x - 1)]
        n2 = mag[y * w + (x + 1)]
      }
      // 135° 方向
      else {
        n1 = mag[(y - 1) * w + (x - 1)]
        n2 = mag[(y + 1) * w + (x + 1)]
      }

      result[idx] = (m >= n1 && m >= n2) ? m : 0
    }
  }
  return result
}

/**
 * 双阈值 + 滞后边缘跟踪
 * @param {Float32Array} nms - 非极大值抑制后的梯度幅值
 * @param {number} lowThreshold - 低阈值（默认 50）
 * @param {number} highThreshold - 高阈值（默认 150）
 * @returns {Uint8Array} 二值边缘图（0=非边缘, 255=强边缘, 128=弱边缘）
 */
function doubleThreshold(nms, w, h, lowThreshold = 50, highThreshold = 150) {
  const edges = new Uint8Array(w * h)

  for (let i = 0; i < w * h; i++) {
    if (nms[i] >= highThreshold) {
      edges[i] = 255 // 强边缘
    } else if (nms[i] >= lowThreshold) {
      edges[i] = 128 // 弱边缘
    }
    // else: 0 = 非边缘
  }

  // 滞后：弱边缘如果与强边缘相邻 → 提升为强边缘
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      if (edges[idx] !== 128) continue

      // 检查 8 邻域是否有强边缘
      let hasStrong = false
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (edges[(y + dy) * w + (x + dx)] === 255) {
            hasStrong = true
            dy = 2; break
          }
        }
      }
      edges[idx] = hasStrong ? 255 : 0
    }
  }

  return edges
}

/**
 * Canny 边缘检测
 * @param {Uint8Array} pixels - RGB 交错像素
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [low=50] - 低阈值
 * @param {number} [high=150] - 高阈值
 * @returns {Uint8Array} 二值边缘图 (0/255)
 */
export function cannyEdgeDetect(pixels, w, h, low = 50, high = 150) {
  const gray = toGrayscale(pixels, w, h)
  const blurred = gaussianBlur5x5(gray, w, h)
  const { magnitude, direction } = sobelGradients(blurred, w, h)
  const nms = nonMaxSuppression(magnitude, direction, w, h)
  return doubleThreshold(nms, w, h, low, high)
}

// ============================================
//  网格偏移量优化
// ============================================

/**
 * 在 2× 中间图上寻找最优像素网格偏移量
 *
 * 对候选偏移 (dx, dy) 模拟最近邻采样，
 * 计算落在边缘上的采样点数量，取最小值。
 *
 * @param {Uint8Array} edgeMap - Canny 边缘图（0/255）
 * @param {number} srcW - 原图宽度（通常 = 2×targetW）
 * @param {number} srcH - 原图高度（通常 = 2×targetH）
 * @param {number} targetW - 目标网格宽度
 * @param {number} targetH - 目标网格高度
 * @returns {{ ox: number, oy: number }} 最优子像素偏移 [-0.5, 0.5]
 */
export function findGridOffset(edgeMap, srcW, srcH, targetW, targetH) {
  const scaleX = srcW / targetW
  const scaleY = srcH / targetH

  let bestOx = 0, bestOy = 0, bestScore = Infinity

  // 搜索步长 0.1 像素（子像素精度）
  for (let ox = -0.5; ox <= 0.5; ox += 0.1) {
    for (let oy = -0.5; oy <= 0.5; oy += 0.1) {
      let edgeHits = 0
      // 在目标网格的每个格点采样（即每个输出像素的中心）
      for (let ty = 0; ty < targetH; ty++) {
        const sy = Math.floor(ty * scaleY + oy)
        if (sy < 0 || sy >= srcH) continue
        for (let tx = 0; tx < targetW; tx++) {
          const sx = Math.floor(tx * scaleX + ox)
          if (sx < 0 || sx >= srcW) continue
          if (edgeMap[sy * srcW + sx] === 255) edgeHits++
        }
      }
      if (edgeHits < bestScore) {
        bestScore = edgeHits
        bestOx = ox
        bestOy = oy
      }
    }
  }

  // 如果没有找到更好的偏移（所有偏移分数相同），返回 (0,0)
  console.log(`  边缘对齐: 偏移 (${bestOx.toFixed(1)}, ${bestOy.toFixed(1)}) 边缘命中=${bestScore}`)
  return { ox: bestOx, oy: bestOy }
}

// ============================================
//  边缘对齐最近邻下采样
// ============================================

/**
 * 边缘对齐最近邻下采样
 *
 * 严格使用最近邻插值 + 子像素偏移，
 * 不产生任何过渡混色像素。
 *
 * @param {Uint8Array} srcPixels - 源 RGB 像素
 * @param {number} srcW - 源宽度
 * @param {number} srcH - 源高度
 * @param {number} targetW - 目标宽度
 * @param {number} targetH - 目标高度
 * @param {number} [ox=0] - X 偏移（子像素）
 * @param {number} [oy=0] - Y 偏移（子像素）
 * @returns {Uint8Array} 目标尺寸 RGB 像素
 */
export function edgeAlignedResize(srcPixels, srcW, srcH, targetW, targetH, ox = 0, oy = 0) {
  const scaleX = srcW / targetW
  const scaleY = srcH / targetH
  const dst = new Uint8Array(targetW * targetH * 3)

  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      // 最近邻：向下取整 + 偏移，钳位到有效范围
      const sx = Math.max(0, Math.min(srcW - 1, Math.floor(tx * scaleX + ox)))
      const sy = Math.max(0, Math.min(srcH - 1, Math.floor(ty * scaleY + oy)))

      const srcIdx = (sy * srcW + sx) * 3
      const dstIdx = (ty * targetW + tx) * 3
      dst[dstIdx]     = srcPixels[srcIdx]
      dst[dstIdx + 1] = srcPixels[srcIdx + 1]
      dst[dstIdx + 2] = srcPixels[srcIdx + 2]
    }
  }
  return dst
}

/**
 * 完整边缘对齐最近邻像素化管道
 *
 * 1. 缩放到 2× 目标尺寸（最近邻）→ 中间图
 * 2. Canny 边缘检测（在中间图上）
 * 3. 寻找最优像素网格偏移量
 * 4. 边缘对齐最近邻下采样到目标尺寸
 *
 * @param {Uint8Array} srcPixels - 源 RGB 像素（任意尺寸）
 * @param {number} srcW - 源宽度
 * @param {number} srcH - 源高度
 * @param {number} targetW - 目标网格宽度
 * @param {number} targetH - 目标网格高度
 * @returns {{ pixels: Uint8Array, w: number, h: number, offset: {ox,oy} }}
 */
export function edgeAlignedPixelize(srcPixels, srcW, srcH, targetW, targetH) {
  // Step 1: 缩放到 2× 目标尺寸（用于边缘检测和偏移计算）
  const midW = targetW * 2
  const midH = targetH * 2
  const midPixels = edgeAlignedResize(srcPixels, srcW, srcH, midW, midH, 0, 0)

  // Step 2: Canny 边缘检测
  const edgeMap = cannyEdgeDetect(midPixels, midW, midH, 40, 120)

  // Step 3: 寻找最优偏移
  const offset = findGridOffset(edgeMap, midW, midH, targetW, targetH)

  // Step 4: 边缘对齐最近邻下采样
  // 从中间图直接下采样（而非原图）
  const resultPixels = edgeAlignedResize(midPixels, midW, midH, targetW, targetH, offset.ox, offset.oy)

  return { pixels: resultPixels, w: targetW, h: targetH, offset }
}

// ============================================
//  网格下采样（用于量化后中间网格→目标网格）
// ============================================

/**
 * 在中间分辨率 RGB 图像上计算网格偏移量
 * 供后续网格下采样使用
 *
 * @param {Uint8Array} interPixels - 中间分辨率 RGB 像素
 * @param {number} interW, interH - 中间分辨率尺寸
 * @param {number} targetW, targetH - 目标网格尺寸
 * @returns {{ ox: number, oy: number }}
 */
/**
 * 根据图像亮度自动调整 Canny 阈值
 * 暗图降低阈值以捕捉更多边缘，亮图提高阈值减少噪点
 */
function adaptiveCannyThresholds(pixels, w, h) {
  let sumLum = 0
  const total = w * h
  for (let i = 0; i < total; i++) {
    const off = i * 3
    sumLum += pixels[off] * 0.299 + pixels[off + 1] * 0.587 + pixels[off + 2] * 0.114
  }
  const avgLum = sumLum / total
  // 平均亮度映射：暗图(低阈值30/90) ← → 亮图(高阈值60/160)
  const low = Math.round(25 + (avgLum / 255) * 35)
  const high = Math.round(80 + (avgLum / 255) * 80)
  return { low, high }
}

export function computeGridOffset(interPixels, interW, interH, targetW, targetH) {
  // 自适应阈值 Canny 边缘检测
  const { low, high } = adaptiveCannyThresholds(interPixels, interW, interH)
  const edgeMap = cannyEdgeDetect(interPixels, interW, interH, low, high)
  console.log(`  Canny自适应阈值: low=${low} high=${high} (基于平均亮度)`)
  // 寻找最优偏移
  return findGridOffset(edgeMap, interW, interH, targetW, targetH)
}

/**
 * 将区域掩码下采样到目标尺寸（多数投票）
 * @param {Uint8Array} srcMask - 源掩码 w×h
 * @param {number} srcW, srcH - 源尺寸
 * @param {number} targetW, targetH - 目标尺寸
 * @returns {Uint8Array} 目标尺寸掩码
 */
export function downsampleMask(srcMask, srcW, srcH, targetW, targetH) {
  const scaleX = srcW / targetW
  const scaleY = srcH / targetH
  const dst = new Uint8Array(targetW * targetH)

  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      // 对应的源区域
      const sx0 = Math.floor(tx * scaleX)
      const sy0 = Math.floor(ty * scaleY)
      const sx1 = Math.min(srcW - 1, Math.floor((tx + 1) * scaleX))
      const sy1 = Math.min(srcH - 1, Math.floor((ty + 1) * scaleY))

      // 统计区域内各类型出现次数
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
      for (let sy = sy0; sy <= sy1; sy++) {
        for (let sx = sx0; sx <= sx1; sx++) {
          counts[srcMask[sy * srcW + sx]]++
        }
      }
      // 取最多的类型
      let bestType = 4, bestCount = 0
      for (const [t, c] of Object.entries(counts)) {
        if (c > bestCount) { bestCount = c; bestType = parseInt(t) }
      }
      dst[ty * targetW + tx] = bestType
    }
  }
  return dst
}

/**
 * 将量化后的中间网格下采样到目标尺寸（区域感知多数投票）
 *
 * 关键改进：在下采样时使用区域掩码约束投票。
 * 边界格内的像素可能属于不同区域（如皮肤区+衣物区），
 * 如果跨区域混合投票，边界会出现斑驳杂色。
 * 解决方案：对于每个目标格，只统计主要区域类型的像素投票。
 *
 * @param {Array<Array<object|null>>} srcGrid - 中间分辨率拼豆网格
 * @param {number} srcW, srcH - 中间网格尺寸
 * @param {number} targetW, targetH - 目标网格尺寸
 * @param {Uint8Array} [srcMask] - 中间分辨率区域掩码（可选，启用区域感知投票）
 * @param {number} [ox=0] - X 子像素偏移
 * @param {number} [oy=0] - Y 子像素偏移
 * @returns {Array<Array<object|null>>} 目标尺寸拼豆网格
 */
export function downsampleGrid(srcGrid, srcW, srcH, targetW, targetH, srcMask = null, ox = 0, oy = 0) {
  const scaleX = srcW / targetW
  const scaleY = srcH / targetH
  const grid = []

  for (let ty = 0; ty < targetH; ty++) {
    const row = []
    for (let tx = 0; tx < targetW; tx++) {
      // 目标格在中间网格上的覆盖区域（含子像素偏移）
      const sx0 = Math.max(0, Math.floor(tx * scaleX + ox))
      const sy0 = Math.max(0, Math.floor(ty * scaleY + oy))
      const sx1 = Math.min(srcW - 1, Math.floor((tx + 1) * scaleX + ox))
      const sy1 = Math.min(srcH - 1, Math.floor((ty + 1) * scaleY + oy))

      // 如果提供了掩码，先确定该格的主导区域类型
      let dominantRegion = -1
      if (srcMask) {
        const regionCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
        for (let sy = sy0; sy <= sy1; sy++) {
          for (let sx = sx0; sx <= sx1; sx++) {
            const rt = srcMask[sy * srcW + sx]
            if (rt !== undefined) regionCounts[rt]++
          }
        }
        let bestRc = 0
        for (const [rt, c] of Object.entries(regionCounts)) {
          if (c > bestRc) { bestRc = c; dominantRegion = parseInt(rt) }
        }
      }

      // 投票：如果已知主导区域，只统计该区域的像素
      const votes = new Map() // hex → { count, cell }
      for (let sy = sy0; sy <= sy1; sy++) {
        for (let sx = sx0; sx <= sx1; sx++) {
          // 区域感知：跳过不属于主导区域的像素
          if (dominantRegion >= 0 && srcMask) {
            if (srcMask[sy * srcW + sx] !== dominantRegion) continue
          }
          const cell = srcGrid[sy]?.[sx]
          if (!cell || !cell.hex) continue
          const entry = votes.get(cell.hex)
          if (entry) {
            entry.count++
          } else {
            votes.set(cell.hex, { count: 1, cell })
          }
        }
      }

      // 如果区域限制后无票可投，回退到全局投票
      if (votes.size === 0) {
        for (let sy = sy0; sy <= sy1; sy++) {
          for (let sx = sx0; sx <= sx1; sx++) {
            const cell = srcGrid[sy]?.[sx]
            if (!cell || !cell.hex) continue
            const entry = votes.get(cell.hex)
            if (entry) { entry.count++ }
            else { votes.set(cell.hex, { count: 1, cell }) }
          }
        }
      }

      // 取得票最多的颜色
      let bestHex = null, bestCount = 0, bestCell = null
      for (const [hex, { count, cell }] of votes) {
        if (count > bestCount) { bestCount = count; bestHex = hex; bestCell = cell }
      }

      row.push(bestCell ? { id: bestCell.id, name: bestCell.name, hex: bestCell.hex } : null)
    }
    grid.push(row)
  }
  return grid
}
