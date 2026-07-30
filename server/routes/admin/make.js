// ============================================
//  管理后台 — 制作模式管理路由
//  制作数据看板 + 记录管理 + 排行
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { getMakeRanking, getMakeRecordList } from '../../services/admin/dashboard.js'

const router = Router()

// GET /api/admin/make/stats — 制作数据看板
router.get('/stats', adminRequired, (req, res) => {
  try {
    const makeStats = {
      totalSessions: db.prepare('SELECT COUNT(*) as c FROM make_sessions').get().c,
      completed: db.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE status = 'completed'").get().c,
      inProgress: db.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE status = 'in_progress'").get().c,
      todayCompleted: db.prepare(
        "SELECT COUNT(*) as c FROM make_sessions WHERE date(updated_at) = date('now') AND status = 'completed'"
      ).get().c,
      todayActive: db.prepare(
        "SELECT COUNT(DISTINCT user_id) as c FROM make_sessions WHERE date(updated_at) = date('now')"
      ).get().c,
      byMode: {
        color: db.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE step_mode = 'color' AND status = 'completed'").get().c,
        region: db.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE step_mode = 'region' AND status = 'completed'").get().c,
        layer: db.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE step_mode = 'layer' AND status = 'completed'").get().c,
      },
    }

    res.json(success(makeStats))
  } catch (err) {
    console.error('获取制作统计错误:', err)
    res.status(500).json(fail(500, '获取统计失败'))
  }
})

// GET /api/admin/make/ranking — 图纸制作排行
router.get('/ranking', adminRequired, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const data = getMakeRanking(db, limit)
    res.json(success(data))
  } catch (err) {
    console.error('获取制作排行错误:', err)
    res.status(500).json(fail(500, '获取排行失败'))
  }
})

// GET /api/admin/make/records — 制作记录管理列表
router.get('/records', adminRequired, (req, res) => {
  try {
    const { page = 1, limit = 20, userId, designId, startDate, endDate } = req.query
    const data = getMakeRecordList(db, {
      page: parseInt(page),
      limit: parseInt(limit),
      userId: userId ? parseInt(userId) : null,
      designId: designId ? parseInt(designId) : null,
      startDate,
      endDate,
    })
    res.json(paginated(data.list, data.total, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取制作记录错误:', err)
    res.status(500).json(fail(500, '获取记录失败'))
  }
})

export default router
