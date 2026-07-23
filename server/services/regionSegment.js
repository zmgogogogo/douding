// ============================================
//  语义分区掩码生成 — HSV + 连通域分析
//  自动分割 5 类区域，各区域独立调色板
//  从根源消除跨区域杂色串扰
// ============================================
import { rgbToOklab, oklabDist } from '../utils/colorSpace.js'

// 区域类型常量（严格遵循文档规范：背景/轮廓/皮肤/主色块/细节/面部特征/头发 七大类）
export const REGION = {
  BACKGROUND: 0,      // 背景区 → K=1 强制纯色
  OUTLINE: 1,         // 轮廓线条区（深色/黑色边缘，优先级最高）
  SKIN: 2,            // 皮肤区（人脸、四肢等肤色）→ K=3（高光+主色+阴影）
  MAIN_COLOR: 3,      // 主色块区（头发、衣物等大面积纯色）→ K=5
  DETAIL: 4,          // 细节区（小型关键色块）→ K=5
  FACIAL_FEATURE: 5,  // 面部特征区（眼睛/眉毛/嘴巴）→ K=5（保护五官细节）
  HAIR: 6             // 头发区（预留，当前映射到MAIN_COLOR处理）
}

// ============================================
//  RGB → HSV 转换
// ============================================
function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d > 0.0001) {
    if (max === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else                 h = ((rn - gn) / d + 4) / 6
  }
  return { h, s, v }
}

// ============================================
//  像素级分类 — 将每个像素分配到初始区域
// ============================================

/**
 * 判断是否为轮廓线条像素
 * 深色/黑色边缘 → V < 0.22 或（暗 + 边缘强度高）
 *
 * 修复：排除暖色调深色像素（深肤色、棕色头发），这些不是轮廓线。
 * 暖色调暗像素(H在肤色/棕色范围, S>0.15)应归类为皮肤或主色块，而非轮廓。
 */
function isOutline(h, s, v) {
  // 排除暖色调深色像素：深色皮肤/棕色头发不应判为轮廓
  // H在红-橙范围(0~0.12)且有一定饱和度(S>0.15)的暗像素 → 不是轮廓，是深肤色/棕发
  const isWarmDark = v < 0.22 && h < 0.12 && s > 0.15
  if (isWarmDark) return false
  // 深色像素：明度很低
  if (v < 0.22) return true
  // 中等暗度 + 低饱和度 → 灰色线条
  if (v < 0.35 && s < 0.2) return true
  return false
}

/**
 * 判断是否为皮肤像素
 * 文档规范 HSV 肤色范围：H:5~25°(0.014~0.069), S:20~180(0.078~0.71), V:120~255(0.47~1.0)
 * 适配纯 HSV 分割（无 ML 模型）：严格限定在暖肤色范围，避免误判红/粉/橙色区域
 */
function isSkin(h, s, v) {
  // 肤色色调：严格限定红-橙-黄范围（文档规范 5~25°，收紧至 0~35°）
  // 排除纯红(h≈0)、粉(h≈0.9-0.95)、深橙(h≈0.08)
  if (h > 0.097 || h < 0.008) return false  // 仅保留 3°~35°（0.008~0.097）
  // 饱和度：文档规范 0.078~0.71，收紧下限防止灰色混入
  if (s < 0.10 || s > 0.65) return false
  // 明度：文档规范 0.47~1.0，收紧上下限防止过暗/过亮
  if (v < 0.45 || v > 0.92) return false
  // 高亮度时限制饱和度（文档："肤色在高明度时饱和度不能太高"）
  if (v > 0.72 && s > 0.50) return false
  return true
}

/**
 * 判断是否为背景像素（文档规范：识别白色/浅色背景）
 * 背景将被 K=1 强制纯色统一，消除所有纹理和杂物
 *
 * ⚠️ 阈值设计原则：
 * - 必须足够宽松以捕获真实照片的白色/浅灰背景
 * - 必须足够严格以避免误判浅肤色、浅蓝、粉彩为主体区域
 * - V 阈值提高（0.85→0.88），S 阈值降低（0.22→0.10），防止误杀浅色主体
 */
