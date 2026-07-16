// ============================================
//  拼豆网格后处理 — 连通域净化 + 轮廓补强
//
//  四步收尾，做到最终零杂点：
//    1. 背景杂色清理（激进阈值 8px，统一为背景主导色）
//    2. 区域感知连通域过滤（背景8px, 主体3px, 五官不过滤）
//    3. 轮廓连续性补强（填补 2px 断裂）
//    4. 可选 2×2 形态学开运算
// ============================================

// ============================================
//  连通域分析工具
// ============================================

/**
 * BFS 查找所有同色连通域
 * @returns {Array<{hex: string, cells: Array<[number,number]>, size: number}>}
 */
function findAllComponents(grid, w, h) {
  const visited = new Uint8Array(w * h)
  const components = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (visited[idx]) continue
      const cell = grid[y]?.[x]
      if (!cell || !cell.hex) { visited[idx] = 1; continue }

      const hex = cell.hex
      const queue = [[x, y]]
      visited[idx] = 1
      const cells = [[x, y]]

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const ni = ny * w + nx
          if (visited[ni]) continue
          const nc = grid[ny]?.[nx]
          if (nc && nc.hex === hex) {
            visited[ni] = 1
            queue.push([nx, ny])
            cells.push([nx, ny])
          }
        }
      }
      components.push({ hex, cells, size: cells.length })
    }
  }
  return components
}

// ============================================
//  区域主导色计算
// ============================================

/**
 * 统计每个区域中出现频率最高的珠子颜色
 * @returns {Map<number, {hex, id, name}>} regionType → dominant color
 */
function computeDominantColors(grid, w, h, regionMask) {
  const regionColors = {} // regionType → { hex → count }
  const regionColorInfo = {} // regionType → { hex → {id, name} }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      const rt = regionMask ? regionMask[idx] : 4
      const cell = grid[y]?.[x]
      if (!cell || !cell.hex) continue

      if (!regionColors[rt]) {
        regionColors[rt] = {}
        regionColorInfo[rt] = {}
      }
      regionColors[rt][cell.hex] = (regionColors[rt][cell.hex] || 0) + 1
      regionColorInfo[rt][cell.hex] = { id: cell.id, name: cell.name, hex: cell.hex }
    }
  }

  const dominant = {}
  for (const [rt, counts] of Object.entries(regionColors)) {
    let bestHex = null, bestCount = 0
    for (const [hex, count] of Object.entries(counts)) {
      if (count > bestCount) { bestCount = count; bestHex = hex }
    }
    dominant[parseInt(rt)] = regionColorInfo[rt][bestHex] || null
  }
  return dominant
}

// ============================================
//  Step 1: 带区域约束的连通域过滤
// ============================================

/**
 * 删除面积 < minSize 的微小色块
 * 但如果该色块颜色属于所在区域的调色板（如腮红、眼睛），则保留
 *
 * @param {Array<Array<object|null>>} grid - 拼豆网格
 * @param {number} w, h - 网格尺寸
 * @param {Uint8Array} regionMask - 区域掩码
 * @param {Object} regionPalettes - 各区域调色板
 * @param {Object} dominantColors - 各区域主导色
 * @param {number} [minSize=4] - 最小连通域面积
 * @returns {{ grid: Array<Array>, removed: number }}
 */
