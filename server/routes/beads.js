// ============================================
//  珠子数据路由 — 品牌/系列/颜色查询
// ============================================
import { Router } from 'express'
import db from '../db/connection.js'

const router = Router()

// 层级结构（品牌 → 系列 → 颜色）
router.get('/', (req, res) => {
  const brands = db.prepare('SELECT * FROM bead_brands ORDER BY id').all()
  const data = brands.map((b) => {
    const series = db
      .prepare('SELECT * FROM bead_series WHERE brand_id = ? ORDER BY sort_order')
      .all(b.id)
    return {
      name: b.name,
      slug: b.slug,
      series: series.map((s) => {
        const colors = db
          .prepare('SELECT id, name, hex FROM bead_colors WHERE series_id = ? ORDER BY sort_order')
          .all(s.id)
        return { id: s.id, name: s.name, colors }
      }),
    }
  })
  res.json({ code: 200, data })
})

// 扁平列表（编辑器调色板用）
router.get('/colors', (req, res) => {
  const colors = db
    .prepare(
      `
    SELECT c.id, c.name, c.hex, s.name as series, b.name as brand
    FROM bead_colors c
    JOIN bead_series s ON c.series_id = s.id
    JOIN bead_brands b ON s.brand_id = b.id
    ORDER BY b.id, s.sort_order, c.sort_order
  `
    )
    .all()
  res.json({ code: 200, data: colors })
})

export default router