function isBackground(h, s, v) {
  // 近白色/浅灰色：极高亮度 + 极低饱和（收紧：防止误判浅肤色/粉彩）
  if (v > 0.88 && s < 0.10) return true
  // 极浅色背景：几乎无色彩（收紧 S 阈值）
  if (v > 0.78 && s < 0.05) return true
  // 纯白/近白：非常高的亮度，适度饱和（保持对白色背景的覆盖）
  if (v > 0.94 && s < 0.18) return true
  return false
}

// ============================================
//  连通域分析（Union-Find + 泛洪）
// ============================================

/**
 * 连通域标记（4-邻接泛洪）
 * @returns {{ labels: Uint32Array, regionSizes: Map<number, number> }}
 */
function connectedComponents(mask, w, h, targetValue) {
  const labels = new Uint32Array(w * h).fill(0)
  const regionSizes = new Map()
  let nextLabel = 1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx] !== targetValue || labels[idx] !== 0) continue

      // BFS 泛洪
      const label = nextLabel++
      const queue = [[x, y]]
      labels[idx] = label
      let size = 0

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()
        size++

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (mask[ni] === targetValue && labels[ni] === 0) {
            labels[ni] = label
            queue.push([nx, ny])
          }
        }
      }
      regionSizes.set(label, size)
    }
  }
  return { labels, regionSizes }
}

// ============================================
//  主色块检测 — 量化后连通域分析
// ============================================

/**
 * 对非轮廓/非皮肤/非背景区域做颜色量化，
 * 找出大面积同色连通域 → 主色块区
 * 每个独立颜色块单独标记
 */
function detectMainColorBlocks(pixels, w, h, mask, hsvCache) {
  const total = w * h
  // 对未分类像素（mask==0xFF）做粗糙量化到 ~32 色
  const quantized = new Uint8Array(total)
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 0xFF) { quantized[i] = 255; continue }
    const off = i * 3
    // 量化：每个通道压缩到 0-7（共 8³ = 512 色），再合并相似色
    const r = Math.round(pixels[off] / 36)     // 0-7
    const g = Math.round(pixels[off + 1] / 36)  // 0-7
    const b = Math.round(pixels[off + 2] / 36)  // 0-7
    quantized[i] = (r << 6) | (g << 3) | b       // 9-bit color key
  }

  // 连通域分析：找出每个量化颜色的连通区域
  const regionLabels = new Int32Array(total).fill(-1)
  const regionSizes = new Map()
  let nextRegionId = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx] !== 0xFF || regionLabels[idx] !== -1) continue

      const colorKey = quantized[idx]
      const regionId = nextRegionId++
      const queue = [[x, y]]
      regionLabels[idx] = regionId
      let size = 0
      const pixels_in_region = []

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()
        size++
        const ci = cy * w + cx
        pixels_in_region.push(ci)

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (mask[ni] === 0xFF && quantized[ni] === colorKey && regionLabels[ni] === -1) {
            regionLabels[ni] = regionId
            queue.push([nx, ny])
          }
        }
      }
      regionSizes.set(regionId, { size, colorKey, pixels: pixels_in_region })
    }
  }

  return { regionLabels, regionSizes }
}

// ============================================
//  主导入函数：语义分区
// ============================================

/**
 * 对 RGB 图像进行 5 类语义分区
 *
 * @param {Uint8Array} pixels - RGB 交错像素 [R,G,B, ...]
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @returns {{
 *   mask: Uint8Array,            // w*h 区域标记：0背景 1轮廓 2皮肤 3主色块 4细节
 *   stats: object                // 各区域像素占比统计
 * }}
 */