function filterSmallComponents(grid, w, h, regionMask, regionPalettes, dominantColors, minSize = 4) {
  const components = findAllComponents(grid, w, h)
  const result = grid.map(row => row.map(c => c ? { ...c } : null))
  let removed = 0
  let replaced = 0
  const FACIAL_FEATURE = 5  // 五官区域标记

  // 构建区域调色板 hex 集合用于快速查找
  const paletteHexSets = {}
  for (const [rt, palette] of Object.entries(regionPalettes || {})) {
    paletteHexSets[rt] = new Set(palette.map(c => c.hex.toUpperCase()))
  }

  for (const comp of components) {
    // 区域感知阈值：
    //   背景区(BG=0): minSize × 3 = 激进清理
    //   面部特征(5): 不过滤（保护眼/嘴细节）
    //   其他区域: 标准阈值
    let effectiveMinSize = minSize
    let isBackground = false
    let isFacial = false

    if (comp.cells.length > 0 && regionMask) {
      // 检查连通域主要属于哪个区域
      const regionVotes = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const [x, y] of comp.cells) {
        const rt = regionMask[y * w + x] || 0
        regionVotes[rt]++
      }
      let dominantRt = 0, maxVotes = 0
      for (const [rt, v] of Object.entries(regionVotes)) {
        if (v > maxVotes) { maxVotes = v; dominantRt = parseInt(rt) }
      }

      if (dominantRt === 0) {
        isBackground = true
        effectiveMinSize = minSize * 3  // 背景区 3× 激进阈值
      } else if (dominantRt === FACIAL_FEATURE) {
        isFacial = true
        effectiveMinSize = 1  // 五官区保留所有细节（即使是1px孤立点）
      }
    }

    // 背景小色块 → 强制清理（即使颜色在调色板中）
    if (isBackground && comp.size < effectiveMinSize) {
      for (const [x, y] of comp.cells) {
        const rt = regionMask ? regionMask[y * w + x] : 0
        const dominant = dominantColors[rt]
        if (dominant) {
          result[y][x] = { id: dominant.id, name: dominant.name, hex: dominant.hex }
          replaced++
        } else {
          result[y][x] = null
          removed++
        }
      }
      continue
    }

    if (comp.size >= effectiveMinSize) continue // 够大，保留

    // 五官区域 → 永远不过滤
    if (isFacial) continue

    // 检查该连通域的颜色是否属于各区域调色板
    let belongsToValidRegion = false
    for (const [x, y] of comp.cells) {
      const rt = regionMask ? regionMask[y * w + x] : 4
      const paletteSet = paletteHexSets[rt]
      if (paletteSet && paletteSet.has(comp.hex)) {
        belongsToValidRegion = true
        break
      }
    }

    if (belongsToValidRegion) continue // 合法细节，保留

    // 微小杂色 → 替换为所在区域主导色
    for (const [x, y] of comp.cells) {
      const rt = regionMask ? regionMask[y * w + x] : 4
      const dominant = dominantColors[rt]
      if (dominant) {
        result[y][x] = { id: dominant.id, name: dominant.name, hex: dominant.hex }
        replaced++
      } else {
        result[y][x] = null
        removed++
      }
    }
  }

  if (removed + replaced > 0) {
    console.log(`  连通域过滤: ${components.length}个连通域, 清除${removed} 替换${replaced} (阈值${minSize}px, 背景×3, 五官保护)`)
  }
  return { grid: result, removed: removed + replaced }
}

// ============================================
//  Step 2: 轮廓连续性补强
// ============================================

/**
 * 检测轮廓断裂处，用周围轮廓色补全 1-2px 缺口
 *
 * 策略：
 *  1. 第一遍：1px 缺口 (3×3邻域 ≥3 同色)
 *  2. 第二遍：2px 缺口 (5×5邻域 ≥5 同色，更宽松)
 *
 * @param {Array<Array<object|null>>} grid - 拼豆网格
 * @param {number} w, h - 网格尺寸
 * @param {Uint8Array} regionMask - 区域掩码
 * @returns {{ grid: Array<Array>, filled: number }}
 */
function reinforceContours(grid, w, h, regionMask) {
  const result = grid.map(row => row.map(c => c ? { ...c } : null))
  let filled = 0

  // 第一遍：1px 缺口修复
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!regionMask || regionMask[idx] !== 1) continue

      const cell = result[y][x]
      if (cell && cell.hex) continue

      const neighborColors = {}
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const nc = result[ny]?.[nx]
          if (nc && nc.hex) {
            neighborColors[nc.hex] = neighborColors[nc.hex] || { count: 0, cell: nc }
            neighborColors[nc.hex].count++
          }
        }
      }

      let bestHex = null, bestCount = 0, bestCell = null
      for (const [hex, info] of Object.entries(neighborColors)) {
        if (info.count > bestCount) {
          bestCount = info.count; bestHex = hex; bestCell = info.cell
        }
      }

      if (bestCount >= 3 && bestCell) {
        result[y][x] = { id: bestCell.id, name: bestCell.name, hex: bestCell.hex }
        filled++
      }
    }
  }

  // 第二遍：2px 缺口修复（使用5×5邻域）
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!regionMask || regionMask[idx] !== 1) continue
      if (result[y][x] && result[y][x].hex) continue // 已有颜色跳过

      const neighborColors = {}
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue // 跳过3×3区域（已处理）
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const nc = result[ny]?.[nx]
          if (nc && nc.hex) {
            neighborColors[nc.hex] = neighborColors[nc.hex] || { count: 0, cell: nc }
            neighborColors[nc.hex].count++
          }
        }
      }

      let bestHex = null, bestCount = 0, bestCell = null
      for (const [hex, info] of Object.entries(neighborColors)) {
        if (info.count > bestCount) {
          bestCount = info.count; bestHex = hex; bestCell = info.cell
        }
      }

      // 5×5 环区域需要 ≥5 个同色邻居
      if (bestCount >= 5 && bestCell) {
        result[y][x] = { id: bestCell.id, name: bestCell.name, hex: bestCell.hex }
        filled++
      }
    }
  }

  if (filled > 0) console.log(`  轮廓补强: ${filled}像素缺口 (1-2px)`)
  return { grid: result, filled }
}

// ============================================
//  Step 3: 2×2 形态学开运算（可选）
// ============================================

