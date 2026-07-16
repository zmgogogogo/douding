// ============================================
//  发现页 + 搜索路由
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authOptional } from '../middleware/auth.js'
import { formatDesign } from '../utils/helpers.js'

const router = Router()

// 发现广场（公开设计列表）
router.get('/explore', authOptional, (req, res) => {
  const { page = 1, limit = 24, sort = 'latest' } = req.query
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const orderMap = { latest: 'd.updated_at DESC', popular: 'd.likes_count DESC', views: 'd.views_count DESC' }
  const orderBy = orderMap[sort] || orderMap.latest

  const designs = db.prepare(`
    SELECT d.*, u.username, u.nickname, u.avatar
    FROM designs d JOIN users u ON d.user_id = u.id
    WHERE d.is_public = 1
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(parseInt(limit), offset)

  const total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get()

  res.json({ code: 200, data: {
    list: designs.map(d => ({
      ...formatDesign(d),
      author: { id: d.user_id, username: d.username, nickname: d.nickname || d.username, avatar: d.avatar }
    })),
    total: total.c,
  }})
})

// 搜索
router.get('/search', (req, res) => {
  const { q, page = 1, limit = 24 } = req.query
  if (!q) return res.json({ code: 200, data: { list: [], total: 0 } })
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)
  const like = `%${q}%`

  const designs = db.prepare(`
    SELECT d.*, u.username, u.nickname, u.avatar
    FROM designs d JOIN users u ON d.user_id = u.id
    WHERE d.is_public = 1 AND (d.title LIKE ? OR d.description LIKE ?)
    ORDER BY d.updated_at DESC LIMIT ? OFFSET ?
  `).all(like, like, parseInt(limit), offset)

  const total = db.prepare(
    'SELECT COUNT(*) as c FROM designs WHERE is_public = 1 AND (title LIKE ? OR description LIKE ?)'
  ).get(like, like)

  res.json({ code: 200, data: {
    list: designs.map(d => ({
      ...formatDesign(d),
      author: { id: d.user_id, username: d.username, nickname: d.nickname || d.username, avatar: d.avatar }
    })),
    total: total.c,
  }})
})

export default router
