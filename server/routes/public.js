// ============================================
//  版本 + 公共接口路由
// ============================================
import { Router } from 'express'

const router = Router()

router.get('/public/app/version', (req, res) => {
  res.json({ code: 200, data: { latestVersion: '2.0.0', apkEnabled: false } })
})

router.get('/public/announcement', (req, res) => {
  res.json({ code: 200, data: { status: 'none' } })
})

// AI 状态检查
router.get('/public/ai-status', (req, res) => {
  const hasAI = !!process.env.ALIYUN_API_KEY
  res.json({
    code: 200,
    data: {
      cartoonEnabled: hasAI,
      provider: hasAI ? '阿里云通义万相' : '本地处理（效果有限）',
      tip: hasAI ? 'AI Q版卡通化已就绪' : '配置 ALIYUN_API_KEY 环境变量以启用 AI 增强效果',
      setupGuide: hasAI ? null : 'https://dashscope.console.aliyun.com/apiKey'
    }
  })
})

export default router
