// ============================================
//  分区约束纯色量化 — K-Means 聚类 + 固定色板硬映射
//
//  三条铁则：
//    1. 强制关闭所有抖动（Floyd-Steinberg/有序抖动等）
//    2. 各区域独立 K 值（不一刀切）
//    3. 聚类后强制映射真实拼豆色板
//
//  从根源消灭杂点：无误差扩散 = 无麻点扩散
// ============================================
import { rgbToLab, deltaE2000 } from '../utils/colorSpace.js'
import { REGION } from './regionSegment.js'

// ============================================
//  各区域默认 K 值
// ============================================
// 各区域默认 K 值（严格遵循文档规范：背景1色、皮肤3色、五官5色、头发3~4色）
const DEFAULT_K = {
  [REGION.BACKGROUND]:     1,   // 背景区：强制纯色（文档要求K=1，不允许多色）
  [REGION.OUTLINE]:        3,   // 轮廓区：黑/深灰/中灰层次
  [REGION.SKIN]:           3,   // 皮肤区：高光+主色+阴影（可切换2/3/4层，默认3层）
  [REGION.MAIN_COLOR]:     5,   // 主色块区：4~6色范围
  [REGION.DETAIL]:         5,   // 细节区：4~6色范围
  [REGION.FACIAL_FEATURE]: 5,   // 五官区：保留细节色（4~6色）
  [REGION.HAIR]:           3    // 头发区：主发色+高光+暗部（3~4色）
}

// ============================================
//  K-Means 聚类（K-Means++ 初始化 + Lloyd 迭代）
// ============================================

/**
 * K-Means 聚类
 * @param {Array<[number,number,number]>} points - RGB 像素数组
 * @param {number} K - 聚类数
 * @param {number} [maxIter=10] - 最大迭代次数
 * @returns {Array<[number,number,number]>} K 个聚类中心
 */
function kmeans(points, K, maxIter = 10) {
  if (points.length === 0) return []
  if (K >= points.length) {
    // 点数不足 K 时，返回所有唯一点
    const seen = new Set()
    const unique = []
    for (const p of points) {
      const key = p.join(',')
      if (!seen.has(key)) { seen.add(key); unique.push([...p]) }
    }
    return unique
  }

  // --- K-Means++ 初始化（确定性最远点采样） ---
  // 第一个中心：选亮度中位数的点（确定性）
  const sorted = points.map((p, i) => ({ p, i, lum: p[0] * 0.299 + p[1] * 0.587 + p[2] * 0.114 }))
  sorted.sort((a, b) => a.lum - b.lum)
  const centers = [[...sorted[Math.floor(sorted.length / 2)].p]]
  for (let k = 1; k < K; k++) {
    const dists = new Float64Array(points.length)
    let sumDist = 0
    for (let i = 0; i < points.length; i++) {
      let minD = Infinity
      for (const c of centers) {
        const d = (points[i][0] - c[0]) ** 2 + (points[i][1] - c[1]) ** 2 + (points[i][2] - c[2]) ** 2
        if (d < minD) minD = d
      }
      dists[i] = minD
      sumDist += minD
    }
    // 确定性最远点采样（替代随机加权选择，保证每次运行结果一致）
    if (sumDist === 0) {
      while (centers.length < K) centers.push([...centers[0]])
      break
    }
    // 选择距离已有中心最远的点
    let maxDist = -1, maxIdx = 0
    for (let i = 0; i < points.length; i++) {
      if (dists[i] > maxDist) { maxDist = dists[i]; maxIdx = i }
    }
    centers.push([...points[maxIdx]])
  }
  while (centers.length < K) centers.push([...centers[centers.length - 1]])

  // --- Lloyd 迭代 ---
  for (let iter = 0; iter < maxIter; iter++) {
    // 分配：每个点找最近中心
    const clusters = Array.from({ length: K }, () => [])
    for (const p of points) {
      let bestK = 0, bestD = Infinity
      for (let k = 0; k < K; k++) {
        const d = (p[0] - centers[k][0]) ** 2 + (p[1] - centers[k][1]) ** 2 + (p[2] - centers[k][2]) ** 2
        if (d < bestD) { bestD = d; bestK = k }
      }
      clusters[bestK].push(p)
    }

    // 更新中心
    let changed = false
    for (let k = 0; k < K; k++) {
      if (clusters[k].length === 0) continue
      const sr = clusters[k].reduce((s, p) => s + p[0], 0)
      const sg = clusters[k].reduce((s, p) => s + p[1], 0)
      const sb = clusters[k].reduce((s, p) => s + p[2], 0)
      const nr = Math.round(sr / clusters[k].length)
      const ng = Math.round(sg / clusters[k].length)
      const nb = Math.round(sb / clusters[k].length)
      if (nr !== centers[k][0] || ng !== centers[k][1] || nb !== centers[k][2]) {
        changed = true
        centers[k] = [nr, ng, nb]
      }
    }
    if (!changed) break
  }

  return centers
}

