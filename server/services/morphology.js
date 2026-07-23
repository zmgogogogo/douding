// ============================================
//  形态学操作模块 — 腐蚀/膨胀/开运算/闭运算
//
//  文档规范要求：
//    - 背景掩码：3×3闭运算填充孔洞 + 1×1腐蚀消除过渡带
//    - 主体边缘：1px收缩修正防止背景色渗入
//    - 背景/皮肤区：2×2开运算清除毛刺
//
//  所有操作均基于纯JS实现，无需OpenCV依赖
// ============================================

/**
 * 膨胀操作（Dilation）— 以结构元素扫描，取邻域最大值
 * 效果：扩大白色区域，填补细小孔洞
 *
 * @param {Uint8Array} mask - 二值掩码 (0/255)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [kernelSize=3] - 结构元素大小 (3=3×3)
 * @param {number} [iterations=1] - 迭代次数
 * @returns {Uint8Array} 膨胀后的掩码
 */
export function dilate(mask, w, h, kernelSize = 3, iterations = 1) {
  let result = mask
  const radius = Math.floor(kernelSize / 2)

  for (let iter = 0; iter < iterations; iter++) {
    const src = result
    result = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // 检查邻域是否有白色像素
        let hasWhite = false
        for (let dy = -radius; dy <= radius && !hasWhite; dy++) {
          for (let dx = -radius; dx <= radius && !hasWhite; dx++) {
            const nx = x + dx,
              ny = y + dy
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
            if (src[ny * w + nx] === 255) hasWhite = true
          }
        }
        result[y * w + x] = hasWhite ? 255 : 0
      }
    }
  }
  return result
}

/**
 * 腐蚀操作（Erosion）— 以结构元素扫描，取邻域最小值
 * 效果：缩小白色区域，消除边缘毛刺
 *
 * @param {Uint8Array} mask - 二值掩码 (0/255)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [kernelSize=3] - 结构元素大小
 * @param {number} [iterations=1] - 迭代次数
 * @returns {Uint8Array} 腐蚀后的掩码
 */
export function erode(mask, w, h, kernelSize = 3, iterations = 1) {
  let result = mask
  const radius = Math.floor(kernelSize / 2)

  for (let iter = 0; iter < iterations; iter++) {
    const src = result
    result = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // 检查邻域是否全部为白色像素
        let allWhite = true
        for (let dy = -radius; dy <= radius && allWhite; dy++) {
          for (let dx = -radius; dx <= radius && allWhite; dx++) {
            const nx = x + dx,
              ny = y + dy
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
              allWhite = false
              break
            }
            if (src[ny * w + nx] !== 255) {
              allWhite = false
              break
            }
          }
        }
        result[y * w + x] = allWhite ? 255 : 0
      }
    }
  }
  return result
}

/**
 * 闭运算（Closing）— 先膨胀后腐蚀
 * 效果：填充细小孔洞，连接断裂区域，平滑边界
 * 文档规范：3×3闭运算填充主体内部细小孔洞
 *
 * @param {Uint8Array} mask - 二值掩码 (0/255)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [kernelSize=3] - 结构元素大小
 * @returns {Uint8Array} 闭运算后的掩码
 */
export function closing(mask, w, h, kernelSize = 3) {
  const dilated = dilate(mask, w, h, kernelSize, 1)
  return erode(dilated, w, h, kernelSize, 1)
}

/**
 * 开运算（Opening）— 先腐蚀后膨胀
 * 效果：消除细小噪点，分离粘连区域，平滑边界
 * 文档规范：背景/皮肤区执行2×2开运算清除1px边缘毛刺
 *
 * @param {Uint8Array} mask - 二值掩码 (0/255)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {number} [kernelSize=2] - 结构元素大小
 * @returns {Uint8Array} 开运算后的掩码
 */
export function opening(mask, w, h, kernelSize = 2) {
  const eroded = erode(mask, w, h, kernelSize, 1)
  return dilate(eroded, w, h, kernelSize, 1)
}

// ============================================
//  高级操作
// ============================================

