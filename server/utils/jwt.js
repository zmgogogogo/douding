// ============================================
//  JWT 工具 — Token 签发和验证
// ============================================
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js'

/** 签发 JWT Token */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/** 验证 JWT Token */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}
