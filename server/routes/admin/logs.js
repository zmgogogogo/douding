// ============================================
//  操作日志路由 — 列表/详情/统计
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'

const router = Router()

// 操作日志列表（分页 + 筛选）
router.get('/', adminRequired, (req, res) => {
  try {
    const {
      page = 1, limit = 20, adminId, module, action,
      startDate, endDate, keyword,
    } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (adminId) {
      where += ' AND admin_id = ?'
      params.push(parseInt(adminId))
    }
    if (module) {
      where += ' AND module = ?'
      params.push(module)
    }
    if (action) {
      where += ' AND action = ?'
      params.push(action)
    }
    if (startDate) {
      where += ' AND date(created_at) >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND date(created_at) <= ?'
      params.push(endDate)
    }
    if (keyword) {
      where += ' AND (admin_name LIKE ? OR detail LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM sys_operation_logs ${where}`).get(...params)
    const list = db.prepare(
      `SELECT * FROM sys_operation_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取日志列表错误:', err)
    res.status(500).json(fail(500, '获取日志列表失败'))
  }
})

// 日志详情
router.get('/:id', adminRequired, (req, res) => {
  try {
    const log = db.prepare('SELECT * FROM sys_operation_logs WHERE id = ?').get(req.params.id)
    if (!log) return res.status(404).json(fail(404, '日志不存在'))
    res.json(success(log))
  } catch (err) {
    res.status(500).json(fail(500, '获取日志详情失败'))
  }
})

// 日志统计
router.get('/stats/summary', adminRequired, (req, res) => {
  try {
    // 各模块操作量
    const byModule = db.prepare(
      'SELECT module, COUNT(*) as count FROM sys_operation_logs GROUP BY module ORDER BY count DESC'
    ).all()

    // 各操作类型统计
    const byAction = db.prepare(
      'SELECT action, COUNT(*) as count FROM sys_operation_logs GROUP BY action ORDER BY count DESC'
    ).all()

    // 今日操作量
    const todayCount = db.prepare(
      "SELECT COUNT(*) as c FROM sys_operation_logs WHERE date(created_at) = date('now')"
    ).get().c

    // 本月操作量
    const monthCount = db.prepare(
      "SELECT COUNT(*) as c FROM sys_operation_logs WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    ).get().c

    // 失败率
    const total = db.prepare('SELECT COUNT(*) as c FROM sys_operation_logs').get().c
    const failed = db.prepare('SELECT COUNT(*) as c FROM sys_operation_logs WHERE status = 0').get().c

    res.json(success({
      byModule,
      byAction,
      todayCount,
      monthCount,
      totalCount: total,
      failedCount: failed,
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(2) + '%' : '0%',
    }))
  } catch (err) {
    console.error('获取日志统计错误:', err)
    res.status(500).json(fail(500, '获取日志统计失败'))
  }
})

export default router
