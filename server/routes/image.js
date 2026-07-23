// ============================================
//  图片处理路由 — 上传 + Q版风格
//
//  📌 图片转像素图核心功能已迁移到 Python 后端（文档规范要求 Python 3.10+）。
//  server/index.js 中已配置代理中间件，将 /api/image-to-grid 和 /api/convert/*
//  请求流式转发到 Python FastAPI（端口 3457）。
//
//  本文件仅保留简单上传和 Q 版风格查询等轻量端点。
//  转换算法实现位于 server-python/services/ 目录。
// ============================================
import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { getStyleList, buildImageOptionsFromStyle, getStyleById } from '../services/qStyleTemplates.js'
import { photoToCartoon } from '../services/cartoonizer.js'

const router = Router()

// ============================================
//  简单图片上传
// ============================================
router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })
  res.json({ code: 200, data: { url: `/uploads/${req.file.filename}`, filename: req.file.filename } })
})

// ============================================
//  Q 版风格
// ============================================

// GET /api/image/qstyles — 获取 Q 版风格列表
router.get('/image/qstyles', (req, res) => {
  res.json({ code: 200, data: getStyleList() })
})

// GET /api/image/qstyle/:id — 获取单个风格详情
router.get('/image/qstyle/:id', (req, res) => {
  const style = getStyleById(req.params.id)
  if (!style) return res.status(404).json({ code: 404, message: '风格不存在' })
  res.json({ code: 200, data: style })
})

// POST /api/image/qcartoon — Q 版卡通化预处理
router.post('/image/qcartoon', authOptional, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })
  try {
    const style = req.body.style || 'anime'
    const targetW = parseInt(req.body.targetW) || 512
    const targetH = parseInt(req.body.targetH) || 512
    const fs = await import('fs')
    const cartoonBuffer = await photoToCartoon(req.file.path, { style, targetW, targetH })
    // 保存卡通化结果
    const outPath = req.file.path.replace(/(\.\w+)$/, '_cartoon$1')
    fs.writeFileSync(outPath, cartoonBuffer)
    const filename = outPath.split('/').pop()
    res.json({ code: 200, data: { url: `/uploads/${filename}`, filename } })
  } catch (e) {
    console.error('Q版卡通化失败:', e)
    res.status(500).json({ code: 500, message: '卡通化处理失败: ' + e.message })
  }
})

// ============================================
//  ⚠️ 以下端点已迁移到 Python 后端：
//    POST /api/image-to-grid  → Python :3457 (server-python/)
//    POST /api/convert/smart-submit → Python :3457
//    GET  /api/convert/status → Python :3457
//    POST /api/convert/preview → Python :3457
//  Node.js 不再处理这些请求，由 server/index.js 代理中间件转发。
// ============================================

export default router
