// ============================================
//  paletteAdvisor — AI 智能配色助手
//  纯算法实现：调色板推荐 + 和谐度 + 色弱 + 自动填充
// ============================================

/**
 * 将 hex 颜色转换为 RGB
 */
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/**
 * RGB → HSL（用于色轮计算）
 */
function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * 计算两个 hex 颜色之间的欧几里得距离（带人眼权重）
 */
function colorDistance(hex1, hex2) {
  const c1 = hexToRgb(hex1),
    c2 = hexToRgb(hex2)
  const dr = c1.r - c2.r,
    dg = c1.g - c2.g,
    db = c1.b - c2.b
  return Math.sqrt(dr * dr * 2 + dg * dg * 3 + db * db * 1)
}

/**
 * 计算两个颜色的 CIEDE2000 色差（简化版 CIE76）
 */
function deltaE(hex1, hex2) {
  const c1 = hexToRgb(hex1),
    c2 = hexToRgb(hex2)
  const rmean = (c1.r + c2.r) / 2
  const dr = c1.r - c2.r,
    dg = c1.g - c2.g,
    db = c1.b - c2.b
  return Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db)
}

/**
 * HSL 色差（用于色彩和谐度判断）
 */
function hueDifference(h1, h2) {
  const d = Math.abs(h1 - h2)
  return Math.min(d, 360 - d)
}

// ============================================
//  1. 调色板推荐
// ============================================

/**
 * 根据已有颜色列表，推荐协调的颜色方案
 * @param {string[]} existingHexes - 已有的颜色 hex 列表
 * @param {object[]} availableColors - 可用珠子颜色 [{name, hex, brand, series}]
 * @param {string} scheme - 'complementary'|'triadic'|'analogous'|'monochromatic'|'auto'
 * @returns {object} 推荐结果
 */
function recommendPalette(existingHexes, availableColors, scheme = 'auto') {
  if (!existingHexes.length) return { scheme: 'monochromatic', colors: [] }

  // 提取已有颜色的 HSL
  const existingHsl = existingHexes.map((h) => rgbToHsl(...Object.values(hexToRgb(h))))

  // 自动选择方案：分析颜色分布
  if (scheme === 'auto') {
    if (existingHexes.length === 1) scheme = 'monochromatic'
    else if (existingHexes.length <= 2) scheme = 'complementary'
    else scheme = 'analogous'
  }

  const recommendations = []
  const avgHue = existingHsl.reduce((s, c) => s + c.h, 0) / existingHsl.length

  // 生成目标色相
  const targetHues = []
  switch (scheme) {
    case 'complementary':
      targetHues.push((avgHue + 180) % 360)
      break
    case 'triadic':
      targetHues.push((avgHue + 120) % 360, (avgHue + 240) % 360)
      break
    case 'analogous':
      targetHues.push((avgHue + 30) % 360, (avgHue + 60) % 360, (avgHue + 330) % 360)
      break
    case 'monochromatic':
      // 同色相，不同亮度
      targetHues.push(avgHue)
      break
    default:
      targetHues.push((avgHue + 180) % 360)
  }

  // 从可用颜色中找最接近目标色相的
  for (const th of targetHues) {
    let bestMatch = null
    let bestScore = Infinity
    for (const c of availableColors) {
      const hsl = rgbToHsl(...Object.values(hexToRgb(c.hex)))
      const hueDist = hueDifference(th, hsl.h)
      // 排除已有颜色
      if (existingHexes.some((e) => e.toUpperCase() === c.hex.toUpperCase())) continue
      // 优先选饱和度适中的
      const satScore = Math.abs(hsl.s - 60) * 0.3
      const score = hueDist + satScore
      if (score < bestScore) {
        bestScore = score
        bestMatch = c
      }
      // 如果色差在 20 度以内且饱和度好，直接选
      if (hueDist < 20 && Math.abs(hsl.s - 50) < 30) {
        bestMatch = c
        break
      }
    }
    if (bestMatch && recommendations.length < 5) {
      recommendations.push(bestMatch)
    }
  }

  return {
    scheme,
    schemeLabel: {
      complementary: '互补色',
      triadic: '三角色',
      analogous: '邻近色',
      monochromatic: '同色系',
      auto: '自动',
    }[scheme],
    colors: recommendations,
  }
}

// ============================================
//  2. 色彩和谐度评分
// ============================================

/**
 * 分析配色的和谐度
 * @returns {object} { score(0-100), issues[], suggestions[] }
 */