/**
 * 主体边缘收缩（1px）
 * 对主体掩码执行1px腐蚀，消除抠图常见的"白边""灰边"
 * 文档规范：与背景交界处做1像素硬化处理
 *
 * @param {Uint8Array} subjectMask - 主体掩码 (0=背景, 255=主体)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @returns {Uint8Array} 收缩后的主体掩码
 */
export function shrinkSubjectEdge(subjectMask, w, h) {
  return erode(subjectMask, w, h, 3, 1)
}

/**
 * 背景掩码优化管道（文档规范完整流程）
 * 1. 3×3 闭运算：填充主体内部细小孔洞
 * 2. 1×1 腐蚀：消除边缘半透明过渡带，保证边缘锐利
 *
 * @param {Uint8Array} backgroundMask - 背景掩码 (0=主体, 255=背景)
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @returns {Uint8Array} 优化后的背景掩码
 */
export function optimizeBackgroundMask(backgroundMask, w, h) {
  // Step 1: 3×3 闭运算填充孔洞
  const closed = closing(backgroundMask, w, h, 3)
  // Step 2: 1×1 腐蚀（用3×3腐蚀1次近似 = 每边收缩1px）
  const eroded = erode(closed, w, h, 3, 1)
  return eroded
}

/**
 * 边缘硬化：找到主体边缘像素，替换为紧邻的主体色
 * 用于消除主体与背景之间的半透明过渡杂色
 *
 * @param {Uint8Array} pixels - RGB 像素数据 [R,G,B,...]
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array} regionMask - 区域掩码（0=背景, 非0=主体）
 * @returns {Uint8Array} 硬化后的像素数据
 */
export function hardenEdges(pixels, w, h, regionMask) {
  const total = w * h
  const result = new Uint8Array(total * 3)
  // 复制原数据
  for (let i = 0; i < total * 3; i++) result[i] = pixels[i]

  // 收缩后的主体掩码
  const shrunk = shrinkSubjectEdge(
    regionMask.map((v) => (v === 0 ? 0 : 255)),
    w,
    h
  )

  // 找到边缘像素（原主体但收缩后不是主体的像素）
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const wasBody = regionMask[idx] !== 0
      const stillBody = shrunk[idx] === 255

      // 边缘像素：原来是主体，但收缩后不是了
      if (wasBody && !stillBody) {
        // 在3×3邻域找最近的主体内部像素，用其颜色替换
        let bestDist = Infinity
        let bestOff = -1
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx,
              ny = y + dy
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
            const ni = ny * w + nx
            if (shrunk[ni] === 255) {
              const d = dx * dx + dy * dy
              if (d < bestDist) {
                bestDist = d
                bestOff = ni * 3
              }
            }
          }
        }
        if (bestOff >= 0) {
          const off = idx * 3
          result[off] = pixels[bestOff]
          result[off + 1] = pixels[bestOff + 1]
          result[off + 2] = pixels[bestOff + 2]
        }
      }
    }
  }
  return result
}

/**
 * 皮肤区域约束的平滑（仅对皮肤掩码内像素执行）
 * 文档规范：以皮肤掩码为约束，仅在皮肤区域内做平滑处理
 *
 * @param {Uint8Array} pixels - RGB 像素数据
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array} skinMask - 皮肤掩码 (255=皮肤, 0=非皮肤)
 * @param {number} [radius=3] - 平滑半径
 * @returns {Uint8Array} 平滑后的像素数据
 */
export function skinConstrainedSmooth(pixels, w, h, skinMask, radius = 3) {
  const total = w * h
  const result = new Uint8Array(total * 3)
  // 复制原数据
  for (let i = 0; i < total * 3; i++) result[i] = pixels[i]

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (skinMask[idx] !== 255) continue // 非皮肤区域跳过

      // 在半径内取皮肤像素的均值
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx,
            ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (skinMask[ni] === 255) {
            const off = ni * 3
            sumR += pixels[off]
            sumG += pixels[off + 1]
            sumB += pixels[off + 2]
            count++
          }
        }
      }
      if (count > 0) {
        const off = idx * 3
        result[off] = Math.round(sumR / count)
        result[off + 1] = Math.round(sumG / count)
        result[off + 2] = Math.round(sumB / count)
      }
    }
  }
  return result
}
