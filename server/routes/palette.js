// ============================================
//  配色助手路由 — AI 智能配色 API
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'
import { loadBeadColors } from '../services/colorMatch.js'
import {
  recommendPalette,
  analyzeHarmony,
  checkColorblindAccessibility,
  generateFill,
  findBestMatch,
  crossBrandMapping,
} from '../services/paletteAdvisor.js'

const router = Router()

// 获取所有可用珠子颜色（供配色算法使用）
let cachedColors = null
async function getAvailableColors() {
  if (cachedColors) return cachedColors
  try {
    cachedColors = await loadBeadColors()
  } catch (_) {
    cachedColors = []
  }
  return cachedColors
}

// POST /api/palette/recommend — 调色板推荐
router.post('/palette/recommend', authOptional, async (req, res) => {
  try {
    const { existingHexes = [], scheme = 'auto', brand } = req.body || {}
    let colors = await getAvailableColors()
    if (brand && brand !== '全部') colors = colors.filter((c) => c.brand === brand)

    const result = recommendPalette(existingHexes, colors, scheme)
    res.json({ code: 200, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '配色推荐失败: ' + e.message })
  }
})

// POST /api/palette/harmony — 色彩和谐度分析
router.post('/palette/harmony', authOptional, (req, res) => {
  try {
    const { hexColors = [] } = req.body || {}
    const result = analyzeHarmony(hexColors)
    res.json({ code: 200, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '和谐度分析失败: ' + e.message })
  }
})

// POST /api/palette/colorblind — 色弱友好检查
router.post('/palette/colorblind', authOptional, (req, res) => {
  try {
    const { hexColors = [] } = req.body || {}
    const result = checkColorblindAccessibility(hexColors)
    res.json({ code: 200, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '色弱检查失败: ' + e.message })
  }
})

// POST /api/palette/fill — 自动填充生成
router.post('/palette/fill', authOptional, (req, res) => {
  try {
    const { type, colors, w, h, direction } = req.body || {}
    const grid = generateFill({ type, colors, w, h, direction })
    res.json({ code: 200, data: { grid } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '填充生成失败: ' + e.message })
  }
})

// POST /api/palette/match — 跨品牌颜色匹配
router.post('/palette/match', authOptional, async (req, res) => {
  try {
    const { targetHex, brand, exclude = [] } = req.body || {}
    let colors = await getAvailableColors()
    if (brand && brand !== '全部') colors = colors.filter((c) => c.brand === brand)
    const matches = findBestMatch(targetHex, colors, exclude, 5)
    res.json({ code: 200, data: { matches } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '颜色匹配失败: ' + e.message })
  }
})

// POST /api/palette/cross-brand — 跨品牌颜色映射
router.post('/palette/cross-brand', authOptional, async (req, res) => {
  try {
    const { color, targetBrand } = req.body || {}
    const allColors = await getAvailableColors()
    const result = crossBrandMapping(color, allColors, targetBrand)
    res.json({ code: 200, data: { match: result } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '跨品牌映射失败: ' + e.message })
  }
})

export default router
