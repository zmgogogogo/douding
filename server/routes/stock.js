// ============================================================
//  豆仓系统 V3.0 — /api/stock/* 路由
//  严格按 .claude/豆仓.md 文档实现
//  复用现有 user_bead_inventory + inventory_logs 表
// ============================================================
import { Router } from 'express'
import db from '../db/connection.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

// ============================================
//  工具函数：计算库存状态
//  规则 1：充足 — stockNum > warnNum
//  规则 2：紧张 — 0 < stockNum ≤ warnNum
//  规则 3：缺货 — stockNum == 0（有记录但为0）
//  规则 4：未拥有 — stockNum == -1（从未创建记录）
// ============================================
function computeStatus(stockNum, warnNum) {
  if (stockNum === -1) return 'unowned'
  if (stockNum === 0) return 'out'
  if (stockNum <= warnNum) return 'low'
  return 'sufficient'
}

/** 将 stockNum/warnNum 转为前端友好的对象 */
function formatStockItem(row) {
  const stockNum = row.stockNum
  const warnNum = row.warnNum || 50
  const status = computeStatus(stockNum, warnNum)
  return {
    colorId: row.colorId,
    colorCode: row.colorCode,
    colorName: row.colorName,
    colorHex: row.colorHex,
    type: row.type,
    brand: row.brand,
    series: row.series,
    sortOrder: row.sortOrder,
    stockNum: stockNum === -1 ? 0 : stockNum, // 前端展示用，未拥有显示0
    warnNum,
    status,
    // 后端内部用 isNewRecord 区分"未拥有"和"缺货"
    isNewRecord: stockNum === -1,
  }
}

