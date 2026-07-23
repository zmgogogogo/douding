// ============================================
//  外部链接导入路由 — 小红书链接解析
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'

const router = Router()

// 解析外部链接并提取图片
router.post('/crawler/import', authOptional, async (req, res) => {
  const { url, targetWidth = 58, brand } = req.body || {}

  if (!url) return res.status(400).json({ code: 400, message: '请输入链接' })

  try {
    const { parseXhsLink, downloadImage } = await import('../services/crawler.js')
    const result = await parseXhsLink(url)

    // 下载第一张图片
    let imagePath = null
    const fs = await import('fs')
    const path = await import('path')
    const { v4: uuidv4 } = await import('uuid')
    const { fileURLToPath } = await import('url')

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads')

    if (result.images.length > 0) {
      const ext = path.extname(result.images[0]) || '.jpg'
      const filename = `crawled_${uuidv4()}${ext}`
      imagePath = path.join(uploadsDir, filename)
      await downloadImage(result.images[0], imagePath)
    }

    res.json({
      code: 200,
      data: {
        sourceUrl: result.sourceUrl,
        title: result.title,
        images: result.images,
        imagePath: imagePath ? `/uploads/${path.basename(imagePath)}` : null,
      },
    })
  } catch (e) {
    // cheerio 未安装 → 返回提示
    if (e.message.includes('未安装')) {
      return res.status(503).json({
        code: 503,
        message: e.message,
        hint: '请管理员在服务器上运行: npm install cheerio',
      })
    }
    console.error('链接解析失败:', e)
    res.status(500).json({ code: 500, message: '链接解析失败: ' + e.message })
  }
})

export default router
