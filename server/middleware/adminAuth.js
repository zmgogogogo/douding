// ============================================
//  管理端认证中间件 — JWT 验证 + 权限校验
//  管理员与 C 端用户体系隔离，使用独立 JWT Secret
// ============================================
import jwt from 'jsonwebtoken'
import db from '../db/connection.js'
import { JWT_ADMIN_SECRET, JWT_ADMIN_EXPIRES_IN } from '../config.js'

/** 签发管理员 JWT Token */
export function signAdminToken(payload) {
  return jwt.sign({ ...payload, type: 'admin' }, JWT_ADMIN_SECRET, {
    expiresIn: JWT_ADMIN_EXPIRES_IN,
  })
}

/** 验证管理员 JWT Token */
export function verifyAdminToken(token) {
  const decoded = jwt.verify(token, JWT_ADMIN_SECRET)
  if (decoded.type !== 'admin') throw new Error('非管理员令牌')
  return decoded
}

/** 强制管理员认证：未登录返回 401 */
export function adminRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录管理后台' })
  }
  try {
    const decoded = verifyAdminToken(header.split(' ')[1])
    // 从数据库验证管理员是否存在且状态正常
    const admin = db
      .prepare('SELECT a.*, r.permissions FROM sys_admins a LEFT JOIN sys_roles r ON a.role_id = r.id WHERE a.id = ?')
      .get(decoded.id)
    if (!admin || admin.status !== 1) {
      return res.status(401).json({ code: 401, message: '账号已被禁用或不存在' })
    }
    req.admin = {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      roleId: admin.role_id,
      permissions: safeParsePermissions(admin.permissions),
    }
    // 更新最后登录时间
    db.prepare('UPDATE sys_admins SET last_login_at = datetime(\'now\'), last_login_ip = ? WHERE id = ?').run(
      req.ip, admin.id
    )
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' })
    }
    return res.status(401).json({ code: 401, message: '请先登录管理后台' })
  }
}

/**
 * 权限校验中间件工厂
 * @param  {...string} perms - 需要的权限点，如 'admin:users:write'
 * 只要拥有其中任意一个权限即可通过（OR 逻辑）
 */
export function adminPermission(...perms) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ code: 401, message: '请先登录管理后台' })
    }
    // 超级管理员（role_id = 0 或无 role）拥有所有权限
    if (!req.admin.roleId) return next()

    const has = perms.some((p) => req.admin.permissions.includes(p))
    if (!has) {
      return res.status(403).json({ code: 403, message: '权限不足，无法执行此操作' })
    }
    next()
  }
}

/** 安全解析权限 JSON */
function safeParsePermissions(permissions) {
  if (!permissions) return []
  try {
    return typeof permissions === 'string' ? JSON.parse(permissions) : permissions
  } catch {
    return []
  }
}
