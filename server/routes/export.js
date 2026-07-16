// ============================================
//  导出路由 — 高清 PNG + 批量 ZIP 导出
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { exportHighRes, exportBatch, exportPDF } from '../services/export.js'
import { safeParseJSON } from '../utils/helpers.js'

const router = Router()

// 单图高清导出
router.post('/export/grid', authOptional, async (req, res) => {
  try {
    const { gridData, gridWidth, gridHeight, scale = 10, showGrid = false, bgColor = '#f0f0f0' } = req.body || {}

    const grid = (typeof gridData === 'string') ? safeParseJSON(gridData) : gridData
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '无效的网格数据' })
    }

    const pngBuffer = await exportHighRes(grid, gridWidth, gridHeight, {
      scale: parseInt(scale),
      showGrid: !!showGrid,
      bgColor
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="拼豆_${gridWidth}x${gridHeight}_高清.png"`)
    res.send(pngBuffer)
  } catch (e) {
    console.error('导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// 按设计 ID 导出
router.post('/export/design/:id', authOptional, async (req, res) => {
  try {
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
    if (!design) return res.status(404).json({ code: 404, message: '设计不存在' })

    const { scale = 10, showGrid = false, bgColor = '#f0f0f0' } = req.body || {}
    const grid = safeParseJSON(design.grid_data)

    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const pngBuffer = await exportHighRes(grid, design.grid_width, design.grid_height, {
      scale: parseInt(scale),
      showGrid: !!showGrid,
      bgColor
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="${design.title}_${design.grid_width}x${design.grid_height}.png"`)
    res.send(pngBuffer)
  } catch (e) {
    console.error('导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// 批量导出
router.post('/export/batch', authRequired, async (req, res) => {
  try {
    const { designIds, scale = 10, format = 'png' } = req.body || {}
    if (!designIds || !Array.isArray(designIds) || designIds.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要导出的设计' })
    }

    const designs = []
    for (const id of designIds) {
      const d = db.prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?').get(id, req.user.id)
      if (d) {
        designs.push({
          grid: safeParseJSON(d.grid_data),
          gridW: d.grid_width,
          gridH: d.grid_height,
          title: d.title
        })
      }
    }

    if (designs.length === 0) {
      return res.status(404).json({ code: 404, message: '没有找到可导出的设计' })
    }

    const zipBuffer = await exportBatch(designs, { scale: parseInt(scale) })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="拼豆批量导出_${designs.length}张.zip"`)
    res.send(zipBuffer)
  } catch (e) {
    console.error('批量导出失败:', e)
    res.status(500).json({ code: 500, message: '批量导出失败: ' + e.message })
  }
})

// PDF 导出（含色号标注 + 材料清单）
router.post('/export/pdf', authOptional, async (req, res) => {
  try {
    const { gridData, gridWidth, gridHeight, title, showLabels = true, bgColor } = req.body || {}
    const grid = (typeof gridData === 'string') ? safeParseJSON(gridData) : gridData
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '无效的网格数据' })
    }

    const pdfBuffer = await exportPDF(grid, gridWidth, gridHeight, {
      title: title || '拼豆图纸',
      showLabels: !!showLabels,
      bgColor
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="拼豆_${gridWidth}x${gridHeight}_图纸.pdf"`)
    res.send(pdfBuffer)
  } catch (e) {
    console.error('PDF 导出失败:', e)
    res.status(500).json({ code: 500, message: 'PDF 导出失败: ' + e.message })
  }
})

// 跨品牌色号映射查询
router.get('/export/color-map', async (req, res) => {
  try {
    const { findCrossBrandAlternative, loadBeadColors } = await import('../services/colorMatch.js')
    const { sourceHex, targetBrand } = req.query
    if (!sourceHex || !targetBrand) {
      return res.status(400).json({ code: 400, message: '请提供 sourceHex 和 targetBrand 参数' })
    }
    const result = findCrossBrandAlternative(sourceHex, targetBrand)
    res.json({ code: 200, data: result })
  } catch (e) {
    console.error('色号映射失败:', e)
    res.status(500).json({ code: 500, message: '色号映射失败: ' + e.message })
  }
})

export default router
