// ============================================
//  内容管理路由 — 设计/模板列表、审核、上下架
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { formatDesign } from '../../utils/helpers.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 设计列表（分页 + 筛选）
router.get('/', adminRequired, (req, res) => {
  try {
    const {
      page = 1, limit = 20, keyword, status, isPublic,
      userId, sort = 'created_at_desc',
    } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (keyword) {
      where += ' AND (title LIKE ? OR id = ?)'
      params.push(`%${keyword}%`, parseInt(keyword) || 0)
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?'
      params.push(parseInt(status))
    } else {
      // 默认只显示待审核(0)和已发布(1)
      where += ' AND status IN (0, 1)'
    }
    if (isPublic !== undefined && isPublic !== '') {
      where += ' AND is_public = ?'
      params.push(parseInt(isPublic))
    }
    if (userId) {
      where += ' AND user_id = ?'
      params.push(parseInt(userId))
    }

    const orderMap = {
      created_at_desc: 'created_at DESC',
      created_at_asc: 'created_at ASC',
      likes_desc: 'likes_count DESC',
      views_desc: 'views_count DESC',
    }
    const order = orderMap[sort] || 'created_at DESC'

    const total = db.prepare(`SELECT COUNT(*) as c FROM designs ${where}`).get(...params)
    const list = db.prepare(
      `SELECT d.*, u.nickname as author_name FROM designs d
       LEFT JOIN users u ON d.user_id = u.id
       ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    const enriched = list.map((d) => ({
      id: d.id,
      title: d.title,
      authorId: d.user_id,
      authorName: d.author_name,
      gridWidth: d.grid_width,
      gridHeight: d.grid_height,
      beadCount: d.bead_count,
      colorCount: d.color_count,
      likesCount: d.likes_count,
      viewsCount: d.views_count,
      isPublic: d.is_public,
      status: d.status,
      isRecommended: d.is_recommended,
      weight: d.weight,
      brand: d.brand,
      reviewComment: d.review_comment,
      thumbnail: d.thumbnail,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }))

    res.json(paginated(enriched, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取设计列表错误:', err)
    res.status(500).json(fail(500, '获取设计列表失败'))
  }
})

// 设计详情
router.get('/:id', adminRequired, (req, res) => {
  try {
    const design = db.prepare(
      `SELECT d.*, u.nickname as author_name FROM designs d
       LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?`
    ).get(req.params.id)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    res.json(success({
      ...formatDesign(design),
      authorName: design.author_name,
      status: design.status,
      isRecommended: design.is_recommended,
      weight: design.weight,
      reviewComment: design.review_comment,
    }))
  } catch (err) {
    console.error('获取设计详情错误:', err)
    res.status(500).json(fail(500, '获取设计详情失败'))
  }
})

// 编辑设计
router.put('/:id', adminRequired, (req, res) => {
  try {
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    const { title, description, isPublic, isRecommended, weight, reviewComment } = req.body || {}

    db.prepare(
      `UPDATE designs SET title = ?, description = ?, is_public = ?, is_recommended = ?,
       weight = ?, review_comment = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      title !== undefined ? title : design.title,
      description !== undefined ? description : design.description,
      isPublic !== undefined ? (isPublic ? 1 : 0) : design.is_public,
      isRecommended !== undefined ? (isRecommended ? 1 : 0) : design.is_recommended,
      weight !== undefined ? weight : design.weight,
      reviewComment !== undefined ? reviewComment : design.review_comment,
      design.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '内容管理', action: 'update', targetType: 'design', targetId: design.id,
      detail: JSON.stringify({ title, isPublic, isRecommended, weight }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: design.id }))
  } catch (err) {
    console.error('编辑设计错误:', err)
    res.status(500).json(fail(500, '编辑设计失败'))
  }
})

// 物理删除设计（彻底删除 + 级联清理所有关联数据）
router.delete('/:id', adminRequired, (req, res) => {
  try {
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    const id = design.id
    db.prepare('DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM design_comments WHERE design_id = ?)').run(id)
    db.prepare('DELETE FROM design_comments WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM design_likes WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM design_favorites WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM make_progress_snapshots WHERE session_id IN (SELECT id FROM make_sessions WHERE design_id = ?)').run(id)
    db.prepare('DELETE FROM make_records WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM make_sessions WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM download_logs WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM design_bead_usage WHERE design_id = ?').run(id)
    db.prepare('DELETE FROM designs WHERE id = ?').run(id)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '内容管理', action: '物理删除', targetType: 'design', targetId: id,
      detail: JSON.stringify({ title: design.title }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id }))
  } catch (err) {
    console.error('物理删除设计错误:', err)
    res.status(500).json(fail(500, '删除失败'))
  }
})

// 审核/修改设计状态（支持 PUT 和 PATCH）
router.put('/:id/status', adminRequired, (req, res) => {
  return updateStatus(req, res)
})
router.patch('/:id/status', adminRequired, (req, res) => {
  return updateStatus(req, res)
})

function updateStatus(req, res) {
  try {
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id)
    if (!design) return res.status(404).json(fail(404, '设计不存在'))

    const { status, comment } = req.body || {}
    // status: 1=已发布, 0=待审核, -1=已驳回, -2=已删除

    db.prepare(
      `UPDATE designs SET status = ?, review_comment = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(status, comment || '', design.id)

    const statusMap = { 1: '通过', 0: '待审', '-1': '驳回', '-2': '删除' }
    const actionLabel = statusMap[String(status)] || '修改状态'

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '内容管理', action: actionLabel, targetType: 'design', targetId: design.id,
      detail: JSON.stringify({ status, comment }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: design.id, status, comment }))
  } catch (err) {
    console.error('修改设计状态错误:', err)
    res.status(500).json(fail(500, '操作失败'))
  }
}

// 批量操作
router.post('/batch-status', adminRequired, (req, res) => {
  try {
    const { ids, status, comment } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(fail(400, '请选择要操作的设计'))
    }

    const stmt = db.prepare(
      `UPDATE designs SET status = ?, review_comment = ?, updated_at = datetime('now') WHERE id = ?`
    )
    const txn = db.transaction(() => {
      for (const id of ids) {
        stmt.run(status, comment || '', id)
      }
    })
    txn()

    const statusMap = { 1: '批量通过', 0: '批量待审', '-1': '批量驳回', '-2': '批量删除' }
    const actionLabel = statusMap[String(status)] || '批量操作'

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '内容管理', action: actionLabel, targetType: 'design',
      detail: JSON.stringify({ ids, status, comment }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ count: ids.length }))
  } catch (err) {
    console.error('批量操作错误:', err)
    res.status(500).json(fail(500, '批量操作失败'))
  }
})

export default router
