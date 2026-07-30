// ============================================
//  色板管理路由 — 品牌色号 CRUD + 批量导入导出
// ============================================
import { Router } from 'express'
import db from '../../db/connection.js'
import { adminRequired } from '../../middleware/adminAuth.js'
import { success, fail, paginated } from '../../utils/response.js'
import { logAction } from '../../services/admin/logService.js'

const router = Router()

// 色号列表（分页 + 筛选）
router.get('/', adminRequired, (req, res) => {
  try {
    const {
      page = 1, limit = 20, keyword, brandId, seriesId,
      colorType, isDiscontinued,
    } = req.query
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit)

    let where = 'WHERE 1=1'
    const params = []

    if (keyword) {
      where += ' AND (c.name LIKE ? OR c.hex LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (seriesId) {
      where += ' AND c.series_id = ?'
      params.push(parseInt(seriesId))
    }
    if (brandId) {
      where += ' AND s.brand_id = ?'
      params.push(parseInt(brandId))
    }
    if (colorType !== undefined && colorType !== '') {
      where += ' AND c.color_type = ?'
      params.push(parseInt(colorType))
    }
    if (isDiscontinued !== undefined && isDiscontinued !== '') {
      where += ' AND c.is_discontinued = ?'
      params.push(parseInt(isDiscontinued))
    }

    const total = db.prepare(
      `SELECT COUNT(*) as c FROM bead_colors c
       LEFT JOIN bead_series s ON c.series_id = s.id ${where}`
    ).get(...params)

    const list = db.prepare(
      `SELECT c.*, s.name as series_name, s.brand_id, b.name as brand_name
       FROM bead_colors c
       LEFT JOIN bead_series s ON c.series_id = s.id
       LEFT JOIN bead_brands b ON s.brand_id = b.id
       ${where}
       ORDER BY b.name, s.sort_order, c.sort_order
       LIMIT ? OFFSET ?`
    ).all(...params, parseInt(limit), offset)

    const enriched = list.map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      labL: c.lab_l,
      labA: c.lab_a,
      labB: c.lab_b,
      colorType: c.color_type,
      isHot: c.is_hot,
      isDiscontinued: c.is_discontinued,
      sortOrder: c.sort_order,
      seriesId: c.series_id,
      seriesName: c.series_name,
      brandId: c.brand_id,
      brandName: c.brand_name,
    }))

    res.json(paginated(enriched, total.c, parseInt(page), parseInt(limit)))
  } catch (err) {
    console.error('获取色号列表错误:', err)
    res.status(500).json(fail(500, '获取色号列表失败'))
  }
})

// 更新色号
router.put('/:id', adminRequired, (req, res) => {
  try {
    const color = db.prepare('SELECT * FROM bead_colors WHERE id = ?').get(req.params.id)
    if (!color) return res.status(404).json(fail(404, '色号不存在'))

    const { name, hex, isDiscontinued, isHot, labL, labA, labB, colorType } = req.body || {}

    db.prepare(
      `UPDATE bead_colors SET name = ?, hex = ?, is_discontinued = ?, is_hot = ?,
       lab_l = ?, lab_a = ?, lab_b = ?, color_type = ? WHERE id = ?`
    ).run(
      name !== undefined ? name : color.name,
      hex !== undefined ? hex : color.hex,
      isDiscontinued !== undefined ? (isDiscontinued ? 1 : 0) : color.is_discontinued,
      isHot !== undefined ? (isHot ? 1 : 0) : color.is_hot,
      labL !== undefined ? labL : color.lab_l,
      labA !== undefined ? labA : color.lab_a,
      labB !== undefined ? labB : color.lab_b,
      colorType !== undefined ? colorType : color.color_type,
      color.id
    )

    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '色板管理', action: 'update', targetType: 'bead_color', targetId: color.id,
      detail: JSON.stringify({ name, hex, isDiscontinued }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ id: color.id }))
  } catch (err) {
    console.error('编辑色号错误:', err)
    res.status(500).json(fail(500, '编辑色号失败'))
  }
})

// 批量设置停产状态
router.post('/batch-status', adminRequired, (req, res) => {
  try {
    const { ids, isDiscontinued } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(fail(400, '请选择色号'))
    }

    const stmt = db.prepare('UPDATE bead_colors SET is_discontinued = ? WHERE id = ?')
    const txn = db.transaction(() => {
      for (const id of ids) stmt.run(isDiscontinued ? 1 : 0, id)
    })
    txn()

    const actionLabel = isDiscontinued ? '批量停产' : '批量恢复'
    logAction(db, {
      adminId: req.admin.id, adminName: req.admin.username,
      module: '色板管理', action: actionLabel, targetType: 'bead_color',
      detail: JSON.stringify({ ids, isDiscontinued }),
      ip: req.ip, userAgent: req.headers?.['user-agent'] || '',
    })

    res.json(success({ count: ids.length }))
  } catch (err) {
    console.error('批量操作色号错误:', err)
    res.status(500).json(fail(500, '批量操作失败'))
  }
})

// 获取品牌列表（下拉选项用）
router.get('/brands/list', adminRequired, (req, res) => {
  try {
    const brands = db.prepare('SELECT id, name, slug FROM bead_brands ORDER BY id').all()
    res.json(success(brands))
  } catch (err) {
    res.status(500).json(fail(500, '获取品牌列表失败'))
  }
})

// 获取系列列表（下拉选项用）
router.get('/series/list', adminRequired, (req, res) => {
  try {
    const { brandId } = req.query
    let sql = 'SELECT s.id, s.name, s.brand_id, b.name as brand_name FROM bead_series s LEFT JOIN bead_brands b ON s.brand_id = b.id'
    const params = []
    if (brandId) {
      sql += ' WHERE s.brand_id = ?'
      params.push(parseInt(brandId))
    }
    sql += ' ORDER BY b.name, s.sort_order'
    const series = db.prepare(sql).all(...params)
    res.json(success(series))
  } catch (err) {
    res.status(500).json(fail(500, '获取系列列表失败'))
  }
})

export default router