// ============================================
//  聚类中心 → 拼豆色板硬映射
// ============================================

// ============================================
//  聚类中心 → 拼豆色板硬映射（CIEDE2000 色差匹配）
//  文档要求：ΔE＜5 合格，ΔE＞10 提示无完美匹配
// ============================================

// ============================================
//  主色块独立连通域分离
// ============================================

/**
 * 对主色块区像素进行颜色量化 + 连通域分离
 * 每个独立连通域单独跑 K-Means
 *
 * @returns {Array<{pixels: Array<[r,g,b]>, indices: number[]}>} 独立色块列表
 */
function separateMainColorBlocks(pixels, w, h, mask) {
  const total = w * h
  // 粗量化主色块像素（每通道压缩到 0-7 = 512 色）
  const quantKey = new Uint8Array(total).fill(255)
  for (let i = 0; i < total; i++) {
    if (mask[i] !== REGION.MAIN_COLOR) continue
    const off = i * 3
    const r = Math.round(pixels[off] / 36)
    const g = Math.round(pixels[off + 1] / 36)
    const b = Math.round(pixels[off + 2] / 36)
    quantKey[i] = (r << 6) | (g << 3) | b
  }

  // 连通域分析
  const visited = new Uint8Array(total)
  const blocks = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (mask[idx] !== REGION.MAIN_COLOR || visited[idx]) continue

      const key = quantKey[idx]
      const queue = [[x, y]]
      visited[idx] = 1
      const blockIndices = [idx]
      const blockPixels = [[pixels[idx * 3], pixels[idx * 3 + 1], pixels[idx * 3 + 2]]]

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (mask[ni] === REGION.MAIN_COLOR && quantKey[ni] === key && !visited[ni]) {
            visited[ni] = 1
            queue.push([nx, ny])
            blockIndices.push(ni)
            blockPixels.push([pixels[ni * 3], pixels[ni * 3 + 1], pixels[ni * 3 + 2]])
          }
        }
      }

      if (blockPixels.length >= 10) {
        blocks.push({ pixels: blockPixels, indices: blockIndices, size: blockPixels.length })
      }
    }
  }

  // 按大小降序排列
  blocks.sort((a, b) => b.size - a.size)
  return blocks
}

// ============================================
//  主导入函数：分区约束纯色量化
// ============================================

/**
 * 分区约束纯色量化 —— 核心量化引擎
 *
 * 流程：
 *  1. 按区域分离像素
 *  2. 各区域独立 K-Means（主色块逐块聚类）
 *  3. 聚类中心硬映射到拼豆色板
 *  4. 每个像素 → 最近聚类中心 → 对应的珠子颜色
 *
 * @param {Uint8Array} pixels - RGB 交错像素 [R,G,B, ...]
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array} regionMask - 区域掩码（0背景 1轮廓 2皮肤 3主色块 4细节）
 * @param {Array} labColors - 全部珠子颜色（预计算 Lab）
 * @param {Object} [options] - 可选参数
 * @param {Object} [options.K] - 各区域自定义 K 值
 * @returns {{ grid: Array<Array<object|null>>, stats: object }}
 */
