// ============================================
//  认证中间件 — JWT 验证
// ============================================
import { verifyToken } from '../utils/jwt.js'

/** 强制认证：未登录返回 401 */
export function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '请先登录' })
  }
  try {
    req.user = verifyToken(header.split(' ')[1])
    next()
  } catch {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' })
  }
}

/** 可选认证：登录与否均可，解析成功则挂载 req.user */
export function authOptional(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.split(' ')[1])
    } catch {}
  }
  next()
}
