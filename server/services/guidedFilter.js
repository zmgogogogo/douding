// ============================================
//  引导滤波（Guided Filter）— 保边平滑
//  比双边滤波更稳定，不会产生边缘晕染
//  以原图自身为引导图，平滑平坦区域，保留轮廓边缘
//
//  参考：He et al. "Guided Image Filtering", ECCV 2010 / TPAMI 2013
//  拼豆适配参数：r=4, ε=0.02
// ============================================

/**
 * O(1) 盒式滤波 — 使用积分图实现常数时间均值滤波
 * @param {Float32Array} data - 输入数据（w×h 单通道）
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} r - 滤波半径
 * @returns {Float32Array} 滤波后数据
 */
function boxFilter(data, w, h, r) {
  const stride = w + 1
  // 构建积分图（Float64 防止大图精度丢失）
  const integral = new Float64Array(stride * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    const rowOff = y * w
    const intOff = (y + 1) * stride + 1
    const prevIntOff = y * stride + 1
    for (let x = 0; x < w; x++) {
      rowSum += data[rowOff + x]
      integral[intOff + x] = integral[prevIntOff + x] + rowSum
    }
  }

  // 积分图查询
  const result = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const y1 = Math.max(0, y - r)
      const x1 = Math.max(0, x - r)
      const y2 = Math.min(h - 1, y + r)
      const x2 = Math.min(w - 1, x + r)

      const sum =
        integral[(y2 + 1) * stride + (x2 + 1)] -
        integral[y1 * stride + (x2 + 1)] -
        integral[(y2 + 1) * stride + x1] +
        integral[y1 * stride + x1]

      result[y * w + x] = sum / ((x2 - x1 + 1) * (y2 - y1 + 1))
    }
  }
  return result
}

/**
 * 单通道引导滤波
 * 以自身为引导图（I = p），实现保边平滑
 *
 * 算法步骤：
 *   mean_I  = boxFilter(I, r)
 *   corr_I  = boxFilter(I², r)
 *   var_I   = corr_I - mean_I²
 *   a       = var_I / (var_I + ε)
 *   b       = mean_I - a · mean_I
 *   mean_a  = boxFilter(a, r)
 *   mean_b  = boxFilter(b, r)
 *   q       = mean_a · I + mean_b
 *
 * @param {Float32Array} channel - 单通道像素数据（w×h）
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} r - 滤波半径
 * @param {number} eps - 正则化系数
 * @returns {Float32Array} 滤波后数据
 */
function guidedFilterChannel(channel, w, h, r, eps) {
  // Step 1: mean_I
  const meanI = boxFilter(channel, w, h, r)

  // Step 2: I² → boxFilter → corr_I
  const ii = new Float32Array(w * h) // I² = element-wise square
  for (let i = 0; i < w * h; i++) ii[i] = channel[i] * channel[i]
  const corrI = boxFilter(ii, w, h, r)

  // Step 3: var_I = corr_I - mean_I²
  // Step 4: a = var_I / (var_I + ε)
  // Step 5: b = mean_I - a · mean_I
  const a = new Float32Array(w * h)
  const b = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const varI = corrI[i] - meanI[i] * meanI[i]
    a[i] = varI / (varI + eps)
    b[i] = meanI[i] - a[i] * meanI[i]
  }

  // Step 6: mean_a, mean_b
  const meanA = boxFilter(a, w, h, r)
  const meanB = boxFilter(b, w, h, r)

  // Step 7: q = mean_a · I + mean_b
  const q = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    q[i] = meanA[i] * channel[i] + meanB[i]
  }

  return q
}

/**
 * RGB 引导滤波 — 逐通道处理，以自身为引导图
 *
 * 对 R/G/B 三通道分别做引导滤波，
 * 平滑皮肤、衣物等平坦区域，同时 100% 保留黑色轮廓线和五官硬边缘。
 *
 * @param {Uint8Array|Buffer} pixels - RGB 交错像素数据 [R,G,B, R,G,B, ...]
 * @param {number} w - 图像宽度
 * @param {number} h - 图像高度
 * @param {number} [r=4] - 滤波半径（拼豆适配值：4）
 * @param {number} [eps=0.02] - 正则化系数，越大平滑越强（拼豆适配值：0.02）
 * @returns {Uint8Array} 滤波后 RGB 像素数据
 */
