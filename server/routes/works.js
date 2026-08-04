// ============================================================
//  作品路由 — /api/work/*
//  文档参考: .claude/作品展示2.md + .claude/作品详情.md
//  列表页（hot/recommend/mine）+ 详情页
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { formatDesign, userPublic } from '../utils/helpers.js'

const router = Router()

// ============================================
//  GET /api/work/list — 作品列表分页
//  参数：tab (hot/recommend/mine/likes), page, pageSize
// ============================================
router.get('/list', authOptional, (req, res) => {
  try {
    const {
      tab = 'hot',
      page = 1,
      pageSize = 15,
    } = req.query

    const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 15))
    const offset = (Math.max(1, parseInt(page)) - 1) * limit

    let designs, total

    // ==========================================
    //  tab=mine — 我的作品（必须登录）
    // ==========================================
    if (tab === 'mine') {
      if (!req.user) {
        return res.json({
          code: 401,
          message: '请先登录',
          data: { list: [], total: 0, hasMore: false, needLogin: true },
        })
      }

      designs = db
        .prepare(
          `SELECT d.* FROM designs d
           WHERE d.user_id = ?
           ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`
        )
        .all(req.user.id, limit, offset)

      total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ?').get(req.user.id).c
    }

    // ==========================================
    //  tab=likes — 我点赞的作品（必须登录）
    // ==========================================
    else if (tab === 'likes') {
      if (!req.user) {
        return res.json({
          code: 401,
          message: '请先登录',
          data: { list: [], total: 0, hasMore: false, needLogin: true },
        })
      }

      designs = db
        .prepare(
          `SELECT d.* FROM designs d
           JOIN design_likes l ON d.id = l.design_id
           WHERE l.user_id = ?
           ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
        )
        .all(req.user.id, limit, offset)

      total = db.prepare('SELECT COUNT(*) as c FROM design_likes WHERE user_id = ?').get(req.user.id).c
    }

    // ==========================================
    //  tab=hot — 最热（按点赞数）
    // ==========================================
    else if (tab === 'hot') {
      designs = db
        .prepare(
          `SELECT d.* FROM designs d
           WHERE d.is_public = 1
           ORDER BY d.likes_count DESC,
             d.updated_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset)

      total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get().c
    }

    // ==========================================
    //  tab=recommend — 推荐（按发布时间倒序）
    // ==========================================
    else if (tab === 'recommend') {
      designs = db
        .prepare(
          `SELECT d.* FROM designs d
           WHERE d.is_public = 1
           ORDER BY d.published_at DESC,
             d.updated_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset)

      total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get().c
    }

    // ==========================================
    //  默认 — 最热
    // ==========================================
    else {
      designs = db
        .prepare(
          `SELECT d.* FROM designs d
           WHERE d.is_public = 1
           ORDER BY d.likes_count DESC,
             d.updated_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset)

      total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get().c
    }

    // 已登录用户：批量查询点赞状态
    let likedSet = new Set()
    if (req.user && designs.length > 0) {
      const ids = designs.map((d) => d.id)
      const placeholders = ids.map(() => '?').join(',')

      const likedRows = db
        .prepare(
          `SELECT design_id FROM design_likes WHERE user_id = ? AND design_id IN (${placeholders})`
        )
        .all(req.user.id, ...ids)
      likedRows.forEach((r) => likedSet.add(r.design_id))
    }

    // 批量取作者信息
    const authorMap = {}
    if (designs.length > 0) {
      const userIds = [...new Set(designs.map((d) => d.user_id))]
      const userPlaceholders = userIds.map(() => '?').join(',')
      const users = db
        .prepare(
          `SELECT id, username, nickname, avatar FROM users WHERE id IN (${userPlaceholders})`
        )
        .all(...userIds)
      users.forEach((u) => {
        authorMap[u.id] = userPublic(u)
      })
    }

    res.json({
      code: 200,
      data: {
        list: designs.map((d) => ({
          ...formatDesign(d),
          author: authorMap[d.user_id] || { nickname: '匿名' },
          isLiked: likedSet.has(d.id),
        })),
        total,
        hasMore: offset + designs.length < total,
      },
    })
  } catch (err) {
    console.error('作品列表加载失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常，请稍后重试' })
  }
})

