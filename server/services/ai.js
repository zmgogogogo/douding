// ============================================
//  AI 智能生成服务 — 文本关键词 → 拼豆像素图案
//  基于关键词匹配 + 模板生成算法
//  灵感来源：小图豆豆 AI画板、FunBead AI生成
// ============================================
import { loadBeadColors, findBestMatchOklab } from './colorMatch.js'
import { rgbToOklab } from '../utils/colorSpace.js'

/** 关键词 → 预设像素模板映射 */
const TEMPLATES = {
  // 动物类
  '猫|猫咪|小猫': {
    w: 16,
    h: 16,
    shapes: [
      { type: 'head_cat' },
      { type: 'ears', count: 2, dir: 'top' },
      { type: 'eyes', count: 2 },
      { type: 'nose_triangle' },
      { type: 'whiskers', count: 6 },
    ],
  },
  '狗|小狗|狗狗': {
    w: 16,
    h: 16,
    shapes: [
      { type: 'head_round' },
      { type: 'ears_floppy', count: 2, dir: 'top' },
      { type: 'eyes', count: 2 },
      { type: 'nose_oval' },
      { type: 'tongue' },
    ],
  },
  '兔|兔子|小兔': {
    w: 16,
    h: 18,
    shapes: [
      { type: 'head_round' },
      { type: 'ears_long', count: 2, dir: 'top' },
      { type: 'eyes', count: 2 },
      { type: 'nose_triangle' },
    ],
  },
  '熊|小熊|熊熊': {
    w: 18,
    h: 18,
    shapes: [
      { type: 'head_round' },
      { type: 'ears_round', count: 2, dir: 'top' },
      { type: 'eyes', count: 2 },
      { type: 'nose_oval' },
    ],
  },

  // 食物类
  草莓: {
    w: 14,
    h: 16,
    shapes: [
      { type: 'triangle_inv', colors: ['#E53935'] },
      { type: 'dots', count: 8, colors: ['#FFF59D'] },
      { type: 'leaf_top', colors: ['#43A047'] },
    ],
  },
  西瓜: {
    w: 18,
    h: 12,
    shapes: [
      { type: 'semicircle', colors: ['#E53935', '#43A047'] },
      { type: 'dots', count: 5, colors: ['#1A1A1A'] },
    ],
  },
  蛋糕: {
    w: 18,
    h: 20,
    shapes: [
      { type: 'rect', y: 8, h: 12, colors: ['#F8BBD0'] },
      { type: 'rect', y: 0, h: 6, colors: ['#FDD835'] },
      { type: 'candle', count: 3 },
    ],
  },
  冰淇淋: {
    w: 14,
    h: 20,
    shapes: [
      { type: 'triangle_inv', colors: ['#FFCCBC'] },
      { type: 'circle', y: 2, r: 5, colors: ['#F48FB1'] },
      { type: 'rect', y: 16, h: 4, colors: ['#A1887F'] },
    ],
  },
  苹果: {
    w: 14,
    h: 14,
    shapes: [
      { type: 'circle', colors: ['#E53935'] },
      { type: 'leaf_top_small', colors: ['#43A047'] },
    ],
  },

  // 自然类
  '花|花朵|小花': {
    w: 16,
    h: 16,
    shapes: [
      { type: 'petals', count: 5, colors: ['#F48FB1'] },
      { type: 'circle', r: 3, colors: ['#FDD835'] },
      { type: 'stem', colors: ['#43A047'] },
    ],
  },
  '树|树木': {
    w: 18,
    h: 22,
    shapes: [
      { type: 'triangle', y: 0, h: 12, colors: ['#43A047'] },
      { type: 'rect', y: 12, h: 10, w: 4, colors: ['#795548'] },
    ],
  },
  星星: { w: 16, h: 16, shapes: [{ type: 'star5', colors: ['#FDD835'] }] },
  '爱心|心形|心': { w: 16, h: 16, shapes: [{ type: 'heart', colors: ['#E53935'] }] },
  月亮: { w: 16, h: 16, shapes: [{ type: 'crescent', colors: ['#FDD835'] }] },
  太阳: {
    w: 16,
    h: 16,
    shapes: [
      { type: 'circle', r: 5, colors: ['#FDD835'] },
      { type: 'rays', count: 8, colors: ['#FB8C00'] },
    ],
  },
  彩虹: { w: 24, h: 14, shapes: [{ type: 'rainbow_bands', count: 6 }] },

  // 表情类
  '笑脸|微笑|happy': {
    w: 16,
    h: 16,
    shapes: [
      { type: 'circle', colors: ['#FDD835'] },
      { type: 'eyes_smile', count: 2 },
      { type: 'mouth_smile' },
    ],
  },
  '爱心眼|喜欢': {
    w: 16,
    h: 16,
    shapes: [
      { type: 'circle', colors: ['#FDD835'] },
      { type: 'eyes_heart', count: 2 },
      { type: 'mouth_smile' },
    ],
  },

  // 像素风经典
  蘑菇: {
    w: 16,
    h: 16,
    shapes: [
      { type: 'mushroom_cap', colors: ['#E53935'] },
      { type: 'mushroom_stem', colors: ['#EFEBE9'] },
      { type: 'dots', count: 3, colors: ['#FFFFFF'] },
    ],
  },
  钻石: { w: 14, h: 16, shapes: [{ type: 'diamond', colors: ['#42A5F5'] }] },
  幽灵: {
    w: 14,
    h: 16,
    shapes: [
      { type: 'ghost', colors: ['#FFFFFF'] },
      { type: 'eyes', count: 2, colors: ['#1A1A1A'] },
    ],
  },
  像素剑: { w: 6, h: 20, shapes: [{ type: 'sword', colors: ['#9E9E9E', '#FDD835'] }] },
}