export function segmentRegions(pixels, w, h) {
  const total = w * h

  // 预计算所有像素的 HSV
  const hsvCache = new Array(total)
  for (let i = 0; i < total; i++) {
    const off = i * 3
    hsvCache[i] = rgbToHsv(pixels[off], pixels[off + 1], pixels[off + 2])
  }

  // ====== Pass 1: 像素级分类 ======
  // 初始掩码：0xFF = 未分类
  const mask = new Uint8Array(total).fill(0xFF)

  // 1. 轮廓线条区（优先级最高，先标记）
  for (let i = 0; i < total; i++) {
    const { h, s, v } = hsvCache[i]
    if (isOutline(h, s, v)) mask[i] = REGION.OUTLINE
  }

  // 2. 皮肤区
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 0xFF) continue
    const { h, s, v } = hsvCache[i]
    if (isSkin(h, s, v)) mask[i] = REGION.SKIN
  }

  // 3. 背景区
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 0xFF) continue
    const { h, s, v } = hsvCache[i]
    if (isBackground(h, s, v)) mask[i] = REGION.BACKGROUND
  }

  // ====== Pass 2: 连通域清理 ======
  // 皮肤区域最小阈值 = max(总像素0.5%, 15)
  const skinMinSize = Math.max(Math.floor(total * 0.005), 15)
  const { labels: skinLabels, regionSizes: skinSizes } = connectedComponents(mask, w, h, REGION.SKIN)
  for (const [label, size] of skinSizes) {
    if (size < skinMinSize) {
      for (let i = 0; i < total; i++) {
        if (skinLabels[i] === label) mask[i] = 0xFF
      }
    }
  }

  // 轮廓区域最小阈值 = max(总像素0.1%, 5)
  const outlineMinSize = Math.max(Math.floor(total * 0.001), 5)
  const { labels: outlineLabels, regionSizes: outlineSizes } = connectedComponents(mask, w, h, REGION.OUTLINE)
  for (const [label, size] of outlineSizes) {
    if (size < outlineMinSize) {
      for (let i = 0; i < total; i++) {
        if (outlineLabels[i] === label) mask[i] = 0xFF
      }
    }
  }

  // ====== Pass 2.5: 面部特征检测（在皮肤区内检测眼睛/嘴巴） ======
  const faceFeatureMask = new Uint8Array(total).fill(0)
  for (let i = 0; i < total; i++) {
    if (mask[i] !== REGION.SKIN) continue
    const { h, s, v } = hsvCache[i]
    // 眼睛特征：深色像素在皮肤区内（V < 0.35 且 S 较低 = 深色眼珠/眉毛）
    if (v < 0.35 && s < 0.4) {
      faceFeatureMask[i] = 1
    }
    // 嘴巴特征：红色/粉色像素（H 在红色范围 0-0.05 或 >0.9, S > 0.3, V 适中）
    else if ((h < 0.05 || h > 0.92) && s > 0.28 && v > 0.25 && v < 0.7) {
      faceFeatureMask[i] = 1
    }
    // 深色眉毛/睫毛（极暗，V < 0.18）
    else if (v < 0.18) {
      faceFeatureMask[i] = 1
    }
  }

  // 连通域过滤：面部特征太小（<3px）的忽略，但面部特征连通域不做过滤
  // 直接应用面部特征标记
  for (let i = 0; i < total; i++) {
    if (faceFeatureMask[i] === 1) {
      mask[i] = REGION.FACIAL_FEATURE
    }
  }

  // 从皮肤区中提取剩余的面部特征（更激进的二次检测）
  // 对每个皮肤连通域，检查其内部是否有明显的高对比度小区域
  const { labels: skinLabels2, regionSizes: skinSizes2 } = connectedComponents(mask, w, h, REGION.SKIN)
  for (const [label, size] of skinSizes2) {
    if (size < 100) continue // 太小的皮肤区域不检测面部特征
    // 收集该皮肤连通域内的像素
    const skinPixels = []
    for (let i = 0; i < total; i++) {
      if (skinLabels2[i] === label) skinPixels.push(i)
    }
    if (skinPixels.length === 0) continue

    // 找到该皮肤域的y范围
    let minY = h, maxY = 0
    for (const i of skinPixels) {
      const y = Math.floor(i / w)
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    const skinHeight = maxY - minY

    // 在皮肤域的上1/3区域检测深色像素（眼睛 — 通常在脸部上方）
    // 在下1/3区域检测红色像素（嘴巴 — 通常在脸部下方）
    for (const i of skinPixels) {
      if (mask[i] !== REGION.SKIN) continue
      const y = Math.floor(i / w)
      const { h, s, v } = hsvCache[i]
      const relY = (y - minY) / Math.max(1, skinHeight)

      // 上半区域(上40%)：深色小像素 = 眼睛
      if (relY < 0.4 && v < 0.30 && s < 0.35) {
        mask[i] = REGION.FACIAL_FEATURE
      }
      // 下半区域(下35%-85%)：红色/粉色 = 嘴巴
      else if (relY > 0.35 && relY < 0.85 && (h < 0.06 || h > 0.93) && s > 0.22 && v > 0.2 && v < 0.75) {
        mask[i] = REGION.FACIAL_FEATURE
      }
    }
  }

  // ====== Pass 3: 主色块检测 ======
  const { regionLabels: mainLabels, regionSizes: mainSizes } = detectMainColorBlocks(pixels, w, h, mask, hsvCache)

  // 主色块阈值 = max(总像素2%, 20)，大图至少200像素
  // 主色块 ≥ 阈值 → MAIN_COLOR，< 阈值 → DETAIL
  const mainThreshold = Math.max(Math.min(200, Math.floor(total * 0.02)), 20)
  const mainRegionMap = new Map() // regionId → final type (MAIN_COLOR or DETAIL)
  for (const [regionId, info] of mainSizes) {
    if (info.size >= mainThreshold) {
      mainRegionMap.set(regionId, REGION.MAIN_COLOR)
    } else {
      mainRegionMap.set(regionId, REGION.DETAIL)
    }
  }

  // 应用主色块/细节标记
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 0xFF) continue
    const rl = mainLabels[i]
    if (rl >= 0 && mainRegionMap.has(rl)) {
      mask[i] = mainRegionMap.get(rl)
    }
  }

  // 仍未分类的 → 归入细节区
  for (let i = 0; i < total; i++) {
    if (mask[i] === 0xFF) mask[i] = REGION.DETAIL
  }

  // ====== 统计 ======
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (let i = 0; i < total; i++) counts[mask[i]] = (counts[mask[i]] || 0) + 1
  const stats = {
    background:     { pct: (counts[0] / total * 100).toFixed(1), pixels: counts[0] },
    outline:        { pct: (counts[1] / total * 100).toFixed(1), pixels: counts[1] },
    skin:           { pct: (counts[2] / total * 100).toFixed(1), pixels: counts[2] },
    mainColor:      { pct: (counts[3] / total * 100).toFixed(1), pixels: counts[3] },
    detail:         { pct: (counts[4] / total * 100).toFixed(1), pixels: counts[4] },
    facialFeature:  { pct: (counts[5] / total * 100).toFixed(1), pixels: counts[5] },
    hair:           { pct: (counts[6] / total * 100).toFixed(1), pixels: counts[6] }
  }
  console.log(`语义分区(文档合规): 背景${stats.background.pct}% 轮廓${stats.outline.pct}% 皮肤${stats.skin.pct}% 面部${stats.facialFeature.pct}% 主色块${stats.mainColor.pct}% 细节${stats.detail.pct}% 头发${stats.hair.pct}%`)

  return { mask, stats }
}

