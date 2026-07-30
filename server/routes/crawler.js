// ============================================
//  外部链接导入路由 — 小红书链接解析与导入
//  文档规范：两阶段流程 — ① 解析链接 → ② 选择图片提交转图
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'

const router = Router()

/**
 * 阶段一：解析小红书链接
 * POST /api/crawler/parse
 * 返回笔记元数据（标题、作者、封面、图片列表），不下载图片
 */
router.post('/crawler/parse', authOptional, async (req, res) => {
  const { url } = req.body || {}

  if (!url) {
    return res.status(400).json({ code: 4001, message: '请输入小红书笔记链接' })
  }

  try {
    const { parseXhsLink } = await import('../services/crawler.js')
    const result = await parseXhsLink(url)

    res.json({
      code: 200,
      data: {
        noteId: result.noteId,
        title: result.title,
        authorName: result.authorName,
        coverUrl: result.coverUrl,
        imageUrls: result.imageUrls,
        imageCount: result.imageCount,
        sourceUrl: result.sourceUrl,
      },
    })
  } catch (e) {
    console.error('[爬虫] 链接解析失败:', e.message)

    // 根据错误信息返回对应错误码
    const msg = e.message
    if (msg.includes('格式无效') || msg.includes('有效的小红书')) {
      return res.status(400).json({ code: 4001, message: msg })
    }
    if (msg.includes('不存在') || msg.includes('已删除')) {
      return res.status(404).json({ code: 4002, message: msg })
    }
    if (msg.includes('私密') || msg.includes('登录')) {
      return res.status(403).json({ code: 4003, message: msg })
    }
    if (msg.includes('超时')) {
      return res.status(504).json({ code: 4004, message: msg })
    }
    if (msg.includes('未能') || msg.includes('手动')) {
      return res.status(422).json({ code: 4004, message: msg })
    }

    res.status(500).json({ code: 5001, message: '解析失败: ' + msg })
  }
})

/**
 * 阶段二：下载选中图片并提交转图
 * POST /api/crawler/convert
 * 下载用户选中的图片 → 转存到本地 → 提交 Python 转图引擎
 */
router.post('/crawler/convert', authOptional, async (req, res) => {
  const { noteId, imageUrls, brand, targetWidth = 58, copyrightAgreed } = req.body || {}

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ code: 400, message: '请选择要转换的图片' })
  }

  if (!copyrightAgreed) {
    return res.status(400).json({ code: 4007, message: '请先确认版权声明' })
  }

  try {
    const { downloadImage } = await import('../services/crawler.js')
    const path = await import('path')
    const fs = await import('fs')
    const { v4: uuidv4 } = await import('uuid')
    const { fileURLToPath } = await import('url')
    const http = await import('http')

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads')

    // 下载所有选中图片
    const downloadedPaths = []
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const ext = path.extname(new URL(imageUrls[i]).pathname) || '.jpg'
        const filename = `xhs_${noteId || 'import'}_${i}_${uuidv4().slice(0, 8)}${ext}`
        const savePath = path.join(uploadsDir, filename)
        await downloadImage(imageUrls[i], savePath)
        downloadedPaths.push({
          localPath: savePath,
          publicPath: `/uploads/${filename}`,
          originalUrl: imageUrls[i],
        })
      } catch (e) {
        console.error(`[爬虫] 图片 ${i} 下载失败:`, e.message)
        // 单张图片下载失败不阻塞其他图片
      }
    }

    if (downloadedPaths.length === 0) {
      return res.status(500).json({ code: 5001, message: '所有图片下载失败，请稍后重试' })
    }

    // 将第一张图片提交到 Python 转图引擎
    // 多图场景后续可扩展为批量提交
    const firstImage = downloadedPaths[0]

    // 读取本地文件并通过代理转发到 Python 后端
    const imageBuffer = fs.readFileSync(firstImage.localPath)
    const boundary = `----FormBoundary${uuidv4()}`
    const parts = []
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="targetWidth"\r\n\r\n${targetWidth}`))
    parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(firstImage.localPath)}"\r\nContent-Type: image/png\r\n\r\n`))
    parts.push(imageBuffer)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
    if (brand) {
      // 在 brand 部分之前插入
      parts.splice(1, 0, Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="brand"\r\n\r\n${brand}`))
    }
    const body = Buffer.concat(parts)

    // 调用 Python 转图服务
    const convertResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3457,
        path: '/api/image-to-grid',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        timeout: 60000,
      }

      const proxyReq = http.request(options, (proxyRes) => {
        let data = ''
        proxyRes.on('data', (chunk) => (data += chunk))
        proxyRes.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            resolve({ code: proxyRes.statusCode, data })
          }
        })
      })

      proxyReq.on('error', (err) => reject(new Error(`转图服务连接失败: ${err.message}`)))
      proxyReq.on('timeout', () => {
        proxyReq.destroy()
        reject(new Error('转图处理超时'))
      })

      proxyReq.write(body)
      proxyReq.end()
    })

    res.json({
      code: 200,
      data: {
        taskId: noteId || uuidv4(),
        imageCount: downloadedPaths.length,
        skippedCount: imageUrls.length - downloadedPaths.length,
        convertResult,
        downloadedImages: downloadedPaths.map((d) => d.publicPath),
      },
    })
  } catch (e) {
    console.error('[爬虫] 转图失败:', e)
    res.status(500).json({ code: 5001, message: '转图处理失败: ' + e.message })
  }
})

/**
 * [保留] 旧版一键解析+下载接口（向后兼容）
 * POST /api/crawler/import
 */
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

    if (result.imageUrls.length > 0) {
      const ext = path.extname(new URL(result.imageUrls[0]).pathname) || '.jpg'
      const filename = `crawled_${uuidv4()}${ext}`
      imagePath = path.join(uploadsDir, filename)
      try {
        await downloadImage(result.imageUrls[0], imagePath)
      } catch (e) {
        console.error('[爬虫] 图片下载失败:', e.message)
      }
    }

    res.json({
      code: 200,
      data: {
        noteId: result.noteId,
        sourceUrl: result.sourceUrl,
        title: result.title,
        authorName: result.authorName,
        images: result.imageUrls,
        imageCount: result.imageCount,
        imagePath: imagePath ? `/uploads/${path.basename(imagePath)}` : null,
      },
    })
  } catch (e) {
    const msg = e.message
    if (msg.includes('格式无效') || msg.includes('有效的小红书')) {
      return res.status(400).json({ code: 4001, message: msg })
    }
    if (msg.includes('不存在') || msg.includes('已删除')) {
      return res.status(404).json({ code: 4002, message: msg })
    }
    if (msg.includes('私密') || msg.includes('登录')) {
      return res.status(403).json({ code: 4003, message: msg })
    }
    if (msg.includes('未安装')) {
      return res.status(503).json({
        code: 503,
        message: e.message,
        hint: '请管理员在服务器上运行: npm install cheerio',
      })
    }
    console.error('[爬虫] 链接解析失败:', e.message)
    res.status(500).json({ code: 5001, message: '链接解析失败: ' + e.message })
  }
})

export default router
