// ============================================
//  认证路由 — 注册/登录/个人信息
// ============================================
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db/connection.js'
import { BCRYPT_ROUNDS } from '../config.js'
import { authRequired } from '../middleware/auth.js'
import { signToken } from '../utils/jwt.js'
import { userPublic } from '../utils/helpers.js'

const router = Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' })
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ code: 400, message: '用户名需要 2-20 个字符' })
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少需要 6 位' })
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) return res.status(409).json({ code: 409, message: '用户名已存在' })

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const result = db
      .prepare('INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)')
      .run(username, hash, nickname || username)

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    const token = signToken({ id: user.id, username: user.username })
    res.json({ code: 200, data: { token, user: userPublic(user) } })
  } catch (err) {
    console.error('注册错误:', err)
    res.status(500).json({ code: 500, message: '注册失败，请稍后重试' })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请输入用户名和密码' })
    }
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user) {
      // 用户名不存在时，仍执行一次 hash 防止时序攻击
      await bcrypt.hash(password, BCRYPT_ROUNDS)
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }
    const token = signToken({ id: user.id, username: user.username })
    res.json({ code: 200, data: { token, user: userPublic(user) } })
  } catch (err) {
    console.error('登录错误:', err)
    res.status(500).json({ code: 500, message: '登录失败，请稍后重试' })
  }
})

// 当前用户
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
  res.json({ code: 200, data: userPublic(user) })
})

// 更新个人资料
router.put('/profile', authRequired, (req, res) => {
  const { nickname, bio } = req.body || {}
  db.prepare(
    "UPDATE users SET nickname = ?, bio = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(nickname || null, bio || null, req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ code: 200, data: userPublic(user) })
})

export default router
