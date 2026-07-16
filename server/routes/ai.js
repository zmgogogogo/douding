// ============================================
//  AI 生成路由 — 文字生成 + 风格迁移
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'
import { generateFromText } from '../services/ai.js'
import { generatePatternFromText } from '../services/textToPattern.js'
import {
  simplifyPattern, enhanceEdges, makeTileable, applyPixelStyle
} from '../services/styleTransfer.js'
import { analyzeImage, removeBackgroundSimple } from '../services/imageAnalyzer.js'
import { loadBeadColors } from '../services/colorMatch.js'

const router = Router()

/**
 * POST /api/ai/generate — 文字生成拼豆图案
 * 优先使用关键词模板引擎，回退到随机模板
 */
router.post('/ai/generate', authOptional, async (req, res) => {
  try {
    const { prompt, width = 32, height = 32, brand = 'Hama' } = req.body || {}

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ code: 400, message: '请输入图案描述，例如：小猫、草莓、爱心' })
    }

    const targetW = Math.min(64, Math.max(8, parseInt(width) || 32))
    const targetH = Math.min(64, Math.max(8, parseInt(height) || 32))

    // 尝试新关键词模板引擎
    let result
    try {
      result = await generatePatternFromText(prompt, targetW, targetH, brand)
    } catch (_) {
      // 回退到旧算法
      result = generateFromText(prompt, targetW, targetH, brand)
    }

    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error })
    }

    res.json({
      code: 200,
      data: {
        grid: result.grid,
        gridWidth: result.gridWidth || targetW,
        gridHeight: result.gridHeight || targetH,
        keywords: result.keywords,
        message: result.description || prompt
      }
    })
  } catch (e) {
    console.error('AI 生成失败:', e)
    res.status(500).json({ code: 500, message: 'AI 生成失败: ' + e.message })
  }
})

/**
 * POST /api/ai/enhance — 图案增强（简化/轮廓/平铺/风格）
 */
router.post('/ai/enhance', authOptional, (req, res) => {
  try {
    const { grid, action, options = {} } = req.body || {}
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '无效的网格数据' })
    }

    let result
    switch (action) {
      case 'simplify':
        result = simplifyPattern(grid, options.targetColors || 8)
        break
      case 'edges':
        result = enhanceEdges(grid)
        break
      case 'tile':
        result = makeTileable(grid)
        break
      case 'style':
        result = applyPixelStyle(grid, options.style || '8bit')
        break
      default:
        return res.status(400).json({ code: 400, message: `未知操作: ${action}` })
    }

    res.json({ code: 200, data: { grid: result } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '图案增强失败: ' + e.message })
  }
})

/**
 * POST /api/ai/analyze-image — 智能图片分析
 */
router.post('/ai/analyze-image', authOptional, async (req, res) => {
  try {
    const { imagePath } = req.body || {}
    if (!imagePath) {
      return res.status(400).json({ code: 400, message: '请提供图片路径' })
    }
    const result = await analyzeImage(imagePath)
    res.json({ code: 200, data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '图片分析失败: ' + e.message })
  }
})

/**
 * GET /api/ai/templates — 模板关键词列表
 */
router.get('/ai/templates', (req, res) => {
  const keywords = [
    { category: '动物', items: ['猫', '狗', '兔子', '小熊', '熊猫', '柴犬', '狐狸', '仓鼠', '龙'] },
    { category: '食物', items: ['草莓', '西瓜', '蛋糕', '冰淇淋', '苹果', '汉堡', '奶茶'] },
    { category: '自然', items: ['花朵', '树木', '星星', '爱心', '月亮', '太阳', '彩虹', '蘑菇', '雪花'] },
    { category: '表情', items: ['笑脸', '爱心眼', '哭脸'] },
    { category: '物品', items: ['钻石', '皇冠', '火箭', '音符', '相机', '房子'] },
  ]
  res.json({ code: 200, data: { keywords, tip: '输入以上关键词或自由描述，AI将生成拼豆像素图案' } })
})

export default router