// ============================================
//  GET /api/work/detail/:workId — 作品详情
//  文档参考: .claude/作品详情.md §3.1
// ============================================
router.get('/detail/:workId', authOptional, (req, res) => {
  try {
    const { workId } = req.params

    // 1. 查询作品主数据
    const design = db
      .prepare('SELECT * FROM designs WHERE id = ? AND status = 1')
      .get(workId)

    if (!design) {
      return res.status(404).json({ code: 404, message: '作品不存在或已下架' })
    }

    // 2. 浏览量 +1（异步不阻塞）
    db.prepare('UPDATE designs SET views_count = views_count + 1 WHERE id = ?').run(workId)

    // 3. 查询作者信息
    const authorRow = db
      .prepare('SELECT id, username, nickname, avatar, bio FROM users WHERE id = ?')
      .get(design.user_id)
    const author = authorRow ? userPublic(authorRow) : { nickname: '匿名' }

    // 作者粉丝数
    const fansCount = db
      .prepare('SELECT COUNT(*) as c FROM user_follow WHERE following_id = ?')
      .get(design.user_id).c

    // 4. 用料清单（从 design_bead_usage 关联 bead_colors）
    let beanList = []
    try {
      beanList = db
        .prepare(
          `SELECT du.color_id, du.quantity, bc.name, bc.hex, bc.series_id, bs.name as series_name
           FROM design_bead_usage du
           LEFT JOIN bead_colors bc ON du.color_id = bc.id
           LEFT JOIN bead_series bs ON bc.series_id = bs.id
           WHERE du.design_id = ?
           ORDER BY du.quantity DESC`
        )
        .all(workId)
        .map((r) => ({
          colorCode: r.name || '?',
          colorHex: r.hex || '#cccccc',
          needNum: r.quantity,
          seriesName: r.series_name || '',
        }))
    } catch (_) {
      // design_bead_usage 可能没有数据，用 grid_data 兜底
    }

    // 如果用料表为空，从 grid_data 解析
    if (beanList.length === 0 && design.grid_data) {
      try {
        const grid = JSON.parse(design.grid_data)
        const colorMap = {}
        if (Array.isArray(grid)) {
          for (const row of grid) {
            if (!Array.isArray(row)) continue
            for (const cell of row) {
              if (cell && cell.hex) {
                const key = cell.hex
                if (!colorMap[key]) {
                  colorMap[key] = { colorCode: cell.name || '?', colorHex: cell.hex, needNum: 0, seriesName: '' }
                }
                colorMap[key].needNum++
              }
            }
          }
        }
        beanList = Object.values(colorMap).sort((a, b) => b.needNum - a.needNum)
      } catch (_) {}
    }

    const totalColorType = beanList.length
    const totalBeanNum = beanList.reduce((sum, b) => sum + b.needNum, 0)

    // 5. 当前用户与作者/作品的关系
    let isFollow = false
    let isLiked = false
    if (req.user) {
      const followRow = db
        .prepare('SELECT 1 FROM user_follow WHERE follower_id = ? AND following_id = ?')
        .get(req.user.id, design.user_id)
      isFollow = !!followRow

      const likeRow = db
        .prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
        .get(req.user.id, design.id)
      isLiked = !!likeRow
    }

    // 6. 评论总数
    const commentCount = db
      .prepare('SELECT COUNT(*) as c FROM design_comments WHERE design_id = ? AND deleted = 0')
      .get(workId).c

    // 7. 难度文本映射
    const difficultyMap = { 1: '简单', 2: '中等', 3: '困难' }

    // 8. 组装返回数据
    res.json({
      code: 200,
      data: {
        ...formatDesign(design),
        // 作者信息
        author: {
          ...author,
          fansCount,
          isFollow,
        },
        // 基础参数卡片
        baseParam: {
          gridSize: `${design.grid_width}×${design.grid_height}`,
          difficulty: design.difficulty || 1,
          difficultyText: difficultyMap[design.difficulty] || '简单',
          costTime: design.cost_time || '',
          realSize: design.real_size || '',
        },
        // 用料清单
        beanInfo: {
          seriesName: beanList.length > 0 ? (beanList[0].seriesName || '') : '',
          totalColorType,
          totalBeanNum,
          colorList: beanList,
        },
        // 用户交互状态
        isLiked,
        // 评论数
        commentCount,
      },
    })
  } catch (err) {
    console.error('作品详情加载失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常，请稍后重试' })
  }
})

// ============================================
//  POST /api/work/like — 作品点赞/取消
//  文档参考: .claude/作品详情.md §3.3
// ============================================
router.post('/like', authRequired, (req, res) => {
  try {
    const { workId } = req.body
    if (!workId) {
      return res.status(400).json({ code: 400, message: '缺少作品 ID' })
    }

    // 检查作品是否存在
    const design = db.prepare('SELECT id, likes_count FROM designs WHERE id = ? AND status = 1').get(workId)
    if (!design) {
      return res.status(404).json({ code: 404, message: '作品不存在' })
    }

    // 检查是否已点赞
    const existing = db
      .prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
      .get(req.user.id, workId)

    if (existing) {
      // 取消点赞
      db.prepare('DELETE FROM design_likes WHERE user_id = ? AND design_id = ?').run(req.user.id, workId)
      db.prepare('UPDATE designs SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(workId)
      const newCount = db.prepare('SELECT likes_count FROM designs WHERE id = ?').get(workId).likes_count
      return res.json({ code: 200, data: { liked: false, likesCount: newCount } })
    }

    // 点赞
    db.prepare('INSERT INTO design_likes (user_id, design_id) VALUES (?, ?)').run(req.user.id, workId)
    db.prepare('UPDATE designs SET likes_count = likes_count + 1 WHERE id = ?').run(workId)
    const newCount = db.prepare('SELECT likes_count FROM designs WHERE id = ?').get(workId).likes_count
    res.json({ code: 200, data: { liked: true, likesCount: newCount } })
  } catch (err) {
    console.error('点赞操作失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

export default router