// ============================================
//  1. GET /api/stock/list — 获取用户所有颜色库存（含未拥有）
//     查询参数：?status=all|sufficient|low|out
//     返回全量系统颜色 + 用户库存 LEFT JOIN
// ============================================
router.get('/list', authRequired, (req, res) => {
  try {
    const userId = req.user.id
    const { status } = req.query

    const rows = db
      .prepare(
        `SELECT c.id as colorId,
                SUBSTR(c.name, 1, INSTR(c.name || ' ', ' ') - 1) as colorCode,
                TRIM(SUBSTR(c.name, INSTR(c.name || ' ', ' ') + 1)) as colorName,
                c.hex as colorHex,
                COALESCE(c.color_type, 1) as type, c.sort_order as sortOrder,
                b.name as brand, s.name as series,
                COALESCE(i.quantity, -1) as stockNum,
                COALESCE(i.min_threshold, 50) as warnNum
         FROM bead_colors c
         JOIN bead_series s ON c.series_id = s.id
         JOIN bead_brands b ON s.brand_id = b.id
         LEFT JOIN user_bead_inventory i ON c.id = i.color_id AND i.user_id = ?
         WHERE c.name GLOB '[A-Za-z]*[0-9]*'
         ORDER BY b.name, c.sort_order`
      )
      .all(userId)

    // 格式化 + 计算状态
    let list = rows.map(formatStockItem)

    // 按编号自然排序（先字母前缀，再数字大小）
    function naturalSort(a, b) {
      const ac = a.colorCode || '', bc = b.colorCode || ''
      // 提取字母前缀和数字部分
      const aMatch = ac.match(/^([A-Za-z]*)(\d+)/)
      const bMatch = bc.match(/^([A-Za-z]*)(\d+)/)
      if (aMatch && bMatch) {
        // 先比较字母前缀
        const cmp = aMatch[1].localeCompare(bMatch[1])
        if (cmp !== 0) return cmp
        // 再按数字大小比较
        return parseInt(aMatch[2]) - parseInt(bMatch[2])
      }
      // 纯数字的放在最前面
      const aNum = parseInt(ac), bNum = parseInt(bc)
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
      if (!isNaN(aNum)) return -1
      if (!isNaN(bNum)) return 1
      return ac.localeCompare(bc)
    }
    list.sort(naturalSort)

    // 状态筛选
    if (status && status !== 'all') {
      const filterMap = { sufficient: 'sufficient', low: 'low', out: 'out' }
      const target = filterMap[status]
      if (target) list = list.filter((item) => item.status === target)
    }

    // 总览统计
    const totalBeads = list
      .filter((i) => i.stockNum > 0)
      .reduce((s, i) => s + i.stockNum, 0)
    const ownedColors = list.filter((i) => i.stockNum > 0).length
    const outOfStock = list.filter((i) => i.status === 'out').length

    res.json({
      code: 200,
      data: {
        items: list,
        overview: {
          totalBeads,
          ownedColors,
          outOfStock,
          totalColors: list.length,
        },
      },
    })
  } catch (e) {
    console.error('[stock/list]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  2. GET /api/stock/overview — 数据总览
//     总豆子数量 / 已拥有颜色数 / 当前缺货数
// ============================================
router.get('/overview', authRequired, (req, res) => {
  try {
    const userId = req.user.id

    const stats = db
      .prepare(
        `SELECT COALESCE(SUM(i.quantity), 0) as totalBeads,
                COUNT(DISTINCT CASE WHEN i.quantity > 0 THEN i.color_id END) as ownedColors,
                COUNT(DISTINCT CASE WHEN i.quantity = 0 THEN i.color_id END) as outOfStock
         FROM bead_colors c
         LEFT JOIN user_bead_inventory i ON c.id = i.color_id AND i.user_id = ?`
      )
      .get(userId)

    // 未拥有颜色数 = 总颜色数 - 有记录的颜色数
    const totalColors = db.prepare('SELECT COUNT(*) as c FROM bead_colors').get().c
    const hasRecord = db
      .prepare('SELECT COUNT(*) as c FROM user_bead_inventory WHERE user_id = ?')
      .get(userId).c
    const unowned = totalColors - hasRecord

    res.json({
      code: 200,
      data: {
        totalBeads: stats.totalBeads,
        ownedColors: stats.ownedColors,
        outOfStock: stats.outOfStock,
        unowned,
      },
    })
  } catch (e) {
    console.error('[stock/overview]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  3. POST /api/stock/update — 单颜色修改库存
//     body: { colorId, delta }
//     delta 正数=增加，负数=减少，最低0
//     写入库存流水（含 beforeStock/afterStock）
// ============================================
router.post('/update', authRequired, (req, res) => {
  try {
    const { colorId, delta } = req.body || {}
    if (!colorId || delta == null) {
      return res.status(400).json({ code: 400, message: '缺少参数 colorId/delta' })
    }

    const userId = req.user.id
    const changeNum = parseInt(delta)

    // 查当前库存
    const cur = db
      .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
      .get(userId, colorId)
    const beforeStock = cur?.quantity || 0
    const newQty = Math.max(0, beforeStock + changeNum)

    // 禁止库存负数
    if (newQty < 0) {
      return res.status(400).json({ code: 400, message: '库存不能为负数' })
    }

    // UPSERT 库存
    db.prepare(
      `INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at)
       VALUES (?, ?, ?, COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id = ? AND color_id = ?), 50), datetime('now'))
       ON CONFLICT(user_id, color_id)
       DO UPDATE SET quantity = excluded.quantity, updated_at = datetime('now')`
    ).run(userId, colorId, newQty, userId, colorId)

    // 写入流水（正数入库、负数出库）
    const actionType = changeNum >= 0 ? 'inbound' : 'outbound'
    db.prepare(
      `INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, created_at)
       VALUES (?, ?, ?, ?, ?, 'manual', datetime('now'))`
    ).run(userId, colorId, actionType, changeNum, newQty)

    // 获取颜色信息
    const color = db
      .prepare(
        `SELECT c.name, c.hex FROM bead_colors c WHERE c.id = ?`
      )
      .get(colorId)

    const warnNum = db
      .prepare('SELECT min_threshold FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
      .get(userId, colorId)?.min_threshold || 50

    res.json({
      code: 200,
      data: {
        colorId,
        colorName: color?.name,
        colorHex: color?.hex,
        beforeStock,
        afterStock: newQty,
        delta: changeNum,
        stockNum: newQty,
        warnNum,
        status: computeStatus(newQty, warnNum),
      },
      message: `${changeNum >= 0 ? '入库' : '出库'} ${Math.abs(changeNum)} 颗`,
    })
  } catch (e) {
    console.error('[stock/update]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  4. POST /api/stock/batch-add — 批量入库
//     body: { items: [{ colorId, num }] }
//     使用事务，确保原子性
// ============================================
router.post('/batch-add', authRequired, (req, res) => {
  try {
    const { items } = req.body || {}
    if (!items?.length) {
      return res.status(400).json({ code: 400, message: '缺少批量数据' })
    }

    const userId = req.user.id
    let success = 0
    let failed = 0

    const txn = db.transaction(() => {
      for (const item of items) {
        if (!item.colorId || item.num == null) {
          failed++
          continue
        }
        const num = parseInt(item.num)
        if (num <= 0) {
          failed++
          continue
        }

        const cur = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
          .get(userId, item.colorId)
        const beforeStock = cur?.quantity || 0
        const afterStock = beforeStock + num

        db.prepare(
          `INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at)
           VALUES (?, ?, ?, COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id = ? AND color_id = ?), 50), datetime('now'))
           ON CONFLICT(user_id, color_id)
           DO UPDATE SET quantity = excluded.quantity, updated_at = datetime('now')`
        ).run(userId, item.colorId, afterStock, userId, item.colorId)

        db.prepare(
          `INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, created_at)
           VALUES (?, ?, 'inbound', ?, ?, 'batch_in', datetime('now'))`
        ).run(userId, item.colorId, num, afterStock)

        success++
      }
    })
    txn()

    res.json({
      code: 200,
      data: { success, failed },
      message: `批量入库完成：${success}成功${failed > 0 ? `，${failed}失败` : ''}`,
    })
  } catch (e) {
    console.error('[stock/batch-add]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  5. POST /api/stock/warn-set — 设置预警值
//     body: { colorId, warnNum }
//     不产生流水记录（仅配置变更）
// ============================================
router.post('/warn-set', authRequired, (req, res) => {
  try {
    const { colorId, warnNum } = req.body || {}
    if (!colorId || warnNum == null) {
      return res.status(400).json({ code: 400, message: '缺少参数 colorId/warnNum' })
    }

    const userId = req.user.id
    const newWarn = Math.max(0, parseInt(warnNum))

    // UPSERT 仅更新预警值
    db.prepare(
      `INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at)
       VALUES (?, ?, COALESCE((SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?), 0), ?, datetime('now'))
       ON CONFLICT(user_id, color_id)
       DO UPDATE SET min_threshold = excluded.min_threshold, updated_at = datetime('now')`
    ).run(userId, colorId, userId, colorId, newWarn)

    // 获取颜色信息
    const color = db.prepare('SELECT name, hex FROM bead_colors WHERE id = ?').get(colorId)

    res.json({
      code: 200,
      data: { colorId, warnNum: newWarn },
      message: `${color?.name || '颜色'} 预警值已设为 ${newWarn}`,
    })
  } catch (e) {
    console.error('[stock/warn-set]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  6. GET /api/stock/lack-list — 缺料清单
//     统计范围：缺货 + 库存紧张
//     每条包含：色号、颜色名、当前库存、建议补货量
//     建议补货量：缺货→建议100颗，紧张→建议 warnNum - stockNum
// ============================================
router.get('/lack-list', authRequired, (req, res) => {
  try {
    const userId = req.user.id

    // 获取所有有库存记录的颜色
    const rows = db
      .prepare(
        `SELECT i.color_id as colorId, i.quantity as stockNum, i.min_threshold as warnNum,
                c.name as colorName, c.hex as colorHex,
                b.name as brand, s.name as series
         FROM user_bead_inventory i
         JOIN bead_colors c ON i.color_id = c.id
         JOIN bead_series s ON c.series_id = s.id
         JOIN bead_brands b ON s.brand_id = b.id
         WHERE i.user_id = ? AND i.quantity <= i.min_threshold
         ORDER BY i.quantity ASC`
      )
      .all(userId)

    const list = rows.map((r) => {
      const suggestNum = r.stockNum === 0 ? 100 : r.warnNum - r.stockNum
      return {
        colorId: r.colorId,
        colorName: r.colorName,
        colorHex: r.colorHex,
        brand: r.brand,
        series: r.series,
        stockNum: r.stockNum,
        warnNum: r.warnNum,
        status: r.stockNum === 0 ? 'out' : 'low',
        suggestNum,
      }
    })

    const totalShortage = list.reduce((s, i) => s + i.suggestNum, 0)

    res.json({
      code: 200,
      data: {
        items: list,
        total: list.length,
        outCount: list.filter((i) => i.status === 'out').length,
        lowCount: list.filter((i) => i.status === 'low').length,
        totalShortage,
      },
    })
  } catch (e) {
    console.error('[stock/lack-list]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  7. GET /api/stock/log/list — 库存流水记录
//     查询参数：?page=1&limit=50&colorId=可选
//     永久记录，不可删除
// ============================================
router.get('/log/list', authRequired, (req, res) => {
  try {
    const { page = 1, limit = 50, colorId } = req.query
    const userId = req.user.id
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE l.user_id = ?'
    const params = [userId]

    if (colorId) {
      where += ' AND l.color_id = ?'
      params.push(parseInt(colorId))
    }

    const logs = db
      .prepare(
        `SELECT l.id, l.user_id, l.color_id, l.action, l.quantity as num,
                (l.balance_after - l.quantity) as beforeStock, l.balance_after as afterStock,
                l.source_type as type, l.source_id as relationId, l.source_name,
                l.note, l.created_at as createTime,
                c.name as colorName, c.hex as colorHex
         FROM inventory_logs l
         JOIN bead_colors c ON l.color_id = c.id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, parseInt(limit), offset)

    const total = db
      .prepare(
        `SELECT COUNT(*) as c FROM inventory_logs l ${where}`
      )
      .get(...params).c

    res.json({
      code: 200,
      data: {
        items: logs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (e) {
    console.error('[stock/log/list]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  8. POST /api/stock/deduct — 制作自动扣料
//     body: { designId, designTitle?, beads: [{ colorId, quantity, name?, hex? }], lossRate?, copies? }
//     最终扣料 = 基础数量 * (1 + lossRate/100)，向上取整
//     不足时扣空，生成缺料记录
// ============================================
router.post('/deduct', authRequired, (req, res) => {
  try {
    const { designId, designTitle, beads, lossRate = 5, copies = 1 } = req.body || {}
    if (!beads?.length) {
      return res.status(400).json({ code: 400, message: '缺少消耗列表' })
    }

    const userId = req.user.id
    const lossMultiplier = 1 + (parseFloat(lossRate) || 5) / 100
    const copyCount = Math.max(1, parseInt(copies) || 1)
    const warnings = []
    let totalDeducted = 0
    let totalShortage = 0

    const txn = db.transaction(() => {
      for (const b of beads) {
        const baseQty = b.quantity || 0
        // 最终扣料 = 基础数量 * 份数 * (1 + 损耗率)，向上取整
        const actualQty = Math.ceil(baseQty * copyCount * lossMultiplier)

        const cur = db
          .prepare('SELECT quantity, min_threshold FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
          .get(userId, b.colorId)
        const beforeStock = cur?.quantity || 0
        const warnNum = cur?.min_threshold || 50

        let afterStock, deducted

        if (beforeStock >= actualQty) {
          // 库存充足：全额扣除
          deducted = actualQty
          afterStock = beforeStock - actualQty
        } else {
          // 库存不足：全部扣空
          deducted = beforeStock
          afterStock = 0
          const shortage = actualQty - beforeStock
          warnings.push({
            colorId: b.colorId,
            colorName: b.name || '',
            colorHex: b.hex || '',
            need: actualQty,
            available: beforeStock,
            shortage,
          })
          totalShortage += shortage
        }

        totalDeducted += deducted

        // 更新库存
        db.prepare(
          `INSERT INTO user_bead_inventory (user_id, color_id, quantity, min_threshold, updated_at)
           VALUES (?, ?, ?, COALESCE((SELECT min_threshold FROM user_bead_inventory WHERE user_id = ? AND color_id = ?), 50), datetime('now'))
           ON CONFLICT(user_id, color_id)
           DO UPDATE SET quantity = excluded.quantity, updated_at = datetime('now')`
        ).run(userId, b.colorId, afterStock, userId, b.colorId)

        // 写入流水（关联图纸ID）
        db.prepare(
          `INSERT INTO inventory_logs (user_id, color_id, action, quantity, balance_after, source_type, source_id, source_name, note, created_at)
           VALUES (?, ?, 'outbound', ?, ?, 'deduct', ?, ?, ?, datetime('now'))`
        ).run(
          userId,
          b.colorId,
          -deducted,
          afterStock,
          designId || null,
          designTitle || '',
          `制作消耗${copyCount}份，损耗率${lossRate}%`
        )

        // 记录图纸耗豆
        if (designId) {
          db.prepare(
            'INSERT INTO design_bead_usage (user_id, design_id, color_id, quantity) VALUES (?, ?, ?, ?)'
          ).run(userId, designId, b.colorId, deducted)
        }
      }
    })
    txn()

    res.json({
      code: 200,
      data: {
        totalDeducted,
        totalShortage,
        warnings,
        copies: copyCount,
        lossRate: parseFloat(lossRate),
      },
      message: warnings.length
        ? `消耗扣除完成（${warnings.length}种颜色库存不足，缺口${totalShortage}颗）`
        : `消耗扣除成功，共消耗${totalDeducted}颗`,
    })
  } catch (e) {
    console.error('[stock/deduct]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  8.5 POST /api/stock/check-work — 检测作品用料库存
//      body: { workId }
//      对比用户库存与作品所需材料，返回每种颜色的缺口
// ============================================
router.post('/check-work', authRequired, (req, res) => {
  try {
    const { workId } = req.body || {}
    if (!workId) {
      return res.status(400).json({ code: 400, message: '缺少作品 ID' })
    }

    const userId = req.user.id

    // 获取作品用料（从 design_bead_usage 表）
    const usages = db
      .prepare(
        `SELECT du.color_id, du.quantity, bc.name, bc.hex
         FROM design_bead_usage du
         LEFT JOIN bead_colors bc ON du.color_id = bc.id
         WHERE du.design_id = ?`
      )
      .all(workId)

    // 如果用料表为空，尝试从 grid_data 解析
    let colorList = usages
    if (colorList.length === 0) {
      const design = db.prepare('SELECT grid_data FROM designs WHERE id = ?').get(workId)
      if (design?.grid_data) {
        try {
          const grid = JSON.parse(design.grid_data)
          const colorMap = {}
          if (Array.isArray(grid)) {
            for (const row of grid) {
              if (!Array.isArray(row)) continue
              for (const cell of row) {
                if (cell && cell.hex) {
                  const key = cell.hex
                  if (!colorMap[key]) {
                    colorMap[key] = { name: cell.name, hex: cell.hex, quantity: 0 }
                  }
                  colorMap[key].quantity++
                }
              }
            }
          }
          // 尝试匹配 bead_colors 获取 color_id
          colorList = Object.values(colorMap).map((item) => {
            const bc = db.prepare('SELECT id FROM bead_colors WHERE hex = ? LIMIT 1').get(item.hex)
            return { color_id: bc?.id || null, quantity: item.quantity, name: item.name, hex: item.hex }
          })
        } catch (_) {}
      }
    }

    if (colorList.length === 0) {
      return res.json({ code: 200, data: { items: [], totalNeed: 0, totalLack: 0, allSufficient: true } })
    }

    // 查询用户库存
    const results = []
    let totalNeed = 0
    let totalLack = 0

    for (const item of colorList) {
      totalNeed += item.quantity
      let stockNum = 0

      if (item.color_id) {
        const inv = db
          .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
          .get(userId, item.color_id)
        stockNum = inv?.quantity || 0
      } else if (item.hex) {
        // 用 hex 匹配库存
        const bc = db.prepare('SELECT id FROM bead_colors WHERE hex = ? LIMIT 1').get(item.hex)
        if (bc) {
          const inv = db
            .prepare('SELECT quantity FROM user_bead_inventory WHERE user_id = ? AND color_id = ?')
            .get(userId, bc.id)
          stockNum = inv?.quantity || 0
        }
      }

      const lack = Math.max(0, item.quantity - stockNum)
      totalLack += lack

      results.push({
        colorCode: item.name || '?',
        colorHex: item.hex || '#ccc',
        needNum: item.quantity,
        stockNum,
        lackNum: lack,
        sufficient: lack === 0,
      })
    }

    res.json({
      code: 200,
      data: {
        items: results,
        totalNeed,
        totalLack,
        allSufficient: totalLack === 0,
      },
    })
  } catch (e) {
    console.error('[stock/check-work]', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

// ============================================
//  9. GET/POST /api/stock/settings — 用户设置
//     GET：获取 autoDeduct + defaultLossRate
//     POST：保存设置 { autoDeduct, lossRate }
// ============================================
router.get('/settings', authRequired, (req, res) => {
  try {
    let row = db
      .prepare('SELECT * FROM user_stock_settings WHERE user_id = ?')
      .get(req.user.id)

    if (!row) {
      // 首次访问，插入默认值
      db.prepare(
        "INSERT INTO user_stock_settings (user_id, auto_deduct, default_loss_rate, updated_at) VALUES (?, 1, 5.0, datetime('now'))"
      ).run(req.user.id)
      row = { auto_deduct: 1, default_loss_rate: 5.0 }
    }

    res.json({
      code: 200,
      data: {
        autoDeduct: !!row.auto_deduct,
        lossRate: row.default_loss_rate,
      },
    })
  } catch (e) {
    console.error('[stock/settings] GET', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

router.post('/settings', authRequired, (req, res) => {
  try {
    const { autoDeduct, lossRate } = req.body || {}
    const userId = req.user.id

    db.prepare(
      `INSERT INTO user_stock_settings (user_id, auto_deduct, default_loss_rate, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         auto_deduct = COALESCE(excluded.auto_deduct, auto_deduct),
         default_loss_rate = COALESCE(excluded.default_loss_rate, default_loss_rate),
         updated_at = datetime('now')`
    ).run(
      userId,
      autoDeduct != null ? (autoDeduct ? 1 : 0) : null,
      lossRate != null ? parseFloat(lossRate) : null
    )

    res.json({
      code: 200,
      data: { autoDeduct, lossRate },
      message: '设置已保存',
    })
  } catch (e) {
    console.error('[stock/settings] POST', e)
    res.status(500).json({ code: 500, message: e.message })
  }
})

export default router
