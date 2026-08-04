// ============================================
//  导出路由 — 权限校验 + 格式导出 + 下载记录
//  文档参考：.claude/导出.md
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { exportHighRes, exportBatch, exportPDF, exportSVGString, exportJSONData, exportCSVString } from '../services/export.js'
import { safeParseJSON } from '../utils/helpers.js'

const router = Router()

// ============================================
//  导出权限校验中间件
//  规则：必须登录 + 必须已点赞 + 作品状态正常
// ============================================
function requireExportPermission(req, res, next) {
  const designId = req.params.id || req.body?.designId
  if (!designId) {
    return res.status(400).json({ code: 400, message: '缺少作品 ID' })
  }

  // 1. 登录校验
  if (!req.user) {
    return res.status(401).json({ code: 401, message: '请先登录' })
  }

  // 2. 作品状态校验
  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(designId)
  if (!design || design.status !== 1) {
    return res.status(404).json({ code: 404, message: '作品不存在或已下架' })
  }

  // 3. 点赞校验（作者本人可免点赞导出自己的作品）
  if (design.user_id !== req.user.id) {
    const liked = db.prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?').get(req.user.id, designId)
    if (!liked) {
      return res.status(403).json({ code: 403, message: '请先点赞该作品后再下载图纸' })
    }
  }

  req._exportDesign = design
  next()
}

// ============================================
//  简易限流：单用户每分钟最多 5 次导出
// ============================================
const rateLimitMap = new Map()
function exportRateLimit(req, res, next) {
  const uid = req.user?.id
  if (!uid) return next()

  const now = Date.now()
  const key = `export_${uid}`
  const record = rateLimitMap.get(key)

  if (record && now - record.start < 60000) {
    record.count++
    if (record.count > 5) {
      return res.status(429).json({ code: 429, message: '导出过于频繁，请1分钟后再试' })
    }
  } else {
    rateLimitMap.set(key, { start: now, count: 1 })
  }

  next()
}

// 清理过期限流记录（每5分钟）
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateLimitMap) {
    if (now - v.start > 60000) rateLimitMap.delete(k)
  }
}, 300000)

// ============================================
//  下载记录写入
// ============================================
function logDownload(userId, designId, format) {
  try {
    db.prepare('INSERT INTO download_logs (user_id, design_id, format) VALUES (?, ?, ?)').run(userId, designId, format)
  } catch { /* 记录失败不影响导出 */ }
}

