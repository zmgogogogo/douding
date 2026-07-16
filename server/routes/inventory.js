// ============================================
//  用户库存 + 公开主页路由
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { formatDesign, userPublic } from '../utils/helpers.js'

const router = Router()

// 珠子库存
router.get('/inventory', authRequired, (req, res) => {
  const items = db.prepare(`
    SELECT ui.quantity, c.id as color_id, c.name, c.hex, s.name as series, b.name as brand
    FROM user_bead_inventory ui
    JOIN bead_colors c ON ui.color_id = c.id
    JOIN bead_series s ON c.series_id = s.id
    JOIN bead_brands b ON s.brand_id = b.id
    WHERE ui.user_id = ? AND ui.quantity > 0
    ORDER BY b.id, s.sort_order, c.sort_order
  `).all(req.user.id)
  res.json({ code: 200, data: items })
})

router.post('/inventory', authRequired, (req, res) => {
  const { colorId, quantity } = req.body || {}
  if (!colorId || quantity === undefined) return res.status(400).json({ code: 400, message: '无效参数' })
  db.prepare(`
    INSERT INTO user_bead_inventory (user_id, color_id, quantity, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, color_id) DO UPDATE SET quantity = ?, updated_at = datetime('now')
  `).run(req.user.id, colorId, quantity, quantity)
  res.json({ code: 200, message: 'ok' })
})

// 用户公开主页
router.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })

  const designs = db.prepare(
    'SELECT * FROM designs WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC LIMIT 50'
  ).all(user.id)

  res.json({ code: 200, data: {
    ...userPublic(user),
    designs: designs.map(formatDesign),
    designCount: designs.length,
  }})
})

export default router