export function guidedFilter(pixels, w, h, r = 4, eps = 0.02) {
  const total = w * h
  // eps 归一化：像素值在 [0, 255]，需要将 eps 映射到此范围
  // 公式中 var_I 范围是 [0, 255²]，eps 应缩放为 eps * 255² = eps * 65025
  const epsScaled = eps * 65025

  // 分离三通道 → Float32Array
  const chR = new Float32Array(total)
  const chG = new Float32Array(total)
  const chB = new Float32Array(total)
  for (let i = 0; i < total; i++) {
    const off = i * 3
    chR[i] = pixels[off]
    chG[i] = pixels[off + 1]
    chB[i] = pixels[off + 2]
  }

  // 三通道并行引导滤波
  const qR = guidedFilterChannel(chR, w, h, r, epsScaled)
  const qG = guidedFilterChannel(chG, w, h, r, epsScaled)
  const qB = guidedFilterChannel(chB, w, h, r, epsScaled)

  // 合并回交错格式 → Uint8Array（钳位到 [0, 255]）
  const result = new Uint8Array(total * 3)
  for (let i = 0; i < total; i++) {
    const off = i * 3
    result[off] = Math.max(0, Math.min(255, Math.round(qR[i])))
    result[off + 1] = Math.max(0, Math.min(255, Math.round(qG[i])))
    result[off + 2] = Math.max(0, Math.min(255, Math.round(qB[i])))
  }

  return result
}

/**
 * 改进型双边滤波 — 引导滤波的替代方案
 * 参数：d=5, sigmaColor=35, sigmaSpace=18
 *
 * @param {Uint8Array|Buffer} pixels - RGB 交错像素数据
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [d=5] - 滤波直径
 * @param {number} [sigmaColor=35] - 颜色空间标准差
 * @param {number} [sigmaSpace=18] - 空间标准差
 * @returns {Uint8Array} 滤波后 RGB 像素数据
 */
export function bilateralFilter(pixels, w, h, d = 5, sigmaColor = 35, sigmaSpace = 18) {
  const total = w * h
  const radius = Math.floor(d / 2)
  const result = new Uint8Array(total * 3)

  // 预计算空间权重（只计算一次，与像素值无关）
  const spatialWeights = []
  const twoSigmaSpace2 = 2 * sigmaSpace * sigmaSpace
  for (let dy = -radius; dy <= radius; dy++) {
    spatialWeights[dy] = []
    for (let dx = -radius; dx <= radius; dx++) {
      spatialWeights[dy][dx] = Math.exp(-(dx * dx + dy * dy) / twoSigmaSpace2)
    }
  }

  const twoSigmaColor2 = 2 * sigmaColor * sigmaColor

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 3
      const cr = pixels[ci],
        cg = pixels[ci + 1],
        cb = pixels[ci + 2]

      let sumR = 0,
        sumG = 0,
        sumB = 0,
        sumW = 0
      const yMin = Math.max(0, y - radius),
        yMax = Math.min(h - 1, y + radius)
      const xMin = Math.max(0, x - radius),
        xMax = Math.min(w - 1, x + radius)

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const ni = (ny * w + nx) * 3
          const nr = pixels[ni],
            ng = pixels[ni + 1],
            nb = pixels[ni + 2]

          // 颜色权重
          const dR = cr - nr,
            dG = cg - ng,
            dB = cb - nb
          const colorDist = dR * dR + dG * dG + dB * dB
          const colorWeight = Math.exp(-colorDist / twoSigmaColor2)

          const weight = spatialWeights[ny - y][nx - x] * colorWeight
          sumR += nr * weight
          sumG += ng * weight
          sumB += nb * weight
          sumW += weight
        }
      }

      result[ci] = Math.round(sumR / sumW)
      result[ci + 1] = Math.round(sumG / sumW)
      result[ci + 2] = Math.round(sumB / sumW)
    }
  }
  return result
}
