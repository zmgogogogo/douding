// ============================================
//  珠子数据路由 — 品牌/系列/颜色查询
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'
import { success, fail } from '../utils/response.js'

const router = Router()

// 层级结构（品牌 → 系列 → 颜色）
router.get('/', (req, res) => {
  try {
    const brands = db.prepare('SELECT * FROM bead_brands ORDER BY id').all()
    const data = brands.map((b) => {
      const series = db.prepare('SELECT * FROM bead_series WHERE brand_id = ? ORDER BY sort_order')
        .all(b.id)
      return {
        name: b.name, slug: b.slug,
        series: series.map((s) => {
          const colors = db.prepare(
            'SELECT id, name, hex FROM bead_colors WHERE series_id = ? ORDER BY sort_order'
          ).all(s.id)
          return { id: s.id, name: s.name, colors }
        }),
      }
    })
    res.json(success(data))
  } catch (err) {
    console.error('珠子数据错误:', err)
    res.status(500).json(fail(500, '获取珠子数据失败'))
  }
})

// 扁平列表（编辑器调色板用）
router.get('/colors', (req, res) => {
  try {
    const colors = db.prepare(
      `SELECT c.id, c.name, c.hex, s.name as series, b.name as brand
      FROM bead_colors c
      JOIN bead_series s ON c.series_id = s.id
      JOIN bead_brands b ON s.brand_id = b.id
      ORDER BY b.id, s.sort_order, c.sort_order`
    ).all()
    res.json(success(colors))
  } catch (err) {
    console.error('珠子颜色错误:', err)
    res.status(500).json(fail(500, '获取颜色列表失败'))
  }
})

export default router