function analyzeHarmony(hexColors) {
  if (hexColors.length < 2) return { score: 100, issues: [], suggestions: ['尝试添加更多颜色'] }

  const hsls = hexColors.map((h) => rgbToHsl(...Object.values(hexToRgb(h))))
  const issues = []
  const suggestions = []
  let score = 100

  // 1. 检查对比度
  for (let i = 0; i < hsls.length; i++) {
    for (let j = i + 1; j < hsls.length; j++) {
      const li = hsls[i].l,
        lj = hsls[j].l
      const contrast = Math.abs(li - lj)
      if (contrast < 15) {
        issues.push(
          `${hexColors[i]} 和 ${hexColors[j]} 亮度太接近 (${contrast.toFixed(0)}%)，拼豆中难以区分`
        )
        score -= 10
      }
    }
  }

  // 2. 检查色彩多样性
  const hues = hsls.map((c) => c.h)
  const uniqueHues = new Set(hues.map((h) => Math.round(h / 30) * 30))
  if (uniqueHues.size < 2 && hexColors.length >= 3) {
    issues.push('颜色集中在同一色相范围，缺少变化')
    score -= 15
    suggestions.push('尝试添加一些互补色（色相相差180°）增加视觉趣味')
  }

  // 3. 检查饱和度平衡
  const sats = hsls.map((c) => c.s)
  const avgSat = sats.reduce((a, b) => a + b, 0) / sats.length
  if (avgSat > 80) {
    issues.push('整体饱和度过高，可能显得刺眼')
    suggestions.push('选择1-2个低饱和度颜色做背景/底色')
    score -= 8
  }
  if (avgSat < 20) {
    issues.push('整体饱和度过低，图案可能显得暗淡')
    suggestions.push('添加1个饱和度较高的颜色作为点缀')
    score -= 8
  }

  // 4. 检查明度分布
  const lights = hsls.map((c) => c.l)
  const hasLight = lights.some((l) => l > 70)
  const hasDark = lights.some((l) => l < 30)
  if (!hasLight && hexColors.length > 2) {
    issues.push('缺少亮色，图案可能偏暗')
    suggestions.push('添加一个亮度 > 70% 的颜色')
    score -= 10
  }
  if (!hasDark && hexColors.length > 2) {
    issues.push('缺少深色，图案层次感可能不足')
    suggestions.push('添加一个亮度 < 30% 的颜色')
    score -= 10
  }

  // 5. 检查色相均匀分布
  if (hexColors.length >= 4) {
    const sortedHues = [...hues].sort((a, b) => a - b)
    let maxGap = 0
    for (let i = 1; i < sortedHues.length; i++) {
      maxGap = Math.max(maxGap, sortedHues[i] - sortedHues[i - 1])
    }
    const tailGap = 360 - sortedHues[sortedHues.length - 1] + sortedHues[0]
    maxGap = Math.max(maxGap, tailGap)
    if (maxGap > 150) {
      issues.push(`色相分布不均匀，存在 ${Math.round(maxGap)}° 的空档`)
      suggestions.push('在色相空档区域添加一个中间色')
      score -= 10
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    grade: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
    issues,
    suggestions,
  }
}

// ============================================
//  3. 色弱友好检查
// ============================================

/**
 * 模拟色弱视角检查配色是否友好
 * 支持：protanopia (红色盲), deuteranopia (绿色盲), tritanopia (蓝色盲)
 */
function checkColorblindAccessibility(hexColors) {
  const types = ['protanopia', 'deuteranopia', 'tritanopia']
  const results = {}

  for (const type of types) {
    // 模拟色盲视角下的颜色
    const simulated = hexColors.map((hex) => simulateColorblind(hex, type))
    // 检查模拟后是否有难以区分的颜色对
    const problemPairs = []
    for (let i = 0; i < simulated.length; i++) {
      for (let j = i + 1; j < simulated.length; j++) {
        const d = colorDistance(simulated[i], simulated[j])
        if (d < 40) {
          problemPairs.push({ color1: hexColors[i], color2: hexColors[j], distance: Math.round(d) })
        }
      }
    }
    results[type] = {
      label: { protanopia: '红色盲', deuteranopia: '绿色盲', tritanopia: '蓝色盲' }[type],
      isAccessible: problemPairs.length === 0,
      problemPairs,
    }
  }

  const allAccessible = Object.values(results).every((r) => r.isAccessible)
  return {
    isAccessible: allAccessible,
    types: results,
    summary: allAccessible
      ? '✅ 该配色对所有常见色弱类型友好'
      : `⚠️ 在 ${Object.values(results)
          .filter((r) => !r.isAccessible)
          .map((r) => r.label)
          .join('、')} 视角下存在难以区分的颜色对`,
  }
}

/**
 * 色盲模拟算法（基于 Brettel 1997 色盲模型简化版）
 */
function simulateColorblind(hex, type) {
  const { r, g, b } = hexToRgb(hex)
  let sr, sg, sb

  switch (type) {
    case 'protanopia': // 红色盲
      sr = 0.567 * r + 0.433 * g + 0 * b
      sg = 0.558 * r + 0.442 * g + 0 * b
      sb = 0 * r + 0.242 * g + 0.758 * b
      break
    case 'deuteranopia': // 绿色盲
      sr = 0.625 * r + 0.375 * g + 0 * b
      sg = 0.7 * r + 0.3 * g + 0 * b
      sb = 0 * r + 0.3 * g + 0.7 * b
      break
    case 'tritanopia': // 蓝色盲
      sr = 0.95 * r + 0.05 * g + 0 * b
      sg = 0 * r + 0.433 * g + 0.567 * b
      sb = 0 * r + 0.475 * g + 0.525 * b
      break
    default:
      sr = r
      sg = g
      sb = b
  }

  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return (
    '#' + [clamp(sr), clamp(sg), clamp(sb)].map((v) => v.toString(16).padStart(2, '0')).join('')
  )
}

// ============================================
//  4. 自动填充算法
// ============================================

/**
 * 为指定区域自动填充渐变/纹理颜色
 * @param {object} options
 * @param {string} options.type - 'gradient'|'random'|'pattern'|'fill'
 * @param {string[]} options.colors - 要使用的颜色
 * @param {number} options.w - 区域宽度
 * @param {number} options.h - 区域高度
 * @param {string} options.direction - 'h'|'v'|'diagonal' (渐变方向)
 */
function generateFill(options) {
  const { type = 'gradient', colors = [], w, h, direction = 'v' } = options
  const grid = Array.from({ length: h }, () => Array(w).fill(null))

  if (!colors.length) return grid

  switch (type) {
    case 'fill':
      // 纯填充
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) grid[r][c] = colors[0]
      break

    case 'gradient':
      // 渐变填充
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const t =
            direction === 'v'
              ? r / Math.max(1, h - 1)
              : direction === 'h'
                ? c / Math.max(1, w - 1)
                : (r / Math.max(1, h - 1) + c / Math.max(1, w - 1)) / 2
          const idx = Math.min(colors.length - 1, Math.floor(t * colors.length))
          grid[r][c] = colors[idx]
        }
      }
      break

    case 'random':
      // 随机散布
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const idx = Math.floor(Math.random() * colors.length)
          grid[r][c] = colors[idx]
        }
      }
      break

    case 'pattern':
      // 棋盘/条纹模式
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const idx = (r + c) % colors.length
          grid[r][c] = colors[idx]
        }
      }
      break
  }

  return grid
}

