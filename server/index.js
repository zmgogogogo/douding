// ============================================================
//  豆丁 (Douding) — 拼豆图纸工具 后端服务入口
//  Node.js + Express + SQLite
// ============================================================
import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
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
import { responseMiddleware } from './utils/response.js'
import { errorHandler } from './middleware/errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ============================================
//  应用初始化
// ============================================
const app = express()

// ============================================
//  安全与基础中间件
// ============================================

// CORS（跨域资源共享）
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://douding.com', 'https://www.douding.com'] // 生产环境白名单
        : true, // 开发环境允许所有来源
    credentials: true,
    maxAge: 86400,
  })
)

// 全局速率限制（防止暴力攻击）
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 500, // 最多 500 次请求
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
})
app.use('/api', globalLimiter)

// 认证端点严格速率限制（防止暴力破解）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 15 分钟内最多 20 次
  skipSuccessfulRequests: true, // 成功登录不计入限制
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

// Body 解析 + 响应格式统一
app.use(express.json({ limit: '50mb' }))
app.use(responseMiddleware)
app.use(express.static(path.join(__dirname, '..', 'public')))

// 数据库初始化
initDB()
seedBeads()

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// ============================================
//  图片转换代理 → Python 后端 (端口 3457)
//  文档规范：图像转换算法使用 Python 3.10+ 实现
//  Node.js 仅作为反向代理，将请求流式转发到 Python FastAPI
// ============================================

/**
 * 将请求代理到 Python 后端的中间件
 * 直接 pipe 原始请求流（保留 multipart 文件上传），不经过 Express body parser
 */
function proxyToPython(targetPath) {
  return (req, res) => {
    const options = {
      hostname: 'localhost',
      port: 3457,
      path: targetPath || req.originalUrl,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3457' },
    }

    const proxyReq = http.request(options, (proxyRes) => {
      // 转发响应头和状态码
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', (err) => {
      console.error(`[代理] Python 后端连接失败: ${err.message}`)
      res.status(502).json({
        code: 502,
        message: 'Python 转换服务未启动，请确保 Python 后端运行在端口 3457',
      })
    })

    // 设置超时（图片转换可能需要较长时间）
    proxyReq.setTimeout(120000, () => {
      proxyReq.destroy()
      if (!res.headersSent) {
        res.status(504).json({ code: 504, message: '转换超时，请尝试更小的图片或关闭智能优化' })
      }
    })

    // 将原始请求流 pipe 到 Python（保留 multipart body）
    req.pipe(proxyReq)
  }
}

// 图像转换相关路由 → 全部代理到 Python
app.use('/api/image-to-grid', proxyToPython())
app.use('/api/convert', proxyToPython())

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

// 统一错误处理（捕获 AppError + Multer 错误 + 未预期异常）
app.use(errorHandler)

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
