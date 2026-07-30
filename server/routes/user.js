// ============================================================
//  用户相关路由 — 我的点赞 / 我的收藏
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { formatDesign } from '../utils/helpers.js'
import { fail, paginated } from '../utils/response.js'

const router = Router()

// GET /api/user/likes — 我的点赞列表
router.get('/user/likes', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const rows = db
      .prepare(
        `SELECT d.*, u.username, u.nickname, u.avatar
         FROM design_likes l
         JOIN designs d ON l.design_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE l.user_id = ?
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(req.user.id, parseInt(limit), offset)

    const total = db.prepare(
      'SELECT COUNT(*) as c FROM design_likes WHERE user_id = ?'
    ).get(req.user.id)

    const list = rows.map((d) => ({
      ...formatDesign(d),
      author: {
        id: d.user_id,
        username: d.username,
        nickname: d.nickname || d.username,
        avatar: d.avatar,
      },
      isLiked: true,
    }))

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取点赞列表错误:', err)
    res.status(500).json(fail(500, '获取列表失败'))
  }
})

// GET /api/user/favorites — 我的收藏列表
router.get('/user/favorites', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const rows = db
      .prepare(
        `SELECT d.*, u.username, u.nickname, u.avatar
         FROM design_favorites f
         JOIN designs d ON f.design_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(req.user.id, parseInt(limit), offset)

    const total = db.prepare(
      'SELECT COUNT(*) as c FROM design_favorites WHERE user_id = ?'
    ).get(req.user.id)

    const list = rows.map((d) => ({
      ...formatDesign(d),
      author: {
        id: d.user_id,
        username: d.username,
        nickname: d.nickname || d.username,
        avatar: d.avatar,
      },
      isFavorited: true,
    }))

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取收藏列表错误:', err)
    res.status(500).json(fail(500, '获取列表失败'))
  }
})

export default router
