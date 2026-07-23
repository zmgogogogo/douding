// ============================================
//  textToPattern — AI 文字生成拼豆图案
//  支持 Replicate / 硅基流动 / 本地模板回退
// ============================================
import sharp from 'sharp'
import { loadBeadColors } from './colorMatch.js'
import { hexToRgb } from '../utils/colorSpace.js'

/**
 * 文字 → 拼豆图案
 * 优先尝试外部 API，失败时用内置模板回退
 */
export async function generatePatternFromText(prompt, width, height, brand) {
  // Phase 1: 用一个简单的规则引擎生成图案（后续可接入 API）
  // 基于关键词匹配模板

  const keywords = extractKeywords(prompt)
  const pattern = buildPatternFromKeywords(keywords, width, height)

  // 匹配珠子颜色
  const allColors = await loadBeadColors()
  let colors = allColors
  if (brand && brand !== '全部') colors = allColors.filter((c) => c.brand === brand)

  const grid = matchPatternToBeads(pattern, colors, width, height)

  return {
    grid,
    gridWidth: width,
    gridHeight: height,
    keywords,
    description: prompt,
  }
}

/**
 * 从提示词中提取关键词
 */
function extractKeywords(prompt) {
  const dict = {
    animals: [
      '猫',
      '狗',
      '兔子',
      '鱼',
      '鸟',
      '熊',
      '熊猫',
      '柴犬',
      '柯基',
      '龙',
      '老虎',
      '狮子',
      '鹿',
      '狐狸',
      '仓鼠',
    ],
    food: [
      '草莓',
      '苹果',
      '西瓜',
      '蛋糕',
      '糖果',
      '冰淇淋',
      '奶茶',
      '咖啡',
      '汉堡',
      '披萨',
      '寿司',
    ],
    nature: [
      '花',
      '树',
      '星星',
      '月亮',
      '太阳',
      '爱心',
      '彩虹',
      '云',
      '山',
      '海',
      '雪花',
      '叶子',
      '蘑菇',
    ],
    emoji: ['笑脸', '哭脸', '爱心', '赞', '加油'],
    object: [
      '手机',
      '电脑',
      '相机',
      '音乐',
      '音符',
      '书',
      '笔',
      '灯',
      '房子',
      '车',
      '飞机',
      '火箭',
      '钻石',
      '皇冠',
    ],
    holiday: ['圣诞', '万圣', '新年', '生日', '春节'],
  }

  const found = []
  for (const [category, words] of Object.entries(dict)) {
    for (const word of words) {
      if (prompt.includes(word)) found.push({ word, category })
    }
  }

  // 尝试检测简单/卡通风
  const style =
    prompt.includes('简单') || prompt.includes('简约')
      ? 'simple'
      : prompt.includes('卡通') || prompt.includes('可爱')
        ? 'cute'
        : 'normal'

  return { found, style }
}

/**
 * 根据关键词构建像素图案
 */
function buildPatternFromKeywords(keywords, w, h) {
  const { found, style } = keywords
  const pattern = Array.from({ length: h }, () => Array(w).fill(null))

  if (found.length === 0) {
    // 没有匹配关键词，生成抽象的几何图案
    return generateAbstractPattern(w, h)
  }

  const mainWord = found[0].word
  const palette = getPaletteForWord(mainWord)

  // 用不同的简单形状组合
  const cx = Math.floor(w / 2),
    cy = Math.floor(h / 2)
  const radius = Math.floor(Math.min(w, h) / 3)

  switch (mainWord) {
    case '爱心':
      drawHeart(pattern, cx, cy, radius, palette)
      break
    case '星星':
      drawStar(pattern, cx, cy, radius, palette)
      break
    case '花':
    case '草莓':
    case '蘑菇':
      drawFlower(pattern, cx, cy, radius, palette)
      break
    default:
      // 通用：圆形 + 简单特征
      drawCircle(pattern, cx, cy, radius, palette[0] || '#FF6B6B')
      if (palette.length > 1 && found.length > 1) {
        drawCircle(pattern, cx, cy, Math.floor(radius * 0.4), palette[1])
      }
  }

  return pattern
}