// ============================================
//  区域调色板生成
//  每个像素只能从所属区域的调色板中选取颜色
// ============================================

/**
 * 为每个区域类型生成受限的珠子调色板
 *
 * 策略：
 *  - 轮廓区：只保留最暗的 15 种珠子色（黑/深灰/深棕）
 *  - 皮肤区：只保留肤色相关珠子色（肤色/浅粉/浅橙/浅棕 ~20-30 色）
 *  - 主色块区：全部珠子色（大面积纯色需要完整色域覆盖）
 *  - 细节区：全部珠子色（小面积需要精确匹配）
 *  - 背景区：只保留浅色/白色珠子色
 *
 * @param {Uint8Array} mask - 区域掩码
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array} pixels - RGB 像素
 * @param {Array} labColors - 全部珠子颜色（预计算 Lab）
 * @returns {Array<Array>} regionPalettes[regionId] = 该区域的珠子颜色子集
 */
export function computeRegionPalettes(mask, w, h, pixels, labColors) {
  const total = w * h

  // ====== 1. 轮廓区调色板：仅暗色 ======
  // Oklab L 值 0-1，暗色 L < 0.35
  const outlinePalette = labColors.filter(c => (c.oklab || c.lab).L < 0.35)

  // ====== 2. 皮肤区调色板：肤色范围 ======
  // Oklab 肤色特征：L 适中(0.4-0.85), a 偏红(0.02-0.12), b 偏黄(0.02-0.15)
  const skinPalette = labColors.filter(c => {
    const { L, a, b } = c.oklab || c.lab
    // Oklab 肤色范围：L 适中偏亮, a 偏暖(有上限), b 偏黄
    if (L < 0.35 || L > 0.88) return false
    if (b < 0.01 || b > 0.20) return false
    if (a < 0.01 && b < 0.04) return false // 纯灰色排除
    if (a > 0.16) return false // 太红的颜色不是肤色（防止高饱和红误入皮肤调色板）
    return true
  })

  // 确保皮肤区至少有 15 种颜色
  let finalSkinPalette = skinPalette
  if (skinPalette.length < 15) {
    const skinHexes = new Set(skinPalette.map(c => c.hex))
    const candidates = labColors
      .filter(c => !skinHexes.has(c.hex))
      .map(c => {
        let minD = Infinity
        for (const sc of skinPalette) {
          const d = oklabDist(c.oklab || c.lab, sc.oklab || sc.lab)
          if (d < minD) minD = d
        }
        return { color: c, dist: minD }
      })
      .sort((a, b) => a.dist - b.dist)
    const extra = candidates.slice(0, 15 - skinPalette.length).map(c => c.color)
    finalSkinPalette = [...skinPalette, ...extra]
  }

  // ====== 3. 背景区调色板：浅色/白色 ======
  const bgPalette = labColors.filter(c => (c.oklab || c.lab).L > 0.78)

  // ====== 4. 主色块区和细节区：全部颜色 ======
  const fullPalette = labColors

  // ====== 5. 头发区调色板：暗色+棕色系 ======
  // 预留：当前映射到 MAIN_COLOR 全色板，未来可限制为深色系
  const hairPalette = fullPalette

  return {
    [REGION.BACKGROUND]:     bgPalette.length > 0 ? bgPalette : fullPalette,
    [REGION.OUTLINE]:        outlinePalette.length > 5 ? outlinePalette : fullPalette,
    [REGION.SKIN]:           finalSkinPalette,
    [REGION.MAIN_COLOR]:     fullPalette,
    [REGION.DETAIL]:         fullPalette,
    [REGION.FACIAL_FEATURE]: fullPalette,  // 面部特征：全色板，最高精度
    [REGION.HAIR]:           hairPalette   // 头发区：全色板（预留）
  }
}

