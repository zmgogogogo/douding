// ============================================================
//  用户相关路由 — 他人主页 / 我的点赞
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { formatDesign, userPublic } from '../utils/helpers.js'
import { fail, paginated, success } from '../utils/response.js'

const router = Router()

// ============================================
//  GET /api/user/profile/:id — 用户主页完整数据
//  返回：用户信息 + 四项统计 + 关注状态 + 首屏作品
//  支持游客访问（authOptional）
// ============================================
router.get('/user/profile/:id', authOptional, (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    if (!targetId || targetId < 1) {
      return res.status(400).json(fail(400, '用户 ID 无效'))
    }

    // 1. 查询目标用户
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = 1').get(targetId)
    if (!user) {
      return res.status(404).json(fail(404, '用户不存在或已注销'))
    }

    // 2. 统计数据
    const worksCount = db
      .prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1')
      .get(targetId).c

    const followersCount = db
      .prepare('SELECT COUNT(*) as c FROM user_follow WHERE following_id = ?')
      .get(targetId).c

    const followingCount = db
      .prepare('SELECT COUNT(*) as c FROM user_follow WHERE follower_id = ?')
      .get(targetId).c

    // 获赞总数：该用户所有公开作品的点赞之和
    const totalLikes = db
      .prepare('SELECT COALESCE(SUM(likes_count), 0) as c FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1')
      .get(targetId).c

    // 3. 当前访客与目标用户的关系
    let isFollow = false
    let isSelf = false
    if (req.user) {
      isSelf = req.user.id === targetId
      if (!isSelf) {
        const followRow = db
          .prepare('SELECT 1 FROM user_follow WHERE follower_id = ? AND following_id = ?')
          .get(req.user.id, targetId)
        isFollow = !!followRow
      }
    }

    // 4. 首屏作品（最新 12 条，含 grid_data 用于渲染缩略图）
    const works = db
      .prepare(
        `SELECT d.*, u.username, u.nickname, u.avatar
         FROM designs d JOIN users u ON d.user_id = u.id
         WHERE d.user_id = ? AND d.is_public = 1 AND d.status = 1
         ORDER BY d.published_at DESC, d.updated_at DESC
         LIMIT 12`
      )
      .all(targetId)

    const totalWorks = db
      .prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1')
      .get(targetId).c

    // 已登录访客：查询作品点赞状态
    let likedSet = new Set()
    if (req.user && !isSelf && works.length > 0) {
      const ids = works.map((d) => d.id)
      const placeholders = ids.map(() => '?').join(',')
      const likedRows = db
        .prepare(`SELECT design_id FROM design_likes WHERE user_id = ? AND design_id IN (${placeholders})`)
        .all(req.user.id, ...ids)
      likedRows.forEach((r) => likedSet.add(r.design_id))
    }

    res.json(success({
      user: userPublic(user),
      stats: {
        works: worksCount,
        followers: followersCount,
        following: followingCount,
        totalLikes,
      },
      isFollow,
      isSelf,
      works: {
        list: works.map((d) => ({
          ...formatDesign(d),
          author: {
            id: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            avatar: user.avatar,
          },
          isLiked: likedSet.has(d.id),
        })),
        total: totalWorks,
        hasMore: works.length < totalWorks,
      },
    }))
  } catch (err) {
    console.error('获取用户主页失败:', err)
    res.status(500).json(fail(500, '服务器异常，请稍后重试'))
  }
})

// ============================================
//  GET /api/user/:id/works — 用户作品分页列表
//  参数：page, limit, sort (latest/popular)
// ============================================
router.get('/user/:id/works', authOptional, (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    const { page = 1, limit = 12, sort = 'latest' } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let orderBy = 'd.published_at DESC, d.updated_at DESC'
    if (sort === 'popular') orderBy = 'd.likes_count DESC, d.updated_at DESC'

    const works = db
      .prepare(
        `SELECT d.*, u.username, u.nickname, u.avatar
         FROM designs d JOIN users u ON d.user_id = u.id
         WHERE d.user_id = ? AND d.is_public = 1 AND d.status = 1
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(targetId, parseInt(limit), offset)

    const total = db
      .prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ? AND is_public = 1 AND status = 1')
      .get(targetId).c

    // 已登录访客：查询点赞状态
    let likedSet = new Set()
    if (req.user && works.length > 0) {
      const ids = works.map((d) => d.id)
      const placeholders = ids.map(() => '?').join(',')
      const likedRows = db
        .prepare(`SELECT design_id FROM design_likes WHERE user_id = ? AND design_id IN (${placeholders})`)
        .all(req.user.id, ...ids)
      likedRows.forEach((r) => likedSet.add(r.design_id))
    }

    // 获取作者信息
    const user = db.prepare('SELECT id, username, nickname, avatar FROM users WHERE id = ?').get(targetId)

    res.json(success({
      list: works.map((d) => ({
        ...formatDesign(d),
        author: {
          id: user?.id || targetId,
          username: user?.username || '',
          nickname: user?.nickname || user?.username || '匿名',
          avatar: user?.avatar || '',
        },
        isLiked: likedSet.has(d.id),
      })),
      total,
      hasMore: offset + works.length < total,
    }))
  } catch (err) {
    console.error('获取用户作品列表失败:', err)
    res.status(500).json(fail(500, '服务器异常，请稍后重试'))
  }
})

// ============================================
//  GET /api/user/:id — 用户简要信息（兼容旧调用）
//  注意：此路由必须放在 /user/likes 等具体路由之后
//  实际上放在最后，避免拦截 /user/likes 等路径
// ============================================

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

// ============================================
//  GET /api/user/:id — 用户简要信息（兼容旧 ProfileView 调用）
//  注意：此路由必须在 /user/likes 之后
//  否则 :id 会匹配到 "likes" 等路径
// ============================================
router.get('/user/:id', authOptional, (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    if (!targetId || targetId < 1) {
      return res.status(400).json(fail(400, '用户 ID 无效'))
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = 1').get(targetId)
    if (!user) {
      return res.status(404).json(fail(404, '用户不存在或已注销'))
    }

    res.json(success(userPublic(user)))
  } catch (err) {
    console.error('获取用户信息失败:', err)
    res.status(500).json(fail(500, '服务器异常'))
  }
})

export default router
