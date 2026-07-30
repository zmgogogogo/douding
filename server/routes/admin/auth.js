// ============================================
//  管理端认证路由 — 管理员登录/登出/获取当前用户
// ============================================
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../../db/connection.js'
import { BCRYPT_ROUNDS } from '../../config.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { signAdminToken } from '../../middleware/adminAuth.js'
import { success, fail } from '../../utils/response.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 管理员登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json(fail(400, '请输入账号和密码'))
    }

    const admin = db.prepare('SELECT * FROM sys_admins WHERE username = ?').get(username)
    if (!admin) {
      return res.status(401).json(fail(401, '账号或密码错误'))
    }
    if (admin.status !== 1) {
      return res.status(403).json(fail(403, '账号已被禁用，请联系超级管理员'))
    }

    const valid = bcrypt.compareSync(password, admin.password_hash)
    if (!valid) {
      logAction(db, {
        adminId: admin.id, adminName: admin.username, module: '认证', action: 'login',
        ip: req.ip, userAgent: req.headers?.['user-agent'] || '', status: 0, errorMsg: '密码错误',
      })
      return res.status(401).json(fail(401, '账号或密码错误'))
    }

    // 加载角色权限
    let permissions = []
    if (admin.role_id) {
      const role = db.prepare('SELECT permissions FROM sys_roles WHERE id = ?').get(admin.role_id)
      if (role) {
        try { permissions = JSON.parse(role.permissions || '[]') } catch {}
      }
    }

    const token = signAdminToken({
      id: admin.id,
      username: admin.username,
      roleId: admin.role_id,
    })

    // 更新登录信息
    db.prepare(
      'UPDATE sys_admins SET last_login_at = datetime(\'now\'), last_login_ip = ? WHERE id = ?'
    ).run(req.ip, admin.id)

    logAction(db, {
      adminId: admin.id, adminName: admin.username, module: '认证', action: 'login',
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        avatar: admin.avatar,
        roleId: admin.role_id,
        permissions,
      },
    }))
  } catch (err) {
    console.error('管理员登录错误:', err)
    res.status(500).json(fail(500, '登录失败，请稍后重试'))
  }
})

// 获取当前管理员信息
router.get('/me', adminRequired, (req, res) => {
  try {
    const admin = db.prepare('SELECT * FROM sys_admins WHERE id = ?').get(req.admin.id)
    if (!admin) {
      return res.status(404).json(fail(404, '管理员不存在'))
    }

    let permissions = req.admin.permissions
    if (admin.role_id) {
      const role = db.prepare('SELECT permissions FROM sys_roles WHERE id = ?').get(admin.role_id)
      if (role) {
        try { permissions = JSON.parse(role.permissions || '[]') } catch {}
      }
    }

    res.json(success({
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
      roleId: admin.role_id,
      permissions,
      createdAt: admin.created_at,
    }))
  } catch (err) {
    console.error('获取管理员信息错误:', err)
    res.status(500).json(fail(500, '获取信息失败'))
  }
})

// 修改密码
router.put('/password', adminRequired, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {}
    if (!oldPassword || !newPassword) {
      return res.status(400).json(fail(400, '请输入旧密码和新密码'))
    }
    if (newPassword.length < 6) {
      return res.status(400).json(fail(400, '新密码长度不能少于6位'))
    }

    const admin = db.prepare('SELECT * FROM sys_admins WHERE id = ?').get(req.admin.id)
    if (!bcrypt.compareSync(oldPassword, admin.password_hash)) {
      return res.status(400).json(fail(400, '旧密码错误'))
    }

    const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS)
    db.prepare('UPDATE sys_admins SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hash, req.admin.id)

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username, module: '认证', action: 'update_password',
      detail: '修改密码', ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success(null))
  } catch (err) {
    console.error('修改密码错误:', err)
    res.status(500).json(fail(500, '修改密码失败'))
  }
})

export default router