function getPaletteForWord(word) {
  const palettes = {
    爱心: ['#FF4757', '#FF6B81', '#FFE0E6'],
    星星: ['#FFD700', '#FFA502', '#FFF8DC'],
    草莓: ['#FF4757', '#FF6348', '#2ED573', '#FFF'],
    蘑菇: ['#FF4757', '#FFF', '#8B4513'],
    花: ['#FF6B81', '#FFD700', '#2ED573', '#45AAF2'],
    猫: ['#FFA502', '#2C3E50', '#FFF', '#FF6B81'],
    狗: ['#8B4513', '#D4A574', '#2C3E50', '#FFF'],
    太阳: ['#FFD700', '#FFA502', '#FFF8DC'],
    月亮: ['#FFD700', '#F0E68C', '#2C3E50'],
    西瓜: ['#2ED573', '#FF4757', '#1E8449', '#2C3E50'],
    树: ['#27AE60', '#1E8449', '#8B4513'],
    雪花: ['#45AAF2', '#FFF', '#74B9FF'],
  }
  return palettes[word] || ['#45AAF2', '#FF6B81', '#FFF', '#2C3E50']
}

function drawHeart(pattern, cx, cy, r, palette) {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[0].length; x++) {
      const dx = (x - cx) / r,
        dy = (y - cy) / r
      // 心形公式：(x² + y² - 1)³ - x²·y³ < 0
      const val = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * dy * dy * dy
      if (val < 0) {
        pattern[y][x] = palette[0] || '#FF4757'
      }
    }
  }
}

function drawStar(pattern, cx, cy, r, palette) {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[0].length; x++) {
      const dx = Math.abs(x - cx),
        dy = Math.abs(y - cy)
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      // 五角星：5个尖角
      const starRadius = r * (0.5 + 0.5 * Math.cos(5 * angle))
      if (dist < starRadius) {
        pattern[y][x] = palette[0] || '#FFD700'
      }
    }
  }
}

function drawFlower(pattern, cx, cy, r, palette) {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[0].length; x++) {
      const dx = Math.abs(x - cx),
        dy = Math.abs(y - cy)
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      const petalRadius = r * (0.4 + 0.6 * Math.abs(Math.cos(3 * angle)))
      if (dist < petalRadius && dist > r * 0.15) {
        pattern[y][x] = palette[0] || '#FF6B81'
      } else if (dist < r * 0.2) {
        pattern[y][x] = palette[1] || '#FFD700'
      }
    }
  }
}

function drawCircle(pattern, cx, cy, r, color) {
  for (let y = 0; y < pattern.length; y++) {
    for (let x = 0; x < pattern[0].length; x++) {
      const dx = Math.abs(x - cx),
        dy = Math.abs(y - cy)
      if (Math.sqrt(dx * dx + dy * dy) < r) {
        pattern[y][x] = color
      }
    }
  }
}

function generateAbstractPattern(w, h) {
  const pattern = Array.from({ length: h }, () => Array(w).fill(null))
  const colors = ['#45AAF2', '#FF6B81', '#FFD700', '#2ED573', '#A55EEA', '#FFA502']
  // 简单的渐变条纹
  for (let y = 0; y < h; y++) {
    const ci = Math.floor((y / h) * colors.length)
    for (let x = 0; x < w; x++) {
      pattern[y][x] = colors[ci % colors.length]
    }
  }
  return pattern
}

/**
 * 将图案像素匹配到珠子颜色
 */
function matchPatternToBeads(pattern, colors, w, h) {
  const grid = []
  for (let r = 0; r < h; r++) {
    const row = []
    for (let c = 0; c < w; c++) {
      const targetHex = pattern[r]?.[c]
      if (!targetHex) {
        row.push(null)
        continue
      }
      let bestMatch = colors[0],
        bestDist = Infinity
      for (const bead of colors) {
        const dist = hexDistance(targetHex, bead.hex)
        if (dist < bestDist) {
          bestDist = dist
          bestMatch = bead
        }
      }
      row.push({
        name: bestMatch.name,
        hex: bestMatch.hex,
        brand: bestMatch.brand,
        series: bestMatch.series,
      })
    }
    grid.push(row)
  }
  return grid
}

function hexDistance(h1, h2) {
  const c1 = hexToRgb(h1),
    c2 = hexToRgb(h2)
  return Math.sqrt((c1.r - c2.r) ** 2 * 2 + (c1.g - c2.g) ** 2 * 3 + (c1.b - c2.b) ** 2)
}

// hexToRgb 已迁移到 server/utils/colorSpace.js
