// ============================================================
//  用户关注路由 — /api/user/*
//  文档参考: .claude/作品详情.md §3.2 + .claude/他人主页.md
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { userPublic } from '../utils/helpers.js'

const router = Router()

// ============================================
//  POST /api/user/follow — 关注/取消关注
//  入参：{ targetUid }
// ============================================
router.post('/follow', authRequired, (req, res) => {
  try {
    const { targetUid } = req.body
    if (!targetUid) {
      return res.status(400).json({ code: 400, message: '缺少目标用户 ID' })
    }

    const targetId = parseInt(targetUid)
    if (targetId === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能关注自己' })
    }

    // 检查目标用户是否存在
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId)
    if (!target) {
      return res.status(404).json({ code: 404, message: '用户不存在' })
    }

    // 检查是否已关注
    const existing = db
      .prepare('SELECT 1 FROM user_follow WHERE follower_id = ? AND following_id = ?')
      .get(req.user.id, targetId)

    if (existing) {
      // 取消关注
      db.prepare('DELETE FROM user_follow WHERE follower_id = ? AND following_id = ?').run(
        req.user.id,
        targetId
      )
      return res.json({ code: 200, data: { isFollow: false } })
    }

    // 关注
    db.prepare('INSERT INTO user_follow (follower_id, following_id) VALUES (?, ?)').run(
      req.user.id,
      targetId
    )
    res.json({ code: 200, data: { isFollow: true } })
  } catch (err) {
    console.error('关注操作失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  GET /:id/followers — 粉丝列表（分页）
//  返回：关注该用户的粉丝列表
// ============================================
router.get('/:id/followers', authOptional, (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const rows = db
      .prepare(
        `SELECT u.id, u.username, u.nickname, u.avatar, u.bio, f.created_at as follow_time
         FROM user_follow f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = ?
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(targetId, parseInt(limit), offset)

    const total = db
      .prepare('SELECT COUNT(*) as c FROM user_follow WHERE following_id = ?')
      .get(targetId).c

    // 登录用户：查询是否互相关注
    let followMap = {}
    if (req.user && rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const placeholders = ids.map(() => '?').join(',')
      const followed = db
        .prepare(
          `SELECT following_id FROM user_follow WHERE follower_id = ? AND following_id IN (${placeholders})`
        )
        .all(req.user.id, ...ids)
      followed.forEach((r) => { followMap[r.following_id] = true })
    }

    const list = rows.map((r) => ({
      ...userPublic(r),
      followTime: r.follow_time,
      isFollow: !!followMap[r.id],
      isMutual: r.id === req.user?.id ? null : !!followMap[r.id],
    }))

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + rows.length < total,
      },
    })
  } catch (err) {
    console.error('获取粉丝列表失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  GET /:id/following — 关注列表（分页）
//  返回：该用户正在关注的人
// ============================================
router.get('/:id/following', authOptional, (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    const { page = 1, limit = 20 } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    const rows = db
      .prepare(
        `SELECT u.id, u.username, u.nickname, u.avatar, u.bio, f.created_at as follow_time
         FROM user_follow f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = ?
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(targetId, parseInt(limit), offset)

    const total = db
      .prepare('SELECT COUNT(*) as c FROM user_follow WHERE follower_id = ?')
      .get(targetId).c

    // 登录用户：查询是否已关注列表中的用户
    let followMap = {}
    if (req.user && rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const placeholders = ids.map(() => '?').join(',')
      const followed = db
        .prepare(
          `SELECT following_id FROM user_follow WHERE follower_id = ? AND following_id IN (${placeholders})`
        )
        .all(req.user.id, ...ids)
      followed.forEach((r) => { followMap[r.following_id] = true })
    }

    const list = rows.map((r) => ({
      ...userPublic(r),
      followTime: r.follow_time,
      isFollow: r.id === req.user?.id ? undefined : (followMap[r.id] || false),
    }))

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: offset + rows.length < total,
      },
    })
  } catch (err) {
    console.error('获取关注列表失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

export default router
