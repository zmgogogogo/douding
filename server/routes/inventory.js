// ============================================
//  仓库管理路由 — 库存 + 日志 + 采购 + 消耗 + 用户主页
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'
import { formatDesign, userPublic } from '../utils/helpers.js'
import { rgbToLab, deltaE2000 } from '../utils/colorSpace.js'

const router = Router()

// ============================================
//  库存 CRUD
// ============================================

// GET /api/inventory — 获取用户完整库存
router.get('/inventory', authRequired, (req, res) => {
  try {
    const inv = db
      .prepare(
        `
      SELECT i.*, c.name, c.hex, s.name as series, b.name as brand
      FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id = c.id
      JOIN bead_series s ON c.series_id = s.id
      JOIN bead_brands b ON s.brand_id = b.id
      WHERE i.user_id = ? AND (i.quantity > 0 OR i.transit_quantity > 0 OR i.min_threshold > 0)
      ORDER BY b.name, s.name, c.sort_order
    `
      )
      .all(req.user.id)

    const stats = db
      .prepare(
        `
      SELECT COUNT(*) as totalColors, COALESCE(SUM(quantity),0) as totalBeads,
        SUM(CASE WHEN min_threshold>0 AND quantity<=min_threshold THEN 1 ELSE 0 END) as lowStockCount,
        COALESCE(SUM(transit_quantity),0) as totalTransit
      FROM user_bead_inventory WHERE user_id = ?
    `
      )
      .get(req.user.id)

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

    const cur = db
      .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
      .get(userId, colorId)
    const newQty = (cur?.quantity || 0) + qty

    db.prepare(
      `INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,updated_at)
      VALUES (?,?,?,?,datetime('now')) ON CONFLICT(user_id,color_id)
      DO UPDATE SET quantity=excluded.quantity,min_threshold=MAX(min_threshold,excluded.min_threshold),updated_at=datetime('now')`
    ).run(userId, colorId, newQty, parseInt(minThreshold) || 0)

    db.prepare(
      `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
      VALUES (?,?,'inbound',?,?,'manual',?)`
    ).run(userId, colorId, qty, newQty, note || '')

    res.json({ code: 200, data: { colorId, quantity: newQty }, message: `入库 ${qty} 颗` })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// PUT /api/inventory/:colorId — 更新库存/阈值/运输中
router.put('/inventory/:colorId', authRequired, (req, res) => {
  try {
    const colorId = parseInt(req.params.colorId),
      userId = req.user.id
    const { quantity, minThreshold, transitQuantity } = req.body || {}
    const cur = db
      .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
      .get(userId, colorId)

    if (quantity !== undefined && quantity !== cur?.quantity) {
      const oldQty = cur?.quantity || 0,
        newQty = parseInt(quantity)
      db.prepare(
        `INSERT INTO user_bead_inventory (user_id,color_id,quantity,updated_at) VALUES (?,?,?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET quantity=excluded.quantity,updated_at=datetime('now')`
      ).run(userId, colorId, newQty)
      db.prepare(
        `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type) VALUES (?,'adjust',?,?,'manual')`
      ).run(userId, colorId, newQty - oldQty, newQty)
    }
    if (minThreshold !== undefined) {
      db.prepare(
        `INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,updated_at)
        VALUES (?,?,COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?),0),?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET min_threshold=excluded.min_threshold,updated_at=datetime('now')`
      ).run(userId, colorId, userId, colorId, parseInt(minThreshold))
    }
    if (transitQuantity !== undefined) {
      db.prepare(
        `INSERT INTO user_bead_inventory (user_id,color_id,quantity,transit_quantity,updated_at)
        VALUES (?,?,COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?),0),?,datetime('now'))
        ON CONFLICT(user_id,color_id) DO UPDATE SET transit_quantity=excluded.transit_quantity,updated_at=datetime('now')`
      ).run(userId, colorId, userId, colorId, parseInt(transitQuantity))
    }

    res.json({ code: 200, message: 'ok' })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  批量操作
// ============================================

// POST /api/inventory/batch — 批量入库/调整
router.post('/inventory/batch', authRequired, (req, res) => {
  try {
    const { items } = req.body || {}
    if (!items?.length) return res.status(400).json({ code: 400, message: '缺少批量数据' })
    const userId = req.user.id
    let success = 0,
      failed = 0

    const txn = db.transaction(() => {
      for (const item of items) {
        if (!item.colorId || item.quantity == null) {
          failed++
          continue
        }
        const cur = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
          .get(userId, item.colorId)
        const newQty = item.relative ? (cur?.quantity || 0) + item.quantity : item.quantity
        db.prepare(
          `INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,updated_at)
          VALUES (?,?,?,COALESCE(?,0),datetime('now')) ON CONFLICT(user_id,color_id)
          DO UPDATE SET quantity=excluded.quantity,min_threshold=MAX(min_threshold,excluded.min_threshold),updated_at=datetime('now')`
        ).run(userId, item.colorId, Math.max(0, newQty), parseInt(item.minThreshold) || 0)
        db.prepare(
          `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
          VALUES (?,'adjust',?,?,'batch',?)`
        ).run(
          userId,
          item.colorId,
          newQty - (cur?.quantity || 0),
          Math.max(0, newQty),
          item.note || ''
        )
        success++
      }
    })
    txn()
    res.json({
      code: 200,
      data: { success, failed },
      message: `批量操作完成：${success}成功${failed > 0 ? `, ${failed}失败` : ''}`,
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// POST /api/inventory/batch-delete — 批量删除库存记录
router.post('/inventory/batch-delete', authRequired, (req, res) => {
  try {
    const { colorIds } = req.body || {}
    if (!colorIds?.length) return res.status(400).json({ code: 400, message: '请选择要删除的颜色' })
    const userId = req.user.id
    const txn = db.transaction(() => {
      for (const id of colorIds) {
        db.prepare('DELETE FROM user_bead_inventory WHERE user_id=? AND color_id=?').run(userId, id)
        db.prepare(
          `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
          VALUES (?,'adjust',0,0,'batch_delete','已删除库存记录')`
        ).run(userId, id)
      }
    })
    txn()
    res.json({
      code: 200,
      data: { deleted: colorIds.length },
      message: `已删除 ${colorIds.length} 条库存记录`,
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// POST /api/inventory/stock-check — 盘点：提交实盘数量，计算盘盈盘亏
router.post('/inventory/stock-check', authRequired, (req, res) => {
  try {
    const { items } = req.body || {}
    if (!items?.length) return res.status(400).json({ code: 400, message: '缺少盘点数据' })
    const userId = req.user.id
    const results = []

    const txn = db.transaction(() => {
      for (const item of items) {
        const cur = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
          .get(userId, item.colorId)
        const curQty = cur?.quantity || 0
        const actualQty = parseInt(item.actualQuantity) || 0
        const diff = actualQty - curQty
        if (diff !== 0) {
          db.prepare(
            "UPDATE user_bead_inventory SET quantity=?, updated_at=datetime('now') WHERE user_id=? AND color_id=?"
          ).run(actualQty, userId, item.colorId)
        }
        db.prepare(
          `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
          VALUES (?,'adjust',?,?,'stock_check',?)`
        ).run(
          userId,
          diff,
          actualQty,
          diff > 0 ? `盘点：盘盈 +${diff}` : diff < 0 ? `盘点：盘亏 ${diff}` : '盘点：一致'
        )
        results.push({ colorId: item.colorId, beforeQty: curQty, actualQty, diff })
      }
    })
    txn()

    const totalDiff = results.reduce((s, r) => s + r.diff, 0)
    res.json({
      code: 200,
      data: { results, totalDiff, checkCount: results.length },
      message: `盘点完成：${results.filter((r) => r.diff !== 0).length} 项有差异，净${totalDiff >= 0 ? '增' : '减'}${Math.abs(totalDiff)}颗`,
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// POST /api/inventory/import — JSON批量导入库存（兼容前端Excel解析结果）
router.post('/inventory/import', authRequired, (req, res) => {
  try {
    const { items } = req.body || {}
    if (!items?.length) return res.status(400).json({ code: 400, message: '缺少导入数据' })
    const userId = req.user.id
    let success = 0,
      failed = 0,
      errors = []

    const txn = db.transaction(() => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        // 支持按 name 或 hex 查找color_id
        let colorId = item.colorId
        if (!colorId && item.name) {
          const found = db
            .prepare('SELECT id FROM bead_colors WHERE name LIKE ? OR hex=?')
            .get(`%${item.name}%`, item.hex || '')
          if (found) colorId = found.id
        }
        if (!colorId) {
          failed++
          errors.push(`第${i + 1}行: 找不到颜色 "${item.name || item.hex}"`)
          continue
        }
        const qty = parseInt(item.quantity) || 0
        const threshold = parseInt(item.minThreshold) || 0
        const cost = parseFloat(item.unitCost) || 0
        const loc = item.location || ''
        db.prepare(
          `INSERT INTO user_bead_inventory (user_id,color_id,quantity,min_threshold,unit_cost,location,updated_at)
          VALUES (?,?,?,?,?,?,datetime('now'))
          ON CONFLICT(user_id,color_id) DO UPDATE SET quantity=quantity+excluded.quantity,
          min_threshold=MAX(min_threshold,excluded.min_threshold),unit_cost=excluded.unit_cost,
          location=COALESCE(NULLIF(excluded.location,''),location),updated_at=datetime('now')`
        ).run(userId, colorId, qty, threshold, cost, loc)
        db.prepare(
          `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,note)
          VALUES (?,'inbound',?,?,'import',?)`
        ).run(userId, colorId, qty, qty, item.note || '批量导入')
        success++
      }
    })
    txn()
    res.json({
      code: 200,
      data: { success, failed, errors },
      message: `导入完成：${success}成功${failed > 0 ? `, ${failed}失败` : ''}`,
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  消耗出库
// ============================================

// POST /api/inventory/deduct — 制作扣减（支持损耗率和多份制作）
router.post('/inventory/deduct', authRequired, (req, res) => {
  try {
    const { designId, designTitle, beads, copies = 1, lossRate = 5 } = req.body || {}
    if (!beads?.length) return res.status(400).json({ code: 400, message: '缺少消耗列表' })
    const userId = req.user.id,
      warnings = []
    const lossMultiplier = 1 + (parseFloat(lossRate) || 5) / 100
    const copyCount = Math.max(1, parseInt(copies) || 1)

    const txn = db.transaction(() => {
      for (const b of beads) {
        // 实际消耗 = 单份用量 × 份数 × (1 + 损耗率)
        const actualQty = Math.ceil((b.quantity || 0) * copyCount * lossMultiplier)
        const cur = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
          .get(userId, b.colorId)
        const curQty = cur?.quantity || 0
        const newQty = Math.max(0, curQty - actualQty)
        if (curQty < actualQty)
          warnings.push({ colorId: b.colorId, short: actualQty - curQty, name: b.name || '' })
        db.prepare(
          `INSERT INTO user_bead_inventory (user_id,color_id,quantity,updated_at) VALUES (?,?,?,datetime('now'))
          ON CONFLICT(user_id,color_id) DO UPDATE SET quantity=MAX(0,quantity-?),updated_at=datetime('now')`
        ).run(userId, b.colorId, newQty, actualQty)
        db.prepare(
          `INSERT INTO inventory_logs (user_id,color_id,action,quantity,balance_after,source_type,source_id,source_name,note)
          VALUES (?,'outbound',?,?,'design',?,?,?)`
        ).run(
          userId,
          b.colorId,
          -actualQty,
          newQty,
          designId || null,
          designTitle || '',
          `制作${copyCount}份, 损耗率${lossRate}%`
        )
        db.prepare(
          'INSERT INTO design_bead_usage (user_id,design_id,color_id,quantity) VALUES (?,?,?,?)'
        ).run(userId, designId, b.colorId, actualQty)
      }
    })
    txn()
    res.json({
      code: 200,
      data: {
        warnings,
        copies: copyCount,
        lossRate,
        totalBeads: beads.reduce((s, b) => s + b.quantity * copyCount, 0),
      },
      message: warnings.length
        ? `消耗扣除完成（${warnings.length}种颜色库存不足）`
        : '消耗扣除成功',
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  日志 & 统计
// ============================================

router.get('/inventory/logs', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const logs = db
      .prepare(
        `
      SELECT l.*, c.name as color_name, c.hex FROM inventory_logs l
      JOIN bead_colors c ON l.color_id=c.id WHERE l.user_id=? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(req.user.id, parseInt(limit), (page - 1) * limit)
    res.json({ code: 200, data: logs })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/usage', authRequired, (req, res) => {
  try {
    const byColor = db
      .prepare(
        `
      SELECT c.id as color_id, c.name, c.hex, SUM(u.quantity) as total_used, COUNT(DISTINCT u.design_id) as design_count
      FROM design_bead_usage u JOIN bead_colors c ON u.color_id=c.id WHERE u.user_id=? GROUP BY u.color_id ORDER BY total_used DESC`
      )
      .all(req.user.id)
    res.json({ code: 200, data: { byColor } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/alerts', authRequired, (req, res) => {
  try {
    const items = db
      .prepare(
        `
      SELECT i.*, c.name, c.hex, s.name as series, b.name as brand FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id=c.id JOIN bead_series s ON c.series_id=s.id JOIN bead_brands b ON s.brand_id=b.id
      WHERE i.user_id=? AND i.min_threshold>0 AND i.quantity<=i.min_threshold ORDER BY i.quantity ASC`
      )
      .all(req.user.id)
    res.json({
      code: 200,
      data: {
        items,
        total: items.length,
        outOfStock: items.filter((i) => i.quantity === 0),
        runningLow: items.filter((i) => i.quantity > 0),
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  采购清单
// ============================================

router.post('/inventory/purchase-list', authRequired, (req, res) => {
  try {
    const { designIds, title } = req.body || {},
      userId = req.user.id,
      params = [userId]
    let where = ''
    if (designIds?.length) {
      where = `AND u.design_id IN (${designIds.map(() => '?').join(',')})`
      params.push(...designIds)
    }

    const needed = db
      .prepare(
        `
      SELECT u.color_id, SUM(u.quantity) as total_needed, c.name, c.hex, COALESCE(i.quantity,0) as in_stock
      FROM design_bead_usage u JOIN bead_colors c ON u.color_id=c.id
      LEFT JOIN user_bead_inventory i ON i.user_id=? AND i.color_id=u.color_id
      WHERE u.user_id=? ${where} GROUP BY u.color_id HAVING total_needed>in_stock ORDER BY (total_needed-in_stock) DESC`
      )
      .all(userId, ...params)

    let listId = null
    if (needed.length && title) {
      const r = db
        .prepare('INSERT INTO purchase_lists (user_id,title) VALUES (?,?)')
        .run(userId, title)
      listId = r.lastInsertRowid
      const ins = db.prepare(
        'INSERT INTO purchase_items (list_id,color_id,need_quantity) VALUES (?,?,?)'
      )
      for (const n of needed) ins.run(listId, n.color_id, n.total_needed - n.in_stock)
    }

    const shortage = needed.reduce((s, n) => s + n.total_needed - n.in_stock, 0)
    res.json({
      code: 200,
      data: { listId, items: needed, shortage },
      message: needed.length ? `共需补 ${needed.length} 种颜色，${shortage} 颗` : '库存充足 🎉',
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/purchase-lists', authRequired, (req, res) => {
  try {
    const lists = db
      .prepare('SELECT * FROM purchase_lists WHERE user_id=? ORDER BY created_at DESC')
      .all(req.user.id)
    const detail = db.prepare(
      `SELECT pi.*, c.name, c.hex FROM purchase_items pi JOIN bead_colors c ON pi.color_id=c.id WHERE pi.list_id=?`
    )
    res.json({ code: 200, data: lists.map((l) => ({ ...l, items: detail.all(l.id) })) })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.get('/inventory/stats', authRequired, (req, res) => {
  try {
    const overview = db
      .prepare(
        `SELECT COUNT(DISTINCT color_id) as tracked_colors, COALESCE(SUM(quantity),0) as total_in_stock,
      COALESCE(SUM(transit_quantity),0) as total_in_transit FROM user_bead_inventory WHERE user_id=?`
      )
      .get(req.user.id)
    const topConsumed = db
      .prepare(
        `SELECT c.name, c.hex, SUM(u.quantity) as total FROM design_bead_usage u
      JOIN bead_colors c ON u.color_id=c.id WHERE u.user_id=? GROUP BY u.color_id ORDER BY total DESC LIMIT 10`
      )
      .all(req.user.id)
    res.json({ code: 200, data: { overview, topConsumed } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// GET /api/inventory/export-csv — 导出库存CSV
router.get('/inventory/export-csv', authRequired, (req, res) => {
  try {
    const items = db
      .prepare(
        `
      SELECT c.name, c.hex, s.name as series, b.name as brand,
        i.quantity, i.min_threshold, i.transit_quantity
      FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id=c.id
      JOIN bead_series s ON c.series_id=s.id
      JOIN bead_brands b ON s.brand_id=b.id
      WHERE i.user_id=? ORDER BY b.name, s.name, c.sort_order
    `
      )
      .all(req.user.id)

    const header = '品牌,系列,色号,颜色名,库存,预警阈值,运输中'
    const rows = items.map(
      (i) =>
        `"${i.brand}","${i.series}","${i.name}","${i.hex}",${i.quantity},${i.min_threshold || 0},${i.transit_quantity || 0}`
    )
    const csv = '﻿' + header + '\n' + rows.join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="拼豆库存.csv"')
    res.send(csv)
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  图纸缺色匹配（豆仓核心功能）
// ============================================

// POST /api/inventory/match — 单图纸缺色匹配
router.post('/inventory/match', authRequired, (req, res) => {
  try {
    const { designId, beadList } = req.body || {}
    const userId = req.user.id
    let colorUsage = []

    if (designId) {
      // 从图纸数据统计颜色用量
      const design = db
        .prepare('SELECT grid_data, grid_width, grid_height FROM designs WHERE id=?')
        .get(designId)
      if (!design) return res.status(404).json({ code: 404, message: '图纸不存在' })
      const grid = JSON.parse(design.grid_data || '[]')
      const usageMap = {}
      for (const row of grid) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          if (cell?.hex) {
            const key = cell.hex.toUpperCase()
            usageMap[key] = (usageMap[key] || 0) + 1
          }
        }
      }
      colorUsage = Object.entries(usageMap).map(([hex, count]) => ({ hex, count }))
    } else if (beadList?.length) {
      // 编辑器直接传入颜色清单
      const usageMap = {}
      for (const b of beadList) {
        if (b.hex) {
          const key = b.hex.toUpperCase()
          usageMap[key] = (usageMap[key] || 0) + (b.count || 1)
        }
      }
      colorUsage = Object.entries(usageMap).map(([hex, count]) => ({ hex, count }))
    }

    if (!colorUsage.length) return res.status(400).json({ code: 400, message: '无有效颜色数据' })

    // 查询用户库存（含LAB值用于替代色计算）
    const inventory = db
      .prepare(
        `
      SELECT i.color_id, i.quantity, c.name, c.hex, c.lab_l, c.lab_a, c.lab_b,
             s.name as series, b.name as brand
      FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id=c.id
      JOIN bead_series s ON c.series_id=s.id
      JOIN bead_brands b ON s.brand_id=b.id
      WHERE i.user_id=? AND i.quantity>0
    `
      )
      .all(userId)

    const stockMap = {}
    for (const inv of inventory) {
      stockMap[inv.hex.toUpperCase()] = inv
    }

    // 逐色比对
    const sufficient = [],
      insufficient = [],
      missing = []
    for (const usage of colorUsage) {
      const stock = stockMap[usage.hex]
      if (stock && stock.quantity >= usage.count) {
        sufficient.push({
          colorId: stock.color_id,
          name: stock.name,
          hex: stock.hex,
          brand: stock.brand,
          series: stock.series,
          need: usage.count,
          stock: stock.quantity,
        })
      } else if (stock && stock.quantity > 0) {
        insufficient.push({
          colorId: stock.color_id,
          name: stock.name,
          hex: stock.hex,
          brand: stock.brand,
          series: stock.series,
          need: usage.count,
          stock: stock.quantity,
          shortage: usage.count - stock.quantity,
        })
      } else {
        missing.push({
          hex: usage.hex,
          need: usage.count,
          stock: 0,
          shortage: usage.count,
        })
      }
    }

    // 为缺失/不足颜色找替代色
    const suggestions = {}
    const allForSub = [...missing, ...insufficient]
    for (const item of allForSub) {
      const h = item.hex.replace('#', '')
      if (h.length !== 6) continue
      const r = parseInt(h.substring(0, 2), 16)
      const g = parseInt(h.substring(2, 4), 16)
      const b = parseInt(h.substring(4, 6), 16)
      const targetLab = rgbToLab(r, g, b)

      const alts = inventory
        .map((inv) => {
          if (!inv.lab_l && inv.lab_l !== 0) return null
          const dist = deltaE2000(targetLab, { L: inv.lab_l, a: inv.lab_a, b: inv.lab_b })
          return { ...inv, deltaE: Math.round(dist * 100) / 100 }
        })
        .filter((a) => a && a.deltaE < 10)
        .sort((a, b) => a.deltaE - b.deltaE)
        .slice(0, 8)
        .map((a) => ({
          colorId: a.color_id,
          name: a.name,
          hex: a.hex,
          brand: a.brand,
          series: a.series,
          deltaE: a.deltaE,
          inStock: a.quantity,
          grade: a.deltaE < 3 ? 'excellent' : a.deltaE < 5 ? 'good' : 'acceptable',
        }))

      if (alts.length) suggestions[item.hex] = alts
    }

    // 可制作份数
    let maxCopies = Infinity
    for (const usage of colorUsage) {
      const stock = stockMap[usage.hex]
      const copies = stock ? Math.floor(stock.quantity / usage.count) : 0
      if (copies < maxCopies) maxCopies = copies
    }
    if (!isFinite(maxCopies) || maxCopies === Infinity) maxCopies = 0

    const totalColors = colorUsage.length
    const matchedColors = sufficient.length
    const matchRate = totalColors > 0 ? Math.round((matchedColors / totalColors) * 1000) / 10 : 0
    const totalBeads = colorUsage.reduce((s, u) => s + u.count, 0)

    res.json({
      code: 200,
      data: {
        matchRate,
        sufficient,
        insufficient,
        missing,
        maxCopies,
        totalColors,
        matchedColors,
        totalBeads,
        suggestions,
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// GET /api/inventory/purchase-suggest — 智能采购建议
router.get('/inventory/purchase-suggest', authRequired, (req, res) => {
  try {
    const userId = req.user.id

    // 1. 低于阈值的颜色
    const lowStock = db
      .prepare(
        `
      SELECT i.color_id, i.quantity, i.min_threshold, c.name, c.hex, c.is_hot,
             s.name as series, b.name as brand
      FROM user_bead_inventory i
      JOIN bead_colors c ON i.color_id=c.id
      JOIN bead_series s ON c.series_id=s.id
      JOIN bead_brands b ON s.brand_id=b.id
      WHERE i.user_id=? AND i.min_threshold>0 AND i.quantity<=i.min_threshold
      ORDER BY i.quantity ASC
    `
      )
      .all(userId)

    // 2. 热门色（全平台使用频率Top 20）
    const hotColors = db
      .prepare(
        `
      SELECT c.id, c.name, c.hex, COUNT(u.id) as usage_count
      FROM bead_colors c
      LEFT JOIN design_bead_usage u ON c.id=u.color_id
      GROUP BY c.id
      ORDER BY usage_count DESC LIMIT 20
    `
      )
      .all()

    // 3. 图纸缺色（最近编辑的5张图纸）
    const recentDesigns = db
      .prepare(
        `
      SELECT id, title FROM designs WHERE user_id=? ORDER BY updated_at DESC LIMIT 5
    `
      )
      .all(userId)
    const designShortages = []
    for (const d of recentDesigns) {
      const grid = JSON.parse(
        (db.prepare('SELECT grid_data FROM designs WHERE id=?').get(d.id) || {}).grid_data || '[]'
      )
      const usage = {}
      for (const row of grid || []) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          if (cell?.hex) usage[cell.hex.toUpperCase()] = (usage[cell.hex.toUpperCase()] || 0) + 1
        }
      }
      for (const [hex, need] of Object.entries(usage)) {
        const color = db
          .prepare(
            `
          SELECT c.id, c.name, c.hex FROM bead_colors c WHERE UPPER(c.hex)=?
        `
          )
          .get(hex)
        if (!color) continue
        const inv = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id=? AND color_id=?')
          .get(userId, color.id)
        const stock = inv?.quantity || 0
        if (stock < need) {
          designShortages.push({
            colorId: color.id,
            name: color.name,
            hex: color.hex,
            need,
            stock,
            shortage: need - stock,
            designTitle: d.title,
            designId: d.id,
          })
        }
      }
    }

    // 推荐包装
    const specs = db
      .prepare('SELECT * FROM package_specs WHERE status=1 ORDER BY size, default_count')
      .all()
    const recommendations = []
    const seen = new Set()

    for (const item of [...lowStock, ...designShortages]) {
      const key = item.color_id || item.colorId
      if (seen.has(key)) continue
      seen.add(key)

      // 计算建议数量
      const shortage =
        item.shortage || Math.max(0, (item.min_threshold || 200) - (item.quantity || 0))
      const safeStock = item.min_threshold || 200
      const suggestQty = Math.max(shortage + safeStock - (item.quantity || 0), 0)

      // 匹配最接近的包装
      const matchingSpec = specs
        .filter((s) => !s.brand || s.brand === (item.brand || ''))
        .sort(
          (a, b) => Math.abs(a.default_count - suggestQty) - Math.abs(b.default_count - suggestQty)
        )[0]

      recommendations.push({
        colorId: key,
        name: item.name,
        hex: item.hex,
        brand: item.brand,
        currentStock: item.quantity || 0,
        shortage,
        suggestQty,
        reason: item.designTitle ? `图纸「${item.designTitle}」缺色` : '库存偏低',
        suggestedPack: matchingSpec
          ? {
              name: matchingSpec.package_name,
              count: matchingSpec.default_count,
              price: matchingSpec.reference_price,
              packs: Math.max(1, Math.ceil(suggestQty / matchingSpec.default_count)),
            }
          : null,
        estimatedCost: matchingSpec
          ? matchingSpec.reference_price *
            Math.max(1, Math.ceil(suggestQty / matchingSpec.default_count))
          : null,
      })
    }

    const totalCost = recommendations.reduce((s, r) => s + (r.estimatedCost || 0), 0)

    res.json({
      code: 200,
      data: {
        lowStock,
        hotColors: hotColors.filter((c) => c.usage_count > 0),
        designShortages,
        recommendations: recommendations.sort((a, b) => b.shortage - a.shortage),
        totalEstimatedCost: Math.round(totalCost * 100) / 100,
        totalItems: recommendations.length,
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// GET /api/inventory/color-detail/:colorId — 色号详情（含库存/日志/相关图纸）
router.get('/inventory/color-detail/:colorId', authRequired, (req, res) => {
  try {
    const colorId = parseInt(req.params.colorId),
      userId = req.user.id

    // 颜色基本信息
    const color = db
      .prepare(
        `
      SELECT c.id, c.name, c.hex, c.lab_l, c.lab_a, c.lab_b, c.color_type,
             s.name as series, b.name as brand
      FROM bead_colors c
      JOIN bead_series s ON c.series_id=s.id
      JOIN bead_brands b ON s.brand_id=b.id
      WHERE c.id=?
    `
      )
      .get(colorId)
    if (!color) return res.status(404).json({ code: 404, message: '颜色不存在' })

    // 用户库存
    const inventory = db
      .prepare(
        'SELECT quantity, min_threshold as minThreshold, transit_quantity as transitQuantity, updated_at as updatedAt FROM user_bead_inventory WHERE user_id=? AND color_id=?'
      )
      .get(userId, colorId) || { quantity: 0, minThreshold: 0, transitQuantity: 0 }

    // 操作日志（最近50条）
    const logs = db
      .prepare(
        `
      SELECT id, action, quantity, balance_after as balanceAfter, source_type as sourceType,
             source_id as sourceId, source_name as sourceName, note, created_at
      FROM inventory_logs WHERE user_id=? AND color_id=?
      ORDER BY created_at DESC LIMIT 50
    `
      )
      .all(userId, colorId)

    // 相关图纸
    const relatedDesigns = db
      .prepare(
        `
      SELECT d.id, d.title, d.thumbnail, u.quantity as usedCount
      FROM design_bead_usage u
      JOIN designs d ON u.design_id=d.id
      WHERE u.user_id=? AND u.color_id=?
      ORDER BY u.quantity DESC LIMIT 8
    `
      )
      .all(userId, colorId)

    res.json({
      code: 200,
      data: { color, inventory, logs, relatedDesigns },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// GET /api/inventory/substitute/:colorId — 替代色推荐
router.get('/inventory/substitute/:colorId', authRequired, (req, res) => {
  try {
    const colorId = parseInt(req.params.colorId)
    const userId = req.user.id
    const warehouseOnly = req.query.warehouseOnly === 'true'

    // 目标颜色
    const target = db
      .prepare('SELECT id, name, hex, lab_l, lab_a, lab_b FROM bead_colors WHERE id=?')
      .get(colorId)
    if (!target || (!target.lab_l && target.lab_l !== 0)) {
      return res.status(404).json({ code: 404, message: '颜色不存在或缺少LAB值' })
    }
    const targetLab = { L: target.lab_l, a: target.lab_a, b: target.lab_b }

    // 候选颜色
    let candidates
    if (warehouseOnly) {
      candidates = db
        .prepare(
          `
        SELECT c.id, c.name, c.hex, c.lab_l, c.lab_a, c.lab_b,
               s.name as series, b.name as brand, i.quantity
        FROM user_bead_inventory i
        JOIN bead_colors c ON i.color_id=c.id
        JOIN bead_series s ON c.series_id=s.id
        JOIN bead_brands b ON s.brand_id=b.id
        WHERE i.user_id=? AND i.quantity>0 AND c.id!=?
      `
        )
        .all(userId, colorId)
    } else {
      candidates = db
        .prepare(
          `
        SELECT c.id, c.name, c.hex, c.lab_l, c.lab_a, c.lab_b,
               s.name as series, b.name as brand,
               COALESCE(i.quantity,0) as quantity
        FROM bead_colors c
        JOIN bead_series s ON c.series_id=s.id
        JOIN bead_brands b ON s.brand_id=b.id
        LEFT JOIN user_bead_inventory i ON i.color_id=c.id AND i.user_id=?
        WHERE c.id!=?
      `
        )
        .all(userId, colorId)
    }

    const substitutes = candidates
      .map((c) => {
        if (!c.lab_l && c.lab_l !== 0) return null
        const dist = deltaE2000(targetLab, { L: c.lab_l, a: c.lab_a, b: c.lab_b })
        return {
          color: { id: c.id, name: c.name, hex: c.hex, brand: c.brand, series: c.series },
          deltaE: Math.round(dist * 100) / 100,
          inStock: c.quantity || 0,
          grade: dist < 3 ? 'excellent' : dist < 5 ? 'good' : dist < 10 ? 'acceptable' : 'poor',
        }
      })
      .filter((s) => s && s.deltaE < 10)
      .sort((a, b) => a.deltaE - b.deltaE)
      .slice(0, 10)

    res.json({
      code: 200,
      data: {
        source: { colorId: target.id, name: target.name, hex: target.hex },
        substitutes,
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// POST /api/inventory/multi-match — 多图纸叠加算量
router.post('/inventory/multi-match', authRequired, (req, res) => {
  try {
    const { designIds } = req.body || {}
    if (!designIds?.length) return res.status(400).json({ code: 400, message: '请选择图纸' })

    const userId = req.user.id
    const usageMap = {}
    const perDesign = []

    for (const did of designIds) {
      const design = db.prepare('SELECT id, title, grid_data FROM designs WHERE id=?').get(did)
      if (!design) continue
      const grid = JSON.parse(design.grid_data || '[]')
      const du = {}
      let beadCount = 0
      for (const row of grid) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          if (cell?.hex) {
            const key = cell.hex.toUpperCase()
            du[key] = (du[key] || 0) + 1
            usageMap[key] = (usageMap[key] || 0) + 1
            beadCount++
          }
        }
      }
      perDesign.push({
        designId: did,
        title: design.title,
        colors: Object.keys(du).length,
        beadCount,
      })
    }

    // 查询库存
    const inventory = db
      .prepare(
        `
      SELECT i.color_id, i.quantity, c.name, c.hex
      FROM user_bead_inventory i JOIN bead_colors c ON i.color_id=c.id
      WHERE i.user_id=? AND i.quantity>0
    `
      )
      .all(userId)
    const stockMap = {}
    for (const inv of inventory) stockMap[inv.hex.toUpperCase()] = inv

    // 计算缺口
    let totalNeeded = 0,
      totalShortage = 0
    const items = []
    for (const [hex, need] of Object.entries(usageMap)) {
      const stock = stockMap[hex]
      const inStock = stock?.quantity || 0
      const shortage = Math.max(0, need - inStock)
      items.push({
        hex,
        need,
        inStock,
        shortage,
        name: stock?.name || '',
        colorId: stock?.color_id || null,
      })
      totalNeeded += need
      totalShortage += shortage
    }
    items.sort((a, b) => b.shortage - a.shortage)

    res.json({
      code: 200,
      data: {
        totalNeeded,
        totalShortage,
        totalColors: items.length,
        items,
        perDesign,
      },
      message: totalShortage === 0 ? '库存充足 🎉' : `共需补 ${totalShortage} 颗豆子`,
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  P3 高级功能：多豆仓 / 自定义色号 / 心愿单 / 找色 / 色号对比
// ============================================

// ---- 多豆仓管理 ----

router.get('/warehouses', authRequired, (req, res) => {
  const list = db
    .prepare('SELECT * FROM warehouse_info WHERE user_id=? AND status=1 ORDER BY is_default DESC')
    .all(req.user.id)
  res.json({ code: 200, data: list })
})

router.post('/warehouses', authRequired, (req, res) => {
  const { name, defaultSpec, defaultBrand } = req.body || {}
  if (!name) return res.status(400).json({ code: 400, message: '请输入豆仓名称' })
  // 会员限制：普通用户最多1个
  const count = db
    .prepare('SELECT COUNT(*) as c FROM warehouse_info WHERE user_id=?')
    .get(req.user.id)
  const user = db.prepare('SELECT is_vip FROM users WHERE id=?').get(req.user.id)
  const maxWarehouses = user?.is_vip ? 5 : 1
  if (count.c >= maxWarehouses)
    return res.status(400).json({ code: 400, message: `最多创建${maxWarehouses}个豆仓` })
  const isDefault = count.c === 0 ? 1 : 0
  const r = db
    .prepare(
      'INSERT INTO warehouse_info (user_id,name,default_spec,default_brand,is_default) VALUES (?,?,?,?,?)'
    )
    .run(req.user.id, name, parseFloat(defaultSpec) || 5, defaultBrand || '', isDefault)
  res.json({ code: 200, data: { id: r.lastInsertRowid, name }, message: '豆仓创建成功' })
})

// ---- 自定义色号 ----

router.get('/custom-colors', authRequired, (req, res) => {
  const list = db
    .prepare('SELECT * FROM user_custom_colors WHERE user_id=? ORDER BY created_at DESC')
    .all(req.user.id)
  res.json({ code: 200, data: list })
})

router.post('/custom-colors', authRequired, (req, res) => {
  const { colorName, hex, remark } = req.body || {}
  if (!colorName || !hex)
    return res.status(400).json({ code: 400, message: '请填写颜色名称和色值' })
  // 计算LAB值
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16),
    g = parseInt(h.substring(2, 4), 16),
    b = parseInt(h.substring(4, 6), 16)
  const lab = isNaN(r) ? { L: 0, a: 0, b: 0 } : rgbToLab(r, g, b)
  const r2 = db
    .prepare(
      'INSERT INTO user_custom_colors (user_id,color_name,hex,lab_l,lab_a,lab_b,remark) VALUES (?,?,?,?,?,?,?)'
    )
    .run(
      req.user.id,
      colorName,
      hex,
      Math.round(lab.L * 100) / 100,
      Math.round(lab.a * 100) / 100,
      Math.round(lab.b * 100) / 100,
      remark || ''
    )
  res.json({ code: 200, data: { id: r2.lastInsertRowid }, message: '自定义色号已添加' })
})

// ---- 心愿单 ----

router.get('/wishlist', authRequired, (req, res) => {
  const list = db
    .prepare(
      `
    SELECT w.*, c.name as color_name, c.hex as color_hex
    FROM wishlist_items w LEFT JOIN bead_colors c ON w.color_id=c.id
    WHERE w.user_id=? ORDER BY w.priority DESC, w.created_at DESC
  `
    )
    .all(req.user.id)
  res.json({ code: 200, data: list })
})

router.post('/wishlist', authRequired, (req, res) => {
  const { colorId, priority = 0, notes = '' } = req.body || {}
  if (!colorId) return res.status(400).json({ code: 400, message: '请选择颜色' })
  db.prepare('INSERT INTO wishlist_items (user_id,color_id,priority,notes) VALUES (?,?,?,?)').run(
    req.user.id,
    colorId,
    parseInt(priority) || 0,
    notes
  )
  res.json({ code: 200, message: '已加入心愿单' })
})

router.put('/wishlist/:id', authRequired, (req, res) => {
  const { status, priority, notes } = req.body || {}
  const fields = [],
    values = []
  if (status) {
    fields.push('status=?')
    values.push(status)
  }
  if (priority != null) {
    fields.push('priority=?')
    values.push(parseInt(priority))
  }
  if (notes != null) {
    fields.push('notes=?')
    values.push(notes)
  }
  if (!fields.length) return res.status(400).json({ code: 400, message: '无更新内容' })
  values.push(req.params.id, req.user.id)
  db.prepare(`UPDATE wishlist_items SET ${fields.join(',')} WHERE id=? AND user_id=?`).run(
    ...values
  )
  res.json({ code: 200, message: '已更新' })
})

// ---- 找色助手：输入RGB/HEX，匹配最接近的颜色 ----
router.post('/find-color', (req, res) => {
  try {
    const { hex, r, g, b } = req.body || {}
    let red, green, blue
    if (hex) {
      const h = hex.replace('#', '')
      red = parseInt(h.substring(0, 2), 16)
      green = parseInt(h.substring(2, 4), 16)
      blue = parseInt(h.substring(4, 6), 16)
    } else {
      red = r
      green = g
      blue = b
    }
    if (isNaN(red) || isNaN(green) || isNaN(blue))
      return res.status(400).json({ code: 400, message: '请输入有效颜色值' })

    const targetLab = rgbToLab(red, green, blue)
    const allColors = db
      .prepare(
        'SELECT id, name, hex, lab_l, lab_a, lab_b, s.name as series, b.name as brand FROM bead_colors c JOIN bead_series s ON c.series_id=s.id JOIN bead_brands b ON s.brand_id=b.id'
      )
      .all()
    const matches = allColors
      .map((c) => ({
        ...c,
        deltaE:
          Math.round(deltaE2000(targetLab, { L: c.lab_l, a: c.lab_a, b: c.lab_b }) * 100) / 100,
      }))
      .filter((c) => c.deltaE < 20)
      .sort((a, b) => a.deltaE - b.deltaE)
      .slice(0, 10)

    res.json({ code: 200, data: { query: { r: red, g: green, b: blue }, matches } })
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ---- 色号对比：多个颜色并排比较色差 ----
router.post('/compare-colors', (req, res) => {
  try {
    const { colorIds } = req.body || {}
    if (!colorIds?.length || colorIds.length < 2)
      return res.status(400).json({ code: 400, message: '请至少选择2个颜色' })
    const colors = db
      .prepare(
        `SELECT id, name, hex, lab_l, lab_a, lab_b, s.name as series, b.name as brand FROM bead_colors c JOIN bead_series s ON c.series_id=s.id JOIN bead_brands b ON s.brand_id=b.id WHERE c.id IN (${colorIds.map(() => '?').join(',')})`
      )
      .all(...colorIds)
    if (colors.length < 2) return res.status(400).json({ code: 400, message: '颜色未找到' })

    const pairs = []
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const dE = deltaE2000(
          { L: colors[i].lab_l, a: colors[i].lab_a, b: colors[i].lab_b },
          { L: colors[j].lab_l, a: colors[j].lab_a, b: colors[j].lab_b }
        )
        const dL = Math.abs(colors[i].lab_l - colors[j].lab_l)
        const dC = Math.abs(
          Math.sqrt(colors[i].lab_a ** 2 + colors[i].lab_b ** 2) -
            Math.sqrt(colors[j].lab_a ** 2 + colors[j].lab_b ** 2)
        )
        pairs.push({
          colorA: { id: colors[i].id, name: colors[i].name, hex: colors[i].hex },
          colorB: { id: colors[j].id, name: colors[j].name, hex: colors[j].hex },
          deltaE: Math.round(dE * 100) / 100,
          deltaL: Math.round(dL * 100) / 100,
          deltaChroma: Math.round(dC * 100) / 100,
        })
      }
    }

    res.json({ code: 200, data: { colors, pairs: pairs.sort((a, b) => a.deltaE - b.deltaE) } })
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
  const designs = db
    .prepare(
      'SELECT * FROM designs WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC LIMIT 50'
    )
    .all(user.id)
  res.json({
    code: 200,
    data: { ...userPublic(user), designs: designs.map(formatDesign), designCount: designs.length },
  })
})

export default router