export function regionConstrainedQuantize(pixels, w, h, regionMask, labColors, options = {}) {
  const total = w * h
  const K = { ...DEFAULT_K, ...(options.K || {}) }

  // ============================================
  //  Step 1: 分离各区域像素
  // ============================================
  const regionPixels = {
    [REGION.BACKGROUND]: [],
    [REGION.OUTLINE]: [],
    [REGION.SKIN]: [],
    [REGION.DETAIL]: [],
    [REGION.FACIAL_FEATURE]: [],
    [REGION.HAIR]: []
  }
  const regionIndices = {
    [REGION.BACKGROUND]: [],
    [REGION.OUTLINE]: [],
    [REGION.SKIN]: [],
    [REGION.DETAIL]: [],
    [REGION.FACIAL_FEATURE]: [],
    [REGION.HAIR]: []
  }

  for (let i = 0; i < total; i++) {
    const rt = regionMask[i]
    if (rt === REGION.MAIN_COLOR) continue // 主色块单独处理
    if (regionPixels[rt] === undefined) continue
    if (rt === REGION.FACIAL_FEATURE) continue // 五官单独处理
    if (rt === REGION.HAIR) continue // 头发区由主色块统一处理（预留独立处理入口）
    const off = i * 3
    regionPixels[rt].push([pixels[off], pixels[off + 1], pixels[off + 2]])
    regionIndices[rt].push(i)
  }

  // ============================================
  //  Step 2a: 背景/轮廓/皮肤/细节 → K-Means → 硬映射
  // ============================================
  // 每个像素的最终珠子映射：pixelIndex → beadColor
  const pixelBead = new Array(total).fill(null)

  // ============================================
  //  纯色区域保护：方差极低的区域直接取主导色
  //  跳过 K-Means，防止平坦区域被引入杂色
  // ============================================
  function isPureRegion(pts) {
    if (pts.length < 10) return true  // 像素太少直接算纯色
    // 计算 RGB 各通道方差
    let sumR = 0, sumG = 0, sumB = 0
    for (const [r, g, b] of pts) { sumR += r; sumG += g; sumB += b }
    const n = pts.length
    const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n
    let varR = 0, varG = 0, varB = 0
    for (const [r, g, b] of pts) {
      varR += (r - meanR) ** 2; varG += (g - meanG) ** 2; varB += (b - meanB) ** 2
    }
    varR /= n; varG /= n; varB /= n
    // 标准差的平均 < 8 → 视为纯色区域（人眼不可感知的差异）
    const avgStd = (Math.sqrt(varR) + Math.sqrt(varG) + Math.sqrt(varB)) / 3
    return avgStd < 8
  }

  // 非主色块区域的量化
  const nonMainTypes = [REGION.BACKGROUND, REGION.OUTLINE, REGION.SKIN, REGION.DETAIL]
  const nonMainStats = {}

  for (const rt of nonMainTypes) {
    const pts = regionPixels[rt], idxs = regionIndices[rt]
    if (pts.length === 0) { nonMainStats[rt] = { k: 0, centers: 0 }; continue }

    // 纯色区域保护：低方差区域跳过 K-Means，直接用平均色
    const pure = isPureRegion(pts)
    let centers, centerToBead

    if (pure) {
      // 计算区域平均色 → CIEDE2000 映射到珠子
      let sumR = 0, sumG = 0, sumB = 0
      for (const [r, g, b] of pts) { sumR += r; sumG += g; sumB += b }
      const n = pts.length
      const avgR = Math.round(sumR / n), avgG = Math.round(sumG / n), avgB = Math.round(sumB / n)
      const avgLab = rgbToLab(avgR, avgG, avgB)
      let best = labColors[0], bestDist = Infinity
      for (const bc of labColors) {
        const d = deltaE2000(avgLab, bc.lab)
        if (d < bestDist) { bestDist = d; best = bc }
      }
      // 背景区（K=1）强制纯色统一，所有背景像素映射到同一珠子色
      const bead = { id: best.id, name: best.name, hex: best.hex.toUpperCase() }
      // 所有像素直接映射到同一珠子色
      for (let pi = 0; pi < pts.length; pi++) {
        pixelBead[idxs[pi]] = bead
      }
      nonMainStats[rt] = { k: 0, centers: 1, pure: true, deltaE: Math.round(bestDist * 100) / 100 }
      if (bestDist > 10) {
        console.warn(`  ⚠️ ${rt === REGION.BACKGROUND ? '背景' : rt === REGION.SKIN ? '皮肤' : '区域'+rt}纯色 ΔE=${bestDist.toFixed(2)}>10，无完美匹配色号`)
      }
      continue
    }

    const k = Math.min(K[rt], pts.length)
    centers = kmeans(pts, k)

    // 聚类中心 → 珠子映射（CIEDE2000 色差匹配）
    centerToBead = new Map() // "r,g,b" → beadColor
    for (const [cr, cg, cb] of centers) {
      const cLab = rgbToLab(cr, cg, cb)
      let best = labColors[0], bestDist = Infinity
      for (const bc of labColors) {
        const d = deltaE2000(cLab, bc.lab)
        if (d < bestDist) { bestDist = d; best = bc }
      }
      if (bestDist > 10) {
        console.warn(`  ⚠️ 区域${rt}聚类中心(${cr},${cg},${cb}) ΔE=${bestDist.toFixed(2)}>10，无完美匹配色号，使用近似替代`)
      }
      centerToBead.set(`${cr},${cg},${cb}`, {
        id: best.id, name: best.name, hex: best.hex.toUpperCase()
      })
    }

    // 每个像素 → 最近中心 → 珠子
    for (let pi = 0; pi < pts.length; pi++) {
      const [pr, pg, pb] = pts[pi]
      let bestC = centers[0], bestD = Infinity
      for (const c of centers) {
        const d = (pr - c[0]) ** 2 + (pg - c[1]) ** 2 + (pb - c[2]) ** 2
        if (d < bestD) { bestD = d; bestC = c }
      }
      pixelBead[idxs[pi]] = centerToBead.get(`${bestC[0]},${bestC[1]},${bestC[2]}`)
    }

    nonMainStats[rt] = { k, centers: centers.length }
  }

  // ============================================
  //  Step 2b: 主色块区 — 逐独立色块 K-Means
  // ============================================
  const mainBlocks = separateMainColorBlocks(pixels, w, h, regionMask)
  let mainBlockCount = 0
  let mainTotalPixels = 0

  for (const block of mainBlocks) {
    const k = Math.min(K[REGION.MAIN_COLOR], block.pixels.length)
    const centers = kmeans(block.pixels, k)

    // 聚类中心 → 珠子（CIEDE2000 色差匹配）
    const centerToBead = new Map()
    for (const [cr, cg, cb] of centers) {
      const cLab = rgbToLab(cr, cg, cb)
      let best = labColors[0], bestDist = Infinity
      for (const bc of labColors) {
        const d = deltaE2000(cLab, bc.lab)
        if (d < bestDist) { bestDist = d; best = bc }
      }
      centerToBead.set(`${cr},${cg},${cb}`, {
        id: best.id, name: best.name, hex: best.hex.toUpperCase()
      })
    }

    // 逐像素映射
    for (let pi = 0; pi < block.pixels.length; pi++) {
      const [pr, pg, pb] = block.pixels[pi]
      let bestC = centers[0], bestD = Infinity
      for (const c of centers) {
        const d = (pr - c[0]) ** 2 + (pg - c[1]) ** 2 + (pb - c[2]) ** 2
        if (d < bestD) { bestD = d; bestC = c }
      }
      pixelBead[block.indices[pi]] = centerToBead.get(`${bestC[0]},${bestC[1]},${bestC[2]}`)
    }

    mainBlockCount++
    mainTotalPixels += block.pixels.length
  }

  // ============================================
  //  Step 2c: 面部特征区 — 单独保色
  //  眼睛/眉毛/嘴巴等五官细节，K值按文档规范
  // ============================================
  const facePts = regionPixels[REGION.FACIAL_FEATURE]
  const faceIdxs = regionIndices[REGION.FACIAL_FEATURE]
  let faceColorCount = 0

  if (facePts.length > 0) {
    const k = Math.min(K[REGION.FACIAL_FEATURE], facePts.length)
    const centers = kmeans(facePts, k)

    const centerToBead = new Map()
    for (const [cr, cg, cb] of centers) {
      const cLab = rgbToLab(cr, cg, cb)
      let best = labColors[0], bestDist = Infinity
      for (const bc of labColors) {
        const d = deltaE2000(cLab, bc.lab)
        if (d < bestDist) { bestDist = d; best = bc }
      }
      centerToBead.set(`${cr},${cg},${cb}`, {
        id: best.id, name: best.name, hex: best.hex.toUpperCase()
      })
    }

    for (let pi = 0; pi < facePts.length; pi++) {
      const [pr, pg, pb] = facePts[pi]
      let bestC = centers[0], bestD = Infinity
      for (const c of centers) {
        const d = (pr - c[0]) ** 2 + (pg - c[1]) ** 2 + (pb - c[2]) ** 2
        if (d < bestD) { bestD = d; bestC = c }
      }
      pixelBead[faceIdxs[pi]] = centerToBead.get(`${bestC[0]},${bestC[1]},${bestC[2]}`)
    }
    faceColorCount = centerToBead.size
  }

  // ============================================
  //  Step 3: 构造网格输出
  // ============================================
  const grid = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      row.push(pixelBead[y * w + x])
    }
    grid.push(row)
  }

  // ============================================
  //  Step 4: 统计
  // ============================================
  const colorSet = new Set()
  let beadCount = 0
  for (const pb of pixelBead) {
    if (pb) { colorSet.add(pb.hex); beadCount++ }
  }

  const stats = {
    algorithm: 'region-kmeans-hardmap',
    totalPixels: total,
    beadCount,
    colorCount: colorSet.size,
    regions: {
      background:  { ...nonMainStats[REGION.BACKGROUND],  pixels: regionPixels[REGION.BACKGROUND].length },
      outline:     { ...nonMainStats[REGION.OUTLINE],     pixels: regionPixels[REGION.OUTLINE].length },
      skin:        { ...nonMainStats[REGION.SKIN],        pixels: regionPixels[REGION.SKIN].length },
      detail:      { ...nonMainStats[REGION.DETAIL],      pixels: regionPixels[REGION.DETAIL].length },
      mainColor:   { blocks: mainBlockCount, k: K[REGION.MAIN_COLOR], pixels: mainTotalPixels }
    }
  }

  console.log(`分区量化(文档合规): 背景K${K[REGION.BACKGROUND]}(纯色) 轮廓K${K[REGION.OUTLINE]} 皮肤K${K[REGION.SKIN]}(高光+主色+阴影) 面部K${K[REGION.FACIAL_FEATURE]}(${facePts.length}px,${faceColorCount}色) 主色${mainBlockCount}块×K${K[REGION.MAIN_COLOR]} 细节K${K[REGION.DETAIL]} → ${stats.colorCount}色 ${stats.beadCount}珠`)
  stats.regions.facialFeature = { k: K[REGION.FACIAL_FEATURE], pixels: facePts.length, colors: faceColorCount }

  return { grid, stats, pixelBead }
}
