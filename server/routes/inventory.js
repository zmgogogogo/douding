// ============================================
//  仓库管理路由 — 库存 + 日志 + 采购 + 消耗 + 用户主页
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { formatDesign, userPublic } from '../utils/helpers.js'

const router = Router()

// ============================================
//  库存 CRUD
// ============================================

// GET /api/inventory — 获取用户完整库存
router.get('/inventory', authRequired, (req, res) => {
  try {
    const inv = db.prepare(`
      SELECT i.*, c.name, c.hex, s.name as series, b.name as brand
      FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id = c.id
      JOIN bead_series s ON c.series_id = s.id
      JOIN bead_brands b ON s.brand_id = b.id
      WHERE i.user_id = ? AND (i.quantity > 0 OR i.transit_quantity > 0 OR i.min_threshold > 0)
      ORDER BY b.name, s.name, c.sort_order
    `).all(req.user.id)

    const stats = db.prepare(`
      SELECT COUNT(*) as totalColors, COALESCE(SUM(quantity),0) as totalBeads,
        SUM(CASE WHEN min_threshold>0 AND quantity<=min_threshold THEN 1 ELSE 0 END) as lowStockCount,
        COALESCE(SUM(transit_quantity),0) as totalTransit
      FROM user_bead_inventory WHERE user_id = ?
    `).get(req.user.id)

    res.json({ code: 200, data: { items: inv, stats } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// POST /api/inventory — 入库
router.post('/inventory', authRequired, (req, res) => {
  try {
    const { colorId, quantity, note, minThreshold } = req.body || {}
    if (!colorId || !quantity) return res.status(400).json({ code: 400, message: '缺少参数' })
    const userId = req.user.id
    const qty = parseInt(quantity)

    const cur = db.prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?').get(userId, colorId)
    const newQty = (cur?.quantity||0) + qty

    db.prepare(`INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,updated_at)
      VALUES (?,?,?,?,datetime('now')) ON CONFLICT(user_id,color_id)
      DO UPDATE SET quantity=excluded.quantity,min_threshold=MAX(min_threshold,excluded.min_threshold),updated_at=datetime('now')`)
      .run(userId, colorId, newQty, parseInt(minThreshold)||0)

    db.prepare(`INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
      VALUES (?,?,'inbound',?,?,'manual',?)`).run(userId, colorId, qty, newQty, note||'')

    res.json({ code: 200, data: { colorId, quantity: newQty }, message: `入库 ${qty} 颗` })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// PUT /api/inventory/:colorId — 更新库存/阈值/运输中
router.put('/inventory/:colorId', authRequired, (req, res) => {
  try {
    const colorId = parseInt(req.params.colorId), userId = req.user.id
    const { quantity, minThreshold, transitQuantity } = req.body || {}
    const cur = db.prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?').get(userId, colorId)

    if (quantity !== undefined && quantity !== cur?.quantity) {
      const oldQty = cur?.quantity||0, newQty = parseInt(quantity)
      db.prepare(`INSERT INTO user_bead_inventory (user_id,color_id,quantity,updated_at) VALUES (?,?,?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET quantity=excluded.quantity,updated_at=datetime('now')`).run(userId, colorId, newQty)
      db.prepare(`INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type) VALUES (?,'adjust',?,?,'manual')`)
        .run(userId, colorId, newQty-oldQty, newQty)
    }
    if (minThreshold !== undefined) {
      db.prepare(`INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,updated_at)
        VALUES (?,?,COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?),0),?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET min_threshold=excluded.min_threshold,updated_at=datetime('now')`)
        .run(userId, colorId, userId, colorId, parseInt(minThreshold))
    }
    if (transitQuantity !== undefined) {
      db.prepare(`INSERT INTO user_bead_inventory (user_id,color_id,quantity,transit_quantity,updated_at)
        VALUES (?,?,COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?),0),?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET transit_quantity=excluded.transit_quantity,updated_at=datetime('now')`)
        .run(userId, colorId, userId, colorId, parseInt(transitQuantity))
    }

    res.json({ code: 200, message: 'ok' })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  消耗出库
// ============================================

// POST /api/inventory/deduct
router.post('/inventory/deduct', authRequired, (req, res) => {
  try {
    const { designId, designTitle, beads } = req.body || {}
    if (!beads?.length) return res.status(400).json({ code: 400, message: '缺少消耗列表' })
    const userId = req.user.id, warnings = []

    const txn = db.transaction(() => {
      for (const b of beads) {
        const cur = db.prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?').get(userId, b.colorId)
        const curQty = cur?.quantity||0, newQty = Math.max(0, curQty-b.quantity)
        if (curQty < b.quantity) warnings.push({ colorId: b.colorId, short: b.quantity-curQty })
        db.prepare(`INSERT INTO user_bead_inventory (user_id,color_id,quantity,updated_at) VALUES (?,?,?,datetime('now'))
          ON CONFLICT(user_id,color_id) DO UPDATE SET quantity=MAX(0,quantity-?),updated_at=datetime('now')`)
          .run(userId, b.colorId, newQty, b.quantity)
        db.prepare(`INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,source_id,source_name)
          VALUES (?,'outbound',?,?,'design',?,?)`).run(userId, b.colorId, -b.quantity, newQty, designId||null, designTitle||'')
        db.prepare('INSERT INTO design_bead_usage (user_id,design_id,color_id,quantity) VALUES (?,?,?,?)')
          .run(userId, designId, b.colorId, b.quantity)
      }
    })
    txn()
    res.json({ code: 200, data: { warnings }, message: '消耗扣除成功' })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  日志 & 统计
// ============================================

router.get('/inventory/logs', authRequired, (req, res) => {
  try {
    const { page=1, limit=50 } = req.query
    const logs = db.prepare(`
      SELECT l.*, c.name as color_name, c.hex FROM inventory_logs l
      JOIN bead_colors c ON l.color_id=c.id WHERE l.user_id=? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`)
      .all(req.user.id, parseInt(limit), (page-1)*limit)
    res.json({ code: 200, data: logs })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/usage', authRequired, (req, res) => {
  try {
    const byColor = db.prepare(`
      SELECT c.id as color_id, c.name, c.hex, SUM(u.quantity) as total_used, COUNT(DISTINCT u.design_id) as design_count
      FROM design_bead_usage u JOIN bead_colors c ON u.color_id=c.id WHERE u.user_id=? GROUP BY u.color_id ORDER BY total_used DESC`)
      .all(req.user.id)
    res.json({ code: 200, data: { byColor } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/alerts', authRequired, (req, res) => {
  try {
    const items = db.prepare(`
      SELECT i.*, c.name, c.hex, s.name as series, b.name as brand FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id=c.id JOIN bead_series s ON c.series_id=s.id JOIN bead_brands b ON s.brand_id=b.id
      WHERE i.user_id=? AND i.min_threshold>0 AND i.quantity<=i.min_threshold ORDER BY i.quantity ASC`).all(req.user.id)
    res.json({ code: 200, data: { items, total: items.length, outOfStock: items.filter(i=>i.quantity===0), runningLow: items.filter(i=>i.quantity>0) } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  采购清单
// ============================================

router.post('/inventory/purchase-list', authRequired, (req, res) => {
  try {
    const { designIds, title } = req.body||{}, userId = req.user.id, params = [userId]
    let where = ''
    if (designIds?.length) { where = `AND u.design_id IN (${designIds.map(()=>'?').join(',')})`; params.push(...designIds) }

    const needed = db.prepare(`
      SELECT u.color_id, SUM(u.quantity) as total_needed, c.name, c.hex, COALESCE(i.quantity,0) as in_stock
      FROM design_bead_usage u JOIN bead_colors c ON u.color_id=c.id
      LEFT JOIN user_bead_inventory i ON i.user_id=? AND i.color_id=u.color_id
      WHERE u.user_id=? ${where} GROUP BY u.color_id HAVING total_needed>in_stock ORDER BY (total_needed-in_stock) DESC`)
      .all(userId, ...params)

    let listId = null
    if (needed.length && title) {
      const r = db.prepare('INSERT INTO purchase_lists (user_id,title) VALUES (?,?)').run(userId, title)
      listId = r.lastInsertRowid
      const ins = db.prepare('INSERT INTO purchase_items (list_id,color_id,need_quantity) VALUES (?,?,?)')
      for (const n of needed) ins.run(listId, n.color_id, n.total_needed-n.in_stock)
    }

    const shortage = needed.reduce((s,n)=>s+n.total_needed-n.in_stock, 0)
    res.json({ code: 200, data: { listId, items: needed, shortage },
      message: needed.length ? `共需补 ${needed.length} 种颜色，${shortage} 颗` : '库存充足 🎉' })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/purchase-lists', authRequired, (req, res) => {
  try {
    const lists = db.prepare('SELECT * FROM purchase_lists WHERE user_id=? ORDER BY created_at DESC').all(req.user.id)
    const detail = db.prepare(`SELECT pi.*, c.name, c.hex FROM purchase_items pi JOIN bead_colors c ON pi.color_id=c.id WHERE pi.list_id=?`)
    res.json({ code: 200, data: lists.map(l=>({...l, items: detail.all(l.id)})) })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/stats', authRequired, (req, res) => {
  try {
    const overview = db.prepare(`SELECT COUNT(DISTINCT color_id) as tracked_colors, COALESCE(SUM(quantity),0) as total_in_stock,
      COALESCE(SUM(transit_quantity),0) as total_in_transit FROM user_bead_inventory WHERE user_id=?`).get(req.user.id)
    const topConsumed = db.prepare(`SELECT c.name, c.hex, SUM(u.quantity) as total FROM design_bead_usage u
      JOIN bead_colors c ON u.color_id=c.id WHERE u.user_id=? GROUP BY u.color_id ORDER BY total DESC LIMIT 10`).all(req.user.id)
    res.json({ code: 200, data: { overview, topConsumed } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  用户公开主页
// ============================================
router.get('/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
  const designs = db.prepare('SELECT * FROM designs WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC LIMIT 50').all(user.id)
  res.json({ code: 200, data: { ...userPublic(user), designs: designs.map(formatDesign), designCount: designs.length } })
})

export default router