/**
 * 2×2 矩形核形态学开运算（腐蚀 → 膨胀）
 * 清除残留的孤立噪点，保留 2×2+ 的大色块
 *
 * @param {Array<Array<object|null>>} grid - 拼豆网格
 * @param {number} w, h - 网格尺寸
 * @param {Uint8Array} regionMask - 区域掩码（跳过轮廓区）
 * @returns {{ grid: Array<Array>, cleaned: number }}
 */
function morphologicalOpen(grid, w, h, regionMask) {
  // Step 1: 腐蚀 — 2×2 窗口不全同色 → 标记清除
  const eroded = grid.map(row => row.map(c => c ? { ...c } : null))
  const toClear = new Uint8Array(w * h)

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      // 跳过轮廓区和面部特征区（保护关键细节）
      if (regionMask) {
        const skip = [y * w + x, y * w + x + 1, (y + 1) * w + x, (y + 1) * w + x + 1]
        if (skip.some(i => regionMask[i] === 1 || regionMask[i] === 5)) continue
      }

      const a = grid[y][x], b = grid[y][x + 1]
      const c = grid[y + 1][x], d = grid[y + 1][x + 1]
      const hex = a?.hex
      if (!hex) continue
      // 2×2 块不全同色 → 腐蚀
      if (b?.hex !== hex || c?.hex !== hex || d?.hex !== hex) {
        toClear[y * w + x] = 1; toClear[y * w + x + 1] = 1
        toClear[(y + 1) * w + x] = 1; toClear[(y + 1) * w + x + 1] = 1
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (toClear[i]) {
      const x = i % w, y = Math.floor(i / w)
      eroded[y][x] = null
    }
  }

  // Step 2: 膨胀 — 空单元格用邻居最多颜色填充
  const result = eroded.map(row => row.map(c => c ? { ...c } : null))
  let cleaned = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (result[y][x] && result[y][x].hex) continue

      // 统计 3×3 邻居颜色
      const nb = {}
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const n = eroded[ny]?.[nx]
          if (n?.hex) nb[n.hex] = (nb[n.hex] || 0) + 1
        }
      }

      let bestHex = null, bestCount = 0
      for (const [hex, count] of Object.entries(nb)) {
        if (count > bestCount) { bestCount = count; bestHex = hex }
      }

      if (bestHex && bestCount >= 2) {
        // 找该颜色完整信息
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const n = eroded[y + dy]?.[x + dx]
            if (n?.hex === bestHex) {
              result[y][x] = { id: n.id, name: n.name, hex: n.hex }
              cleaned++
              dy = 2; break
            }
          }
        }
      }
    }
  }

  if (cleaned > 0) console.log(`  形态学开: ${cleaned}孤立噪点`)
  return { grid: result, cleaned }
}

// ============================================
//  主导出函数：完整后处理管道
// ============================================

/**
 * 拼豆网格后处理
 *
 * 三步收尾，做到零杂点：
 *  1. 连通域过滤（阈值 4px，区域感知）
 *  2. 轮廓补强（填补 1px 断裂）
 *  3. 可选形态学开运算（2×2 核）
 *
 * @param {Array<Array<object|null>>} grid - 量化后的拼豆网格
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @param {Uint8Array} regionMask - 区域掩码
 * @param {Object} regionPalettes - 区域调色板
 * @param {Object} [options] - 可选参数
 * @param {number} [options.minComponentSize=4] - 最小连通域面积
 * @param {boolean} [options.morphOpen=true] - 是否执行形态学开运算
 * @returns {{ grid: Array<Array>, stats: object }}
 */
export function postProcessGrid(grid, w, h, regionMask, regionPalettes, options = {}) {
  const minSize = options.minComponentSize || 4
  const doMorphOpen = options.morphOpen !== false

  // 预计算区域主导色
  const dominantColors = computeDominantColors(grid, w, h, regionMask)

  // Step 1: 连通域过滤
  const step1 = filterSmallComponents(grid, w, h, regionMask, regionPalettes, dominantColors, minSize)
  let currentGrid = step1.grid

  // Step 2: 轮廓补强
  const step2 = reinforceContours(currentGrid, w, h, regionMask)
  currentGrid = step2.grid

  // Step 3: 形态学开运算（可选）
  let morphCleaned = 0
  if (doMorphOpen) {
    const step3 = morphologicalOpen(currentGrid, w, h, regionMask)
    currentGrid = step3.grid
    morphCleaned = step3.cleaned
  }

  const stats = {
    componentFilter: { removed: step1.removed, threshold: minSize },
    contourFill: { filled: step2.filled },
    morphOpen: { cleaned: morphCleaned }
  }

  console.log(`后处理完成: 杂点${step1.removed} 轮廓${step2.filled} 开运算${morphCleaned}`)

  return { grid: currentGrid, stats }
}
