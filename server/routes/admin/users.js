// ============================================
//  用户管理路由 — C端用户列表/详情/封禁/编辑
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { userPublic } from '../../utils/helpers.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 用户列表（分页 + 筛选）
router.get('/', adminRequired, (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status, sort = 'created_at_desc' } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (keyword) {
      where += ' AND (username LIKE ? OR nickname LIKE ? OR id = ?)'
      params.push(`%${keyword}%`, `%${keyword}%`, parseInt(keyword) || 0)
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?'
      params.push(parseInt(status))
    }

    const orderMap = {
      created_at_desc: 'created_at DESC',
      created_at_asc: 'created_at ASC',
    }
    const order = orderMap[sort] || 'created_at DESC'

    const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params)
    const list = db.prepare(
      `SELECT * FROM users ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    // 附加作品数
    const enriched = list.map((u) => {
      const designCount = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ?').get(u.id).c
      return {
        ...userPublic(u),
        status: u.status,
        banReason: u.ban_reason,
        isVip: u.is_vip,
        designCount,
        lastLoginAt: u.updated_at,
      }
    })

    res.json(paginated(enriched, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取用户列表错误:', err)
    res.status(500).json(fail(500, '获取用户列表失败'))
  }
})

// 用户详情
router.get('/:id', adminRequired, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json(fail(404, '用户不存在'))

    const designs = db.prepare(
      'SELECT id, title, is_public, likes_count, views_count, created_at FROM designs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(user.id)

    const designCount = db.prepare('SELECT COUNT(*) as c FROM designs WHERE user_id = ?').get(user.id).c
    const inventoryCount = db.prepare(
      'SELECT COUNT(*) as c FROM user_bead_inventory WHERE user_id = ? AND quantity > 0'
    ).get(user.id).c
    const likeCount = db.prepare('SELECT COUNT(*) as c FROM design_likes WHERE user_id = ?').get(user.id).c

    res.json(success({
      ...userPublic(user),
      status: user.status,
      banReason: user.ban_reason,
      isVip: user.is_vip,
      vipExpireAt: user.vip_expire_at,
      bio: user.bio,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      designCount,
      inventoryCount,
      likeCount,
      recentDesigns: designs,
    }))
  } catch (err) {
    console.error('获取用户详情错误:', err)
    res.status(500).json(fail(500, '获取用户详情失败'))
  }
})

// 编辑用户资料
router.put('/:id', adminRequired, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json(fail(404, '用户不存在'))

    const { nickname, bio, isVip, vipExpireAt } = req.body || {}

    db.prepare(
      `UPDATE users SET nickname = ?, bio = ?, is_vip = ?, vip_expire_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      nickname !== undefined ? nickname : user.nickname,
      bio !== undefined ? bio : user.bio,
      isVip !== undefined ? (isVip ? 1 : 0) : user.is_vip,
      vipExpireAt !== undefined ? vipExpireAt : user.vip_expire_at,
      user.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '用户管理', action: 'update', targetType: 'user', targetId: user.id,
      detail: JSON.stringify({ before: { nickname: user.nickname, isVip: user.is_vip }, after: { nickname, isVip } }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
    res.json(success(userPublic(updated)))
  } catch (err) {
    console.error('编辑用户错误:', err)
    res.status(500).json(fail(500, '编辑用户失败'))
  }
})

// 封禁/解封用户
router.patch('/:id/status', adminRequired, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json(fail(404, '用户不存在'))

    const { status, reason } = req.body || {}
    if (![0, 1].includes(status)) {
      return res.status(400).json(fail(400, '状态值无效，仅支持 1(正常) 或 0(封禁)'))
    }

    db.prepare(
      `UPDATE users SET status = ?, ban_reason = ?, banned_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      status,
      status === 0 ? (reason || '') : '',
      status === 0 ? new Date().toISOString() : null,
      user.id
    )

    const actionLabel = status === 0 ? '封禁' : '解封'
    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '用户管理', action: actionLabel, targetType: 'user', targetId: user.id,
      detail: JSON.stringify({ reason, status }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: user.id, status, reason }))
  } catch (err) {
    console.error('封禁/解封用户错误:', err)
    res.status(500).json(fail(500, '操作失败'))
  }
})

export default router
