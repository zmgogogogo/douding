// ============================================
//  AI 生成路由 — 文本描述 → 拼豆像素图案
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'
import { generateFromText } from '../services/ai.js'

const router = Router()

/**
 * POST /api/ai/generate
 * 输入文字描述，AI 生成拼豆图纸
 * body: { prompt, width?, height?, brand? }
 */
router.post('/ai/generate', authOptional, async (req, res) => {
  try {
    const { prompt, width = 32, height = 32, brand = 'Hama' } = req.body || {}

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ code: 400, message: '请输入图案描述，例如：小猫、草莓、爱心' })
    }

    const targetW = Math.min(64, Math.max(8, parseInt(width) || 32))
    const targetH = Math.min(64, Math.max(8, parseInt(height) || 32))

    const result = generateFromText(prompt, targetW, targetH, brand)

    if (result.error) {
      return res.status(400).json({ code: 400, message: result.error })
    }

    res.json({
      code: 200,
      data: {
        grid: result.grid,
        gridWidth: result.gridW,
        gridHeight: result.gridH,
        keyword: result.matchedKeyword,
        message: result.message
      }
    })
  } catch (e) {
    console.error('AI 生成失败:', e)
    res.status(500).json({ code: 500, message: 'AI 生成失败: ' + e.message })
  }
})

/**
 * GET /api/ai/templates
 * 获取支持的模板关键词列表（供 UI 提示用）
 */
router.get('/ai/templates', (req, res) => {
  const keywords = [
    { category: '动物', items: ['猫', '狗', '兔子', '小熊'] },
    { category: '食物', items: ['草莓', '西瓜', '蛋糕', '冰淇淋', '苹果'] },
    { category: '自然', items: ['花朵', '树木', '星星', '爱心', '月亮', '太阳', '彩虹'] },
    { category: '表情', items: ['笑脸', '爱心眼'] },
    { category: '像素经典', items: ['蘑菇', '钻石', '幽灵', '像素剑'] },
  ]
  res.json({ code: 200, data: { keywords, tip: '输入以上关键词或自由描述，AI将生成拼豆像素图案' } })
})

export default router
