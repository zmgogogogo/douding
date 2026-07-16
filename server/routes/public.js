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

export default router