// RFC 5987 编码中文文件名
function attachmentFilename(name) {
  const encoded = encodeURIComponent(name).replace(/['()]/g, escape).replace(/\*/g, '%2A')
  return `attachment; filename="${name.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encoded}`
}

// ============================================
//  GET /api/export/downloads — 我的下载记录
// ============================================
router.get('/export/downloads', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
    const rows = db.prepare(
      `SELECT dl.*, d.title, d.grid_width, d.grid_height
       FROM download_logs dl JOIN designs d ON dl.design_id = d.id
       WHERE dl.user_id = ? ORDER BY dl.created_at DESC LIMIT ? OFFSET ?`
    ).all(req.user.id, parseInt(limit), offset)
    const total = db.prepare('SELECT COUNT(*) as c FROM download_logs WHERE user_id = ?').get(req.user.id).c
    res.json({ code: 200, data: { list: rows, total, page: parseInt(page), hasMore: offset + rows.length < total } })
  } catch (e) {
    console.error('获取下载记录失败:', e)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  POST /api/export/png/:id — PNG 高清导出
// ============================================
router.post('/export/png/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const { scale = 2, showGrid = true, showLabels = false, mode = 'full', bgColor } = req.body || {}
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    let opts = {
      scale: Math.min(5, Math.max(1, parseInt(scale) || 2)),
      showGrid: mode === 'full' ? !!showGrid : false,
      showLabels: mode === 'full' ? !!showLabels : false,
      bgColor: bgColor || undefined,
    }

    if (req.body.transparentBg) opts.bgColor = 'transparent'

    const pngBuffer = await exportHighRes(grid, design.grid_width, design.grid_height, opts)

    logDownload(req.user.id, design.id, 'png')
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_${design.grid_width}x${design.grid_height}.png`))
    res.send(pngBuffer)
  } catch (e) {
    console.error('PNG导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  POST /api/export/pdf/:id — PDF 施工图纸导出
// ============================================
router.post('/export/pdf/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const { mode = 'color', lossRate = 5, showLabels = true } = req.body || {}
    const pdfBuffer = await exportPDF(grid, design.grid_width, design.grid_height, {
      title: design.title,
      author: design.author_nickname || '',
      showLabels: !!showLabels,
      mode: mode || 'color',
      lossRate: parseFloat(lossRate) || 5,
    })

    logDownload(req.user.id, design.id, 'pdf')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_施工图纸.pdf`))
    res.send(pdfBuffer)
  } catch (e) {
    console.error('PDF导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  POST /api/export/svg/:id — SVG 矢量导出
// ============================================
router.post('/export/svg/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const svgString = exportSVGString(grid, design.grid_width, design.grid_height)

    logDownload(req.user.id, design.id, 'svg')
    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_矢量.svg`))
    res.send(svgString)
  } catch (e) {
    console.error('SVG导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  POST /api/export/json/:id — JSON 工程文件导出
// ============================================
router.post('/export/json/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const author = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(design.user_id)
    const jsonData = exportJSONData(grid, design, author)

    logDownload(req.user.id, design.id, 'json')
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_工程源文件.json`))
    res.json({ code: 200, data: jsonData })
  } catch (e) {
    console.error('JSON导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  POST /api/export/csv/:id — CSV 物料清单导出
// ============================================
router.post('/export/csv/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const { lossRate = 5 } = req.body || {}
    const csvString = exportCSVString(grid, design, parseFloat(lossRate) || 5)

    logDownload(req.user.id, design.id, 'csv')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_物料清单.csv`))
    // BOM 保证 Excel 正确识别 UTF-8
    res.send('﻿' + csvString)
  } catch (e) {
    console.error('CSV导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  POST /api/export/zip/:id — 全格式 ZIP 打包
// ============================================
router.post('/export/zip/:id', authRequired, requireExportPermission, exportRateLimit, async (req, res) => {
  try {
    const design = req._exportDesign
    const grid = safeParseJSON(design.grid_data)
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '网格数据已损坏' })
    }

    const author = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(design.user_id)
    const { formats = ['pdf', 'png', 'csv', 'svg', 'json'], lossRate = 5 } = req.body || {}

    // 异步生成各类文件并打包
    const designs = [{
      grid,
      gridW: design.grid_width,
      gridH: design.grid_height,
      title: design.title,
      author: author?.nickname || '',
      lossRate: parseFloat(lossRate) || 5,
    }]

    const zipBuffer = await exportBatch(designs, { formats, scale: 2 })

    logDownload(req.user.id, design.id, 'zip')
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', attachmentFilename(`${design.title}_全套图纸.zip`))
    res.send(zipBuffer)
  } catch (e) {
    console.error('ZIP导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// ============================================
//  兼容旧接口（保留向后兼容）
// ============================================

// 单图高清导出（免权限，编辑器内导出）
router.post('/export/grid', async (req, res) => {
  try {
    const { gridData, gridWidth, gridHeight, scale = 2, showGrid = false, bgColor = '#f0f0f0' } = req.body || {}
    const grid = typeof gridData === 'string' ? safeParseJSON(gridData) : gridData
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '无效的网格数据' })
    }

    const pngBuffer = await exportHighRes(grid, gridWidth, gridHeight, {
      scale: parseInt(scale),
      showGrid: !!showGrid,
      bgColor,
    })

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', attachmentFilename(`拼豆_${gridWidth}x${gridHeight}_高清.png`))
    res.send(pngBuffer)
  } catch (e) {
    console.error('导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败: ' + e.message })
  }
})

// PDF 导出（免权限，编辑器内使用，直接传 gridData）
router.post('/export/pdf', async (req, res) => {
  try {
    const { gridData, gridWidth, gridHeight, title, showLabels = true, bgColor } = req.body || {}
    const grid = typeof gridData === 'string' ? safeParseJSON(gridData) : gridData
    if (!grid || !Array.isArray(grid)) {
      return res.status(400).json({ code: 400, message: '无效的网格数据' })
    }

    const pdfBuffer = await exportPDF(grid, gridWidth, gridHeight, {
      title: title || '拼豆图纸',
      showLabels: !!showLabels,
      bgColor,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', attachmentFilename(`拼豆_${gridWidth}x${gridHeight}_图纸.pdf`))
    res.send(pdfBuffer)
  } catch (e) {
    console.error('PDF 导出失败:', e)
    res.status(500).json({ code: 500, message: 'PDF 导出失败: ' + e.message })
  }
})

// 按设计 ID 导出 PNG（免权限，兼容旧版）
router.get('/export/png', (req, res) => {
  // 转发到 POST 版本
  req.method = 'POST'
  req.url = '/api/export/png/' + (req.query.designId || '0')
  router.handle(req, res)
})

export default router
