// ============================================================
//  评论路由 — /api/work/comment/*
//  文档参考: .claude/作品详情.md §3.6
//  支持一级评论 + 楼中楼回复 + 评论点赞
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { userPublic } from '../utils/helpers.js'

const router = Router()

// ============================================
//  GET /api/work/comment/list — 评论列表
//  参数：workId, page, pageSize
//  返回一级评论 + 嵌套的二级回复
// ============================================
router.get('/list', authOptional, (req, res) => {
  try {
    const { workId, page = 1, pageSize = 10 } = req.query
    if (!workId) {
      return res.status(400).json({ code: 400, message: '缺少作品 ID' })
    }

    const limit = Math.min(50, Math.max(1, parseInt(pageSize) || 10))
    const offset = (Math.max(1, parseInt(page)) - 1) * limit

    // 查询一级评论（parent_id = 0）
    const comments = db
      .prepare(
        `SELECT c.*, u.username, u.nickname, u.avatar
         FROM design_comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.design_id = ? AND c.parent_id = 0 AND c.deleted = 0
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(workId, limit, offset)

    const total = db
      .prepare('SELECT COUNT(*) as c FROM design_comments WHERE design_id = ? AND parent_id = 0 AND deleted = 0')
      .get(workId).c

    // 获取所有一级评论 ID
    const commentIds = comments.map((c) => c.id)

    // 查询楼中楼回复
    let repliesMap = {}
    if (commentIds.length > 0) {
      const placeholders = commentIds.map(() => '?').join(',')
      const replies = db
        .prepare(
          `SELECT r.*, u.username, u.nickname, u.avatar,
                  ru.nickname as reply_to_nickname
           FROM design_comments r
           LEFT JOIN users u ON r.user_id = u.id
           LEFT JOIN users ru ON r.reply_to_uid = ru.id
           WHERE r.parent_id IN (${placeholders}) AND r.deleted = 0
           ORDER BY r.created_at ASC`
        )
        .all(...commentIds)

      replies.forEach((r) => {
        if (!repliesMap[r.parent_id]) repliesMap[r.parent_id] = []
        repliesMap[r.parent_id].push(formatComment(r, req.user))
      })
    }

    // 当前用户点赞过的评论 ID
    let likedCommentIds = new Set()
    if (req.user && commentIds.length > 0) {
      const placeholders = commentIds.map(() => '?').join(',')
      const likedRows = db
        .prepare(
          `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`
        )
        .all(req.user.id, ...commentIds)
      likedRows.forEach((r) => likedCommentIds.add(r.comment_id))

      // 也查回复的点赞
      const allReplyIds = Object.values(repliesMap).flat().map((r) => r.id)
      if (allReplyIds.length > 0) {
        const rPlaceholders = allReplyIds.map(() => '?').join(',')
        const rLiked = db
          .prepare(
            `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${rPlaceholders})`
          )
          .all(req.user.id, ...allReplyIds)
        rLiked.forEach((r) => likedCommentIds.add(r.comment_id))
      }
    }

    res.json({
      code: 200,
      data: {
        list: comments.map((c) => ({
          ...formatComment(c, req.user),
          isLiked: likedCommentIds.has(c.id),
          replies: repliesMap[c.id] || [],
        })),
        total,
        hasMore: offset + comments.length < total,
      },
    })
  } catch (err) {
    console.error('评论列表加载失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  POST /api/work/comment/add — 发布一级评论
//  入参：{ workId, content }
// ============================================
router.post('/add', authRequired, (req, res) => {
  try {
    const { workId, content } = req.body

    if (!workId) return res.status(400).json({ code: 400, message: '缺少作品 ID' })
    if (!content || !content.trim()) return res.status(400).json({ code: 400, message: '评论内容不能为空' })
    if (content.length > 500) return res.status(400).json({ code: 400, message: '评论内容不能超过500字' })

    // 敏感词过滤（基础版）
    const trimmed = content.trim()
    if (containsSensitiveWord(trimmed)) {
      return res.status(400).json({ code: 400, message: '评论包含违规内容，请修改后重试' })
    }

    // 检查作品存在
    const design = db.prepare('SELECT id FROM designs WHERE id = ? AND status = 1').get(workId)
    if (!design) return res.status(404).json({ code: 404, message: '作品不存在' })

    const result = db
      .prepare(
        `INSERT INTO design_comments (design_id, user_id, parent_id, content)
         VALUES (?, ?, 0, ?)`
      )
      .run(workId, req.user.id, trimmed)

    // 返回新创建的评论
    const comment = db
      .prepare(
        `SELECT c.*, u.username, u.nickname, u.avatar
         FROM design_comments c LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`
      )
      .get(result.lastInsertRowid)

    res.json({
      code: 200,
      data: formatComment(comment, req.user),
    })
  } catch (err) {
    console.error('发布评论失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  POST /api/work/comment/reply — 楼中楼回复
//  入参：{ commentId, workId, content, replyToUid }
// ============================================
router.post('/reply', authRequired, (req, res) => {
  try {
    const { commentId, workId, content, replyToUid } = req.body

    if (!commentId || !workId) return res.status(400).json({ code: 400, message: '缺少必要参数' })
    if (!content || !content.trim()) return res.status(400).json({ code: 400, message: '回复内容不能为空' })
    if (content.length > 500) return res.status(400).json({ code: 400, message: '回复内容不能超过500字' })

    const trimmed = content.trim()
    if (containsSensitiveWord(trimmed)) {
      return res.status(400).json({ code: 400, message: '回复包含违规内容，请修改后重试' })
    }

    // 检查父评论存在
    const parent = db.prepare('SELECT id FROM design_comments WHERE id = ? AND deleted = 0').get(commentId)
    if (!parent) return res.status(404).json({ code: 404, message: '原评论不存在' })

    const result = db
      .prepare(
        `INSERT INTO design_comments (design_id, user_id, parent_id, reply_to_uid, content)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(workId, req.user.id, commentId, replyToUid || 0, trimmed)

    // 返回新创建的回复
    const reply = db
      .prepare(
        `SELECT r.*, u.username, u.nickname, u.avatar,
                ru.nickname as reply_to_nickname
         FROM design_comments r
         LEFT JOIN users u ON r.user_id = u.id
         LEFT JOIN users ru ON r.reply_to_uid = ru.id
         WHERE r.id = ?`
      )
      .get(result.lastInsertRowid)

    res.json({
      code: 200,
      data: formatComment(reply, req.user),
    })
  } catch (err) {
    console.error('回复评论失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  POST /api/work/comment/like — 评论点赞/取消
//  入参：{ commentId }
// ============================================
router.post('/like', authRequired, (req, res) => {
  try {
    const { commentId } = req.body
    if (!commentId) return res.status(400).json({ code: 400, message: '缺少评论 ID' })

    const comment = db.prepare('SELECT id, like_num FROM design_comments WHERE id = ? AND deleted = 0').get(commentId)
    if (!comment) return res.status(404).json({ code: 404, message: '评论不存在' })

    const existing = db
      .prepare('SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?')
      .get(req.user.id, commentId)

    if (existing) {
      db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').run(req.user.id, commentId)
      db.prepare('UPDATE design_comments SET like_num = MAX(0, like_num - 1) WHERE id = ?').run(commentId)
      const newNum = db.prepare('SELECT like_num FROM design_comments WHERE id = ?').get(commentId).like_num
      return res.json({ code: 200, data: { liked: false, likeNum: newNum } })
    }

    db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)').run(req.user.id, commentId)
    db.prepare('UPDATE design_comments SET like_num = like_num + 1 WHERE id = ?').run(commentId)
    const newNum = db.prepare('SELECT like_num FROM design_comments WHERE id = ?').get(commentId).like_num
    res.json({ code: 200, data: { liked: true, likeNum: newNum } })
  } catch (err) {
    console.error('评论点赞失败:', err)
    res.status(500).json({ code: 500, message: '服务器异常' })
  }
})

// ============================================
//  工具函数
// ============================================

/** 格式化单条评论 */
function formatComment(c, currentUser) {
  if (!c) return null
  const isAuthor = false // 由前端传入或额外查询判断
  return {
    id: c.id,
    content: c.content,
    likeNum: c.like_num || 0,
    parentId: c.parent_id || 0,
    replyToUid: c.reply_to_uid || 0,
    replyToNickname: c.reply_to_nickname || '',
    createdAt: c.created_at,
    isAuthor,
    user: {
      id: c.user_id,
      nickname: c.nickname || c.username || '匿名',
      avatar: c.avatar || '',
    },
  }
}

/** 简易敏感词过滤 */
const SENSITIVE_WORDS = [] // 可从配置或数据库加载
function containsSensitiveWord(text) {
  if (SENSITIVE_WORDS.length === 0) return false
  const lower = text.toLowerCase()
  return SENSITIVE_WORDS.some((w) => lower.includes(w.toLowerCase()))
}

export default router
