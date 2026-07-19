// ============================================================
//  豆丁 (Douding) — 拼豆图纸工具 后端服务入口
//  Node.js + Express + SQLite
// ============================================================
import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { PORT } from './config.js'
import { initDB } from './db/schema.js'
import { seedBeads } from './db/seed.js'

// 路由导入
import authRoutes from './routes/auth.js'
import beadRoutes from './routes/beads.js'
import designRoutes from './routes/designs.js'
import exploreRoutes from './routes/explore.js'
import folderRoutes from './routes/folders.js'
import inventoryRoutes from './routes/inventory.js'
import imageRoutes from './routes/image.js'
import exportRoutes from './routes/export.js'
import ocrRoutes from './routes/ocr.js'
import crawlerRoutes from './routes/crawler.js'
import aiRoutes from './routes/ai.js'
import paletteRoutes from './routes/palette.js'
import publicRoutes from './routes/public.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
//  应用初始化
// ============================================
const app = express()

// 中间件
app.use(express.json({ limit: '50mb' }))
app.use(express.static(path.join(__dirname, '..', 'public')))

// 数据库初始化
initDB()
seedBeads()

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// ============================================
//  路由挂载
// ============================================

// 认证
app.use('/api/auth', authRoutes)

// 珠子数据
app.use('/api/beads', beadRoutes)

// 设计 CRUD + 点赞
app.use('/api/designs', designRoutes)

// 发现页 + 搜索
app.use('/api', exploreRoutes)

// 文件夹管理
app.use('/api', folderRoutes)

// 库存 + 用户主页
app.use('/api', inventoryRoutes)

// 图片处理（上传 + 图片转图纸）
app.use('/api', imageRoutes)

// 高清导出
app.use('/api', exportRoutes)

// OCR 识别
app.use('/api', ocrRoutes)

// 外部链接导入
app.use('/api', crawlerRoutes)

// AI 文字生成图纸
app.use('/api', aiRoutes)

// AI 智能配色助手
app.use('/api', paletteRoutes)

// 每日挑战
import challengeRoutes from './routes/challenges.js'
app.use('/api', challengeRoutes)

// 打印导出
import printRoutes from './routes/print.js'
app.use('/api', printRoutes)

// 版本 + 公告
app.use('/api', publicRoutes)

// 首页（Banner / 推荐 / 内容流）
import homeRoutes from './routes/home.js'
app.use('/api', homeRoutes)

// Multer / API 错误处理（避免返回 HTML 导致前端 JSON 解析失败）
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ code: 413, message: '图片过大，请压缩后重试（最大 30MB）' })
    }
    return res.status(400).json({ code: 400, message: err.message || '上传失败' })
  }
  if (req.path.startsWith('/api/')) {
    console.error('API 错误:', err)
    return res.status(500).json({ code: 500, message: err.message || '服务器错误' })
  }
  next(err)
})

// ============================================
//  生产模式：Serve 构建后的前端 SPA
// ============================================
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ============================================
//  启动服务
// ============================================
app.listen(PORT, () => {
  console.log(`🧩 豆丁 Douding 服务已启动 → http://localhost:${PORT}`)
  console.log(`   API 端点: http://localhost:${PORT}/api`)
  console.log(`   前端开发: npm run dev`)
})

export default app
