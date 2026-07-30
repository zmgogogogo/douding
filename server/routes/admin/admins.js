// ============================================
//  管理员账号管理路由 — CRUD + 状态管理
// ============================================
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../../db/connection.js'
import { BCRYPT_ROUNDS } from '../../config.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 管理员列表
router.get('/', adminRequired, (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []
    if (keyword) {
      where += ' AND (a.username LIKE ? OR a.nickname LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (status !== undefined && status !== '') {
      where += ' AND a.status = ?'
      params.push(parseInt(status))
    }

    const total = db.prepare(`SELECT COUNT(*) as c FROM sys_admins a ${where}`).get(...params)
    const list = db.prepare(
      `SELECT a.id, a.username, a.nickname, a.status, a.role_id, a.last_login_at, a.last_login_ip, a.created_at,
              r.name as role_name
       FROM sys_admins a LEFT JOIN sys_roles r ON a.role_id = r.id
       ${where} ORDER BY a.created_at ASC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    res.json(paginated(list, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取管理员列表错误:', err)
    res.status(500).json(fail(500, '获取管理员列表失败'))
  }
})

// 新增管理员
router.post('/', adminRequired, (req, res) => {
  try {
    const { username, password, nickname, roleId } = req.body || {}
    if (!username || !password) {
      return res.status(400).json(fail(400, '请输入账号和密码'))
    }
    if (password.length < 6) {
      return res.status(400).json(fail(400, '密码长度不能少于6位'))
    }

    const existing = db.prepare('SELECT id FROM sys_admins WHERE username = ?').get(username)
    if (existing) {
      return res.status(409).json(fail(409, '账号已存在'))
    }

    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
    const result = db.prepare(
      `INSERT INTO sys_admins (username, password_hash, nickname, role_id, status)
       VALUES (?, ?, ?, ?, 1)`
    ).run(username, hash, nickname || username, roleId || 0)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'create', targetType: 'admin', targetId: result.lastInsertRowid,
      detail: JSON.stringify({ username, nickname }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    const admin = db.prepare(
      'SELECT a.*, r.name as role_name FROM sys_admins a LEFT JOIN sys_roles r ON a.role_id = r.id WHERE a.id = ?'
    ).get(result.lastInsertRowid)
    // 不返回密码哈希
    const { password_hash, ...safe } = admin
    res.json(success(safe))
  } catch (err) {
    console.error('创建管理员错误:', err)
    res.status(500).json(fail(500, '创建管理员失败'))
  }
})

// 编辑管理员
router.put('/:id', adminRequired, (req, res) => {
  try {
    const admin = db.prepare('SELECT * FROM sys_admins WHERE id = ?').get(req.params.id)
    if (!admin) return res.status(404).json(fail(404, '管理员不存在'))

    const { nickname, roleId, status } = req.body || {}

    db.prepare(
      `UPDATE sys_admins SET nickname = ?, role_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      nickname !== undefined ? nickname : admin.nickname,
      roleId !== undefined ? roleId : admin.role_id,
      status !== undefined ? status : admin.status,
      admin.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'update', targetType: 'admin', targetId: admin.id,
      detail: JSON.stringify({ nickname, roleId }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: admin.id }))
  } catch (err) {
    console.error('编辑管理员错误:', err)
    res.status(500).json(fail(500, '编辑管理员失败'))
  }
})

// 重置管理员密码
router.put('/:id/reset-password', adminRequired, (req, res) => {
  try {
    const admin = db.prepare('SELECT * FROM sys_admins WHERE id = ?').get(req.params.id)
    if (!admin) return res.status(404).json(fail(404, '管理员不存在'))

    const { newPassword } = req.body || {}
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json(fail(400, '新密码长度不能少于6位'))
    }

    const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS)
    db.prepare('UPDATE sys_admins SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hash, admin.id)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '权限管理', action: 'reset_password', targetType: 'admin', targetId: admin.id,
      detail: `重置管理员 ${admin.username} 的密码`,
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success(null))
  } catch (err) {
    res.status(500).json(fail(500, '重置密码失败'))
  }
})

export default router