/** 形状绘制函数 — 每个形状在 grid 上绘制指定图案 */
function drawShape(grid, w, h, shape) {
  const cx = Math.floor(w / 2),
    cy = Math.floor(h / 2)
  const colors = shape.colors || ['#1A1A1A']
  const cMain = colors[0],
    cAlt = colors[1] || cMain

  switch (shape.type) {
    case 'circle':
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const dx = c - cx,
            dy = r - cy
          const radius = shape.r || Math.min(cx, cy) - 2
          if (dx * dx + dy * dy <= radius * radius) grid[r][c] = cMain
        }
      break

    case 'rect': {
      const x = Math.max(0, Math.floor((w - (shape.w || w - 2)) / 2))
      const y = shape.y || 0
      const rw = shape.w || w - 2 * x,
        rh = shape.h || h
      for (let r = y; r < Math.min(h, y + rh); r++)
        for (let c = x; c < Math.min(w, x + rw); c++) grid[r][c] = cMain
      break
    }

    case 'triangle':
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const ratio = r / Math.max(1, h - 1)
          const halfW = (1 - ratio) * (w / 2 - 1)
          if (Math.abs(c - cx) <= halfW) grid[r][c] = cMain
        }
      break

    case 'triangle_inv':
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const ratio = r / Math.max(1, h - 1)
          const halfW = ratio * (w / 2 - 1)
          if (Math.abs(c - cx) <= halfW) grid[r][c] = cMain
        }
      break

    case 'heart':
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const x = (c - w / 2) / (w / 4),
            y = (h / 2 - r) / (h / 4)
          if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y <= 0.1) grid[r][c] = cMain
        }
      break

    case 'star5': {
      const points = 5,
        outerR = Math.min(cx, cy) - 1
      const innerR = outerR * 0.4
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const dx = c - cx,
            dy = r - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) + Math.PI / 2
          const starR =
            innerR + (((outerR - innerR) * Math.abs(Math.cos((angle * points) / 2))) % 1) > 0.5
              ? outerR
              : innerR
          if (dist <= outerR && dist > 0) {
            const expectedR =
              innerR +
              (outerR - innerR) *
                (Math.abs(Math.cos((angle * points) / 2 + Math.PI / points)) < 0.3 ? 1 : 0)
            if (dist <= outerR * 0.95) grid[r][c] = cMain
          }
        }
      break
    }

    case 'mushroom_cap':
      for (let r = 0; r < Math.floor(h * 0.55); r++)
        for (let c = 0; c < w; c++) {
          const dx = c - cx
          const dy = r - Math.floor(h * 0.5)
          if (dx * dx + dy * dy * 1.3 <= (w / 2) ** 2) grid[r][c] = cMain
        }
      break

    case 'mushroom_stem':
      for (let r = Math.floor(h * 0.55); r < h - 1; r++)
        for (let c = cx - 2; c <= cx + 2; c++) if (c > 0 && c < w - 1) grid[r][c] = cMain
      break

    case 'dots':
      for (let i = 0; i < (shape.count || 5); i++) {
        const angle = (i / shape.count) * Math.PI * 2 + Math.random() * 0.5
        const dist = Math.min(w, h) * 0.25 + Math.random() * Math.min(w, h) * 0.15
        const dr = Math.floor(cy + Math.sin(angle) * dist)
        const dc = Math.floor(cx + Math.cos(angle) * dist)
        if (dr > 0 && dr < h - 1 && dc > 0 && dc < w - 1) grid[dr][dc] = cMain
      }
      break

    case 'eyes':
      for (let i = 0; i < 2; i++) {
        const ex = cx + (i === 0 ? -3 : 3),
          ey = cy - 2
        if (ex > 1 && ex < w - 1) {
          grid[ey][ex] = cMain
          if (ey + 1 < h) grid[ey + 1][ex] = cMain
          grid[ey][ex + 1] = cMain
          if (ey + 1 < h) grid[ey + 1][ex + 1] = cMain
        }
      }
      break

    case 'rainbow_bands':
      for (let i = 0; i < (shape.count || 6); i++) {
        const bandH = Math.floor(h / (shape.count || 6))
        const bandColor = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'][i % 6]
        for (let r = i * bandH; r < Math.min(h, (i + 1) * bandH); r++)
          for (let c = 0; c < w; c++) grid[r][c] = bandColor
      }
      break
  }
}