// ============================================
//  区域互斥校验
//  文档规范：皮肤/五官/背景两两互斥，单像素唯一归属
// ============================================

/**
 * 区域互斥校验 — 确保每个像素只属于一个区域
 *
 * 规则（文档规范）：
 *  - 面部特征(5) > 轮廓(1) > 皮肤(2) > 背景(0) > 主色块(3) > 细节(4)
 *  - 更高优先级区域覆盖低优先级
 *  - 统计并报告冲突像素数
 *
 * @param {Uint8Array} mask - 区域掩码
 * @param {number} total - 像素总数
 */
export function validateRegionExclusivity(mask, total) {
  // 该函数为文档规范占位：当前架构中 mask 已是单值 per pixel，
  // 互斥性由 segmentRegions() 的 Pass 顺序保证。
  // 未来引入 ML 分割模型后，需在此合并多个独立掩码并解决冲突。
  return { conflicts: 0, verified: true }
}

/**
 * 合并多个独立掩码为统一区域掩码（为未来 ML 模型准备）
 *
 * @param {Array<{mask: Uint8Array, regionType: number, priority: number}>} layerMasks
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @returns {Uint8Array} 统一区域掩码
 */
export function mergeRegionMasks(layerMasks, w, h) {
  const total = w * h
  const unified = new Uint8Array(total).fill(0xFF) // 默认未分类

  // 按优先级降序处理
  const sorted = [...layerMasks].sort((a, b) => b.priority - a.priority)
  for (const layer of sorted) {
    for (let i = 0; i < total; i++) {
      if (layer.mask[i] === 255) {
        unified[i] = layer.regionType
      }
    }
  }

  // 未分类像素归入细节区
  for (let i = 0; i < total; i++) {
    if (unified[i] === 0xFF) unified[i] = REGION.DETAIL
  }

  return unified
}
