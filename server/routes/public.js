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
  const replicate = !!process.env.REPLICATE_API_KEY
  const aliyun = !!process.env.ALIYUN_API_KEY
  const hasAI = replicate || aliyun
  res.json({
    code: 200,
    data: {
      cartoonEnabled: hasAI,
      provider: replicate ? 'Replicate (retro-diffusion)' : aliyun ? '阿里云通义万相' : '本地处理',
      tip: hasAI ? 'AI Q版卡通化已就绪' : '配置 REPLICATE_API_KEY 或 ALIYUN_API_KEY 以启用 AI',
      setupGuide: hasAI ? null : 'https://replicate.com/account/api-tokens'
    }
  })
})

export default router