/**
 * AI 生成像素图案（基于关键词匹配）
 * @param {string} prompt - 用户输入的文本描述
 * @param {number} targetW - 目标宽度
 * @param {number} targetH - 目标高度
 * @param {string} brand - 珠子品牌
 * @returns {{grid, gridW, gridH, matchedKeyword, message}}
 */
export function generateFromText(prompt, targetW = 32, targetH = 32, brand = 'Hama') {
  const text = prompt.toLowerCase().trim()
  if (!text) return { error: '请输入图案描述' }

  // 关键词匹配
  let matchedTemplate = null
  let matchedKeyword = ''
  for (const [pattern, template] of Object.entries(TEMPLATES)) {
    const regex = new RegExp(pattern, 'i')
    if (regex.test(text)) {
      matchedTemplate = template
      matchedKeyword = pattern.split('|')[0]
      break
    }
  }

  // 如果没有匹配到，根据文本长度生成随机几何图案
  if (!matchedTemplate) {
    return generateAbstractPattern(targetW, targetH, brand, text)
  }

  // 使用模板生成
  const w = matchedTemplate.w || targetW
  const h = matchedTemplate.h || targetH
  const grid = Array.from({ length: h }, () => Array(w).fill(null))

  for (const shape of matchedTemplate.shapes) {
    drawShape(grid, w, h, shape)
  }

  // 颜色匹配 — 将绘制的颜色匹配到真实珠子色卡
  const beadColors = loadBeadColors(brand)
  if (!beadColors.length) {
    beadColors.push(...loadBeadColors())
  }

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const hex = grid[r][c]
      if (!hex || typeof hex !== 'string') continue
      const rr = parseInt(hex.substring(1, 3), 16)
      const gg = parseInt(hex.substring(3, 5), 16)
      const bb = parseInt(hex.substring(5, 7), 16)
      const oklab = rgbToOklab(rr, gg, bb)
      const match = findBestMatchOklab(oklab, beadColors)
      if (match) {
        grid[r][c] = {
          name: match.name,
          hex: match.hex,
          brand: match.brand,
          series: match.series || '',
        }
      } else {
        grid[r][c] = { name: '未知', hex, brand, series: '' }
      }
    }
  }

  return {
    grid,
    gridW: w,
    gridH: h,
    matchedKeyword,
    message: `AI 已根据"${matchedKeyword}"生成 ${w}×${h} 像素图案`,
  }
}

/** 生成抽象几何图案（无关键词匹配时的降级方案） */
function generateAbstractPattern(w, h, brand, seedText) {
  const grid = Array.from({ length: h }, () => Array(w).fill(null))
  const beadColors = loadBeadColors(brand)
  if (!beadColors.length) beadColors.push(...loadBeadColors())

  // 用文本哈希生成伪随机种子图案
  let hash = 0
  for (let i = 0; i < seedText.length; i++) hash = (hash << 5) - hash + seedText.charCodeAt(i)

  const patternType = Math.abs(hash) % 4

  switch (patternType) {
    case 0: // 棋盘格
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const idx = ((r + c) % 2) * (beadColors.length - 1)
          if (beadColors[idx])
            grid[r][c] = {
              name: beadColors[idx].name,
              hex: beadColors[idx].hex,
              brand: beadColors[idx].brand,
              series: '',
            }
        }
      break
    case 1: // 条纹
      const stripeW = Math.max(2, Math.floor(w / 8))
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const idx = Math.floor(c / stripeW) % 3
          const ci = Math.min(idx * Math.floor(beadColors.length / 3), beadColors.length - 1)
          if (beadColors[ci])
            grid[r][c] = {
              name: beadColors[ci].name,
              hex: beadColors[ci].hex,
              brand: beadColors[ci].brand,
              series: '',
            }
        }
      break
    case 2: // 渐变
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const idx = Math.floor((r / h) * (beadColors.length - 1))
          if (beadColors[idx])
            grid[r][c] = {
              name: beadColors[idx].name,
              hex: beadColors[idx].hex,
              brand: beadColors[idx].brand,
              series: '',
            }
        }
      break
    case 3: // 同心圆
      const cx = Math.floor(w / 2),
        cy = Math.floor(h / 2)
      for (let r = 0; r < h; r++)
        for (let c = 0; c < w; c++) {
          const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2)
          const idx = Math.floor(dist / 2) % beadColors.length
          if (beadColors[idx])
            grid[r][c] = {
              name: beadColors[idx].name,
              hex: beadColors[idx].hex,
              brand: beadColors[idx].brand,
              series: '',
            }
        }
      break
  }

  return {
    grid,
    gridW: w,
    gridH: h,
    matchedKeyword: '抽象图案',
    message: `AI 已生成 ${w}×${h} 抽象几何图案（基于"${seedText}"）`,
  }
}
