// ============================================
//  数据看板路由 — KPI 统计 + 图表数据
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail } from '../../utils/response.js'
import {
  getDashboardStats,
  getTrendData,
  getTopDesigns,
  getBrandDistribution,
  getRecentLogs,
  getContentStatusDistribution,
} from '../../services/admin/dashboard.js'

const router = Router()

// 获取看板全部数据
router.get('/stats', adminRequired, (req, res) => {
  try {
    const stats = getDashboardStats(db)
    res.json(success(stats))
  } catch (err) {
    console.error('获取统计数据错误:', err)
    res.status(500).json(fail(500, '获取统计数据失败'))
  }
})

// 获取趋势数据
router.get('/trends', adminRequired, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const data = getTrendData(db, Math.min(days, 365))
    res.json(success(data))
  } catch (err) {
    console.error('获取趋势数据错误:', err)
    res.status(500).json(fail(500, '获取趋势数据失败'))
  }
})

// 获取热门设计排行
router.get('/top-designs', adminRequired, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const data = getTopDesigns(db, limit)
    res.json(success(data))
  } catch (err) {
    console.error('获取热门设计错误:', err)
    res.status(500).json(fail(500, '获取热门设计失败'))
  }
})

// 获取品牌分布
router.get('/brand-distribution', adminRequired, (req, res) => {
  try {
    const data = getBrandDistribution(db)
    res.json(success(data))
  } catch (err) {
    console.error('获取品牌分布错误:', err)
    res.status(500).json(fail(500, '获取品牌分布失败'))
  }
})

// 获取内容状态分布
router.get('/content-status', adminRequired, (req, res) => {
  try {
    const data = getContentStatusDistribution(db)
    res.json(success(data))
  } catch (err) {
    console.error('获取内容状态错误:', err)
    res.status(500).json(fail(500, '获取内容状态失败'))
  }
})

// 获取最近操作日志
router.get('/recent-logs', adminRequired, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const data = getRecentLogs(db, limit)
    res.json(success(data))
  } catch (err) {
    console.error('获取操作日志错误:', err)
    res.status(500).json(fail(500, '获取操作日志失败'))
  }
})

export default router