// ============================================
//  5. 跨品牌颜色映射推荐
// ============================================

/**
 * 给定一个颜色，在所有可用珠子中找最接近的替代色
 */
function findBestMatch(targetHex, availableColors, excludeHexes = [], topN = 3) {
  const exclude = new Set(excludeHexes.map((h) => h.toUpperCase()))
  const candidates = availableColors
    .filter((c) => !exclude.has(c.hex.toUpperCase()))
    .map((c) => ({ ...c, distance: deltaE(targetHex, c.hex) }))
    .sort((a, b) => a.distance - b.distance)

  return candidates.slice(0, topN)
}

/**
 * 给定一个品牌的目标色，找其他品牌最接近的颜色（跨品牌映射）
 */
function crossBrandMapping(targetColor, allColors, targetBrand) {
  const sameColor = allColors.filter(
    (c) => c.hex.toUpperCase() === targetColor.hex.toUpperCase() && c.brand === targetBrand
  )
  if (sameColor.length) return sameColor[0]
  return (
    findBestMatch(
      targetColor.hex,
      allColors.filter((c) => c.brand === targetBrand),
      [],
      1
    )[0] || null
  )
}

// ============================================
//  导出
// ============================================
export {
  hexToRgb,
  rgbToHsl,
  colorDistance,
  deltaE,
  recommendPalette,
  analyzeHarmony,
  checkColorblindAccessibility,
  simulateColorblind,
  generateFill,
  findBestMatch,
  crossBrandMapping,
}
