// ============================================
//  设计 CRUD + 点赞路由
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { formatDesign, countBeads, userPublic } from '../utils/helpers.js'

const router = Router()

// 创建设计
router.post('/', authRequired, (req, res) => {
  const {
    title,
    description,
    gridWidth,
    gridHeight,
    gridData,
    thumbnail,
    isPublic,
    brand,
    folderId,
  } = req.body || {}
  if (!title || !gridData || !gridWidth || !gridHeight) {
    return res.status(400).json({ code: 400, message: '缺少必要参数' })
  }

  const { beadCount, colorCount } = countBeads(gridData)
  const gridStr = typeof gridData === 'string' ? gridData : JSON.stringify(gridData)

  const result = db
    .prepare(
      `
    INSERT INTO designs (user_id, folder_id, title, description, grid_width, grid_height,
      grid_data, thumbnail, is_public, brand, bead_count, color_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      req.user.id,
      folderId || null,
      title,
      description || '',
      gridWidth,
      gridHeight,
      gridStr,
      thumbnail || null,
      isPublic ? 1 : 0,
      brand || 'Hama',
      beadCount,
      colorCount
    )

  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(result.lastInsertRowid)
  res.json({ code: 200, data: formatDesign(design) })
})

// 更新设计
router.put('/:id', authRequired, (req, res) => {
  const design = db
    .prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在或无权修改' })

  const { title, description, gridData, gridWidth, gridHeight, thumbnail, isPublic, folderId } =
    req.body || {}

  let beadCount = design.bead_count,
    colorCount = design.color_count
  if (gridData) {
    const stats = countBeads(gridData)
    beadCount = stats.beadCount
    colorCount = stats.colorCount
  }

  db.prepare(
    `
    UPDATE designs SET title=?, description=?, grid_data=?, grid_width=?, grid_height=?,
      thumbnail=?, is_public=?, folder_id=?, bead_count=?, color_count=?, updated_at=datetime('now')
    WHERE id=?
  `
  ).run(
    title || design.title,
    description !== undefined ? description : design.description,
    gridData
      ? typeof gridData === 'string'
        ? gridData
        : JSON.stringify(gridData)
      : design.grid_data,
    gridWidth || design.grid_width,
    gridHeight || design.grid_height,
    thumbnail !== undefined ? thumbnail : design.thumbnail,
    isPublic !== undefined ? (isPublic ? 1 : 0) : design.is_public,
    folderId !== undefined ? folderId : design.folder_id,
    beadCount,
    colorCount,
    design.id
  )

  const updated = db.prepare('SELECT * FROM designs WHERE id = ?').get(design.id)
  res.json({ code: 200, data: formatDesign(updated) })
})

// 设计详情
router.get('/:id', authOptional, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在' })

  db.prepare('UPDATE designs SET views_count = views_count + 1 WHERE id = ?').run(design.id)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(design.user_id)

  let liked = false
  if (req.user) {
    const like = db
      .prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
      .get(req.user.id, design.id)
    liked = !!like
  }

  res.json({
    code: 200,
    data: {
      ...formatDesign(design),
      author: user ? userPublic(user) : null,
      liked,
    },
  })
})

// 删除设计
router.delete('/:id', authRequired, (req, res) => {
  const design = db
    .prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在或无权删除' })
  db.prepare('DELETE FROM designs WHERE id = ?').run(design.id)
  res.json({ code: 200, message: '已删除' })
})

// 我的设计列表
router.get('/', authRequired, (req, res) => {
  const { folder_id, page = 1, limit = 20 } = req.query
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

  let designs, total
  if (folder_id) {
    designs = db
      .prepare(
        'SELECT * FROM designs WHERE user_id = ? AND folder_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?'
      )
      .all(req.user.id, folder_id, parseInt(limit), offset)
    total = db
      .prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ? AND folder_id = ?')
      .get(req.user.id, folder_id)
  } else {
    designs = db
      .prepare('SELECT * FROM designs WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(req.user.id, parseInt(limit), offset)
    total = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ?').get(req.user.id)
  }

  res.json({
    code: 200,
    data: {
      list: designs.map(formatDesign),
      total: total.c,
      page: parseInt(page),
      limit: parseInt(limit),
    },
  })
})

// 点赞/取消点赞
router.post('/:id/like', authRequired, (req, res) => {
  const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
  if (!design) return res.status(404).json({ code: 404, message: '设计不存在' })

  const existing = db
    .prepare('SELECT 1 FROM design_likes WHERE user_id = ? AND design_id = ?')
    .get(req.user.id, design.id)

  if (existing) {
    db.prepare('DELETE FROM design_likes WHERE user_id = ? AND design_id = ?').run(
      req.user.id,
      design.id
    )
    db.prepare('UPDATE designs SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(
      design.id
    )
    res.json({ code: 200, data: { liked: false } })
  } else {
    db.prepare('INSERT INTO design_likes (user_id, design_id) VALUES (?, ?)').run(
      req.user.id,
      design.id
    )
    db.prepare('UPDATE designs SET likes_count = likes_count + 1 WHERE id = ?').run(design.id)
    res.json({ code: 200, data: { liked: true } })
  }
})

export default router
