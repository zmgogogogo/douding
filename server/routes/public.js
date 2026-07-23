// ============================================
//  版本 + 公共接口路由
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { success } from '../utils/response.js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const router = Router()

// 健康检查（监控/负载均衡用）
router.get('/health', (req, res) => {
  try {
    // 检查数据库连接
    db.prepare('SELECT 1').get()
    res.json(success({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: process.version,
      db: 'connected',
    }))
  } catch (err) {
    res.status(503).json({ code: 503, message: '数据库连接异常' })
  }
})

// 版本信息
router.get('/public/app/version', (req, res) => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'))
    res.json(success({
      version: pkg.version,
      name: pkg.description,
      nodeEnv: process.env.NODE_ENV || 'development',
    }))
  } catch {
    res.json(success({ version: '2.0.0', name: '豆丁 - 在线拼豆图纸工具' }))
  }
})

// 公告
router.get('/public/announcement', (req, res) => {
  res.json(success({ status: 'none' }))
})

// AI 状态检查
router.get('/public/ai-status', (req, res) => {
  const replicate = !!process.env.REPLICATE_API_KEY
  const aliyun = !!process.env.ALIYUN_API_KEY
  const hasAI = replicate || aliyun
  res.json(success({
    cartoonEnabled: hasAI,
    provider: replicate ? 'Replicate' : aliyun ? '阿里云通义万相' : '本地处理',
    tip: hasAI ? 'AI Q版卡通化已就绪' : '配置 REPLICATE_API_KEY 或 ALIYUN_API_KEY 以启用 AI',
  }))
})

export default router
