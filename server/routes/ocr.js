// ============================================
//  OCR 识别路由 — 上传图纸照片识别色号生成网格
// ============================================
import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { authOptional } from '../middleware/auth.js'
import { recognizeBeadPattern } from '../services/ocr.js'

const router = Router()

router.post('/ocr/recognize', authOptional, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })

  const gridRows = parseInt(req.body.gridRows) || 0
  const gridCols = parseInt(req.body.gridCols) || 0
  const brand = req.body.brand || null
  const raw = req.body.raw === 'true' || req.body.raw === '1'

  try {
    const result = await recognizeBeadPattern(req.file.path, {
      gridRows: gridRows > 0 ? gridRows : null,
      gridCols: gridCols > 0 ? gridCols : null,
      brand,
      raw
    })

    res.json({
      code: 200,
      data: {
        grid: result.grid,
        gridWidth: result.gridWidth,
        gridHeight: result.gridHeight,
        confidence: result.confidence
      }
    })
  } catch (e) {
    console.error('OCR 识别失败:', e)

    // 如果是Tesseract未安装，返回503提示
    if (e.message && e.message.includes('Cannot find module')) {
      return res.status(503).json({
        code: 503,
        message: 'OCR 引擎未安装',
        hint: '请运行 npm install tesseract.js 安装 OCR 引擎'
      })
    }

    res.status(500).json({ code: 500, message: '识别失败: ' + (e.message || '未知错误') })
  }
})

export default router
