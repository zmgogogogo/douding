// ============================================
//  打印导出路由 — 生成带坐标标签和图例的 HTML 图纸
//  浏览器打开后 Ctrl+P 保存为 PDF
// ============================================
import { Router } from 'express'
import { authOptional } from '../middleware/auth.js'
import { loadBeadColors } from '../services/colorMatch.js'

const router = Router()

router.post('/print/grid', authOptional, async (req, res) => {
  try {
    const { grid, gridWidth: w, gridHeight: h, title, brand } = req.body

    if (!grid || !w || !h) {
      return res.status(400).json({ code: 400, message: '缺少网格数据' })
    }

    // 统计颜色
    const colorCounts = new Map()
    for (const row of grid) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        if (cell?.hex) {
          const key = cell.hex
          const existing = colorCounts.get(key)
          if (existing) { existing.count++ }
          else { colorCounts.set(key, { ...cell, count: 1 }) }
        }
      }
    }
    const beadList = [...colorCounts.values()].sort((a, b) => b.count - a.count)

    // 单元格大小（px）
    const cellSize = Math.max(12, Math.min(24, Math.floor(600 / Math.max(w, h))))
    const gridPxW = w * cellSize
    const gridPxH = h * cellSize

    // 生成 HTML
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title || '拼豆图纸')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'PingFang SC', sans-serif; padding: 20px; color: #333; }
  @media print { body { padding: 10mm; } .no-print { display: none; } }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #888; font-size: 12px; margin-bottom: 16px; }
  .grid-wrap { display: inline-block; border: 2px solid #333; line-height: 0; margin-bottom: 20px; }
  .grid-table { border-collapse: collapse; }
  .grid-table td { width: ${cellSize}px; height: ${cellSize}px; border: 0.5px solid #ddd; padding: 0; position: relative; }
  .coord-label { position: absolute; font-size: ${Math.max(4, cellSize * 0.3)}px; color: #999; pointer-events: none; }
  .col-header { text-align: center; font-size: ${Math.max(5, cellSize * 0.35)}px; color: #999; height: ${cellSize * 0.6}px; }
  .row-header { text-align: right; font-size: ${Math.max(5, cellSize * 0.35)}px; color: #999; width: ${cellSize * 0.8}px; padding-right: 3px; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 16px 0; }
  .legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; }
  .legend-swatch { width: 16px; height: 16px; border: 1px solid #ccc; border-radius: 2px; flex-shrink: 0; }
  .legend-count { color: #888; }
  .btn { display: inline-block; padding: 8px 20px; background: #0058BC; color: #fff; border: none; border-radius: 20px; cursor: pointer; font-size: 14px; margin-bottom: 12px; }
  .btn:hover { background: #0047a0; }
</style>
</head>
<body>
<div class="no-print">
  <button class="btn" onclick="window.print()">🖨️ 打印 / 保存 PDF</button>
  <p style="color:#888;font-size:12px;margin-bottom:8px;">按 Ctrl+P → 另存为 PDF（边距设为"无"）</p>
</div>
<h1>${escapeHtml(title || '拼豆图纸')}</h1>
<div class="meta">${w} × ${h} 格 | ${beadList.length} 色 | ${beadList.reduce((s, c) => s + c.count, 0)} 珠 | ${brand || '全部品牌'}</div>

<div class="grid-wrap">
<table class="grid-table">
  <tr><th class="col-header"></th>${Array.from({length:w},(_,i)=>`<th class="col-header">${i+1}</th>`).join('')}</tr>
  ${Array.from({length:h},(_,r)=>`
    <tr>
      <td class="row-header">${r+1}</td>
      ${Array.from({length:w},(_,c)=>{
        const cell = grid[r]?.[c]
        return cell?.hex
          ? `<td style="background:${cell.hex}" title="${cell.name} ${cell.hex} (${r+1},${c+1})"></td>`
          : '<td></td>'
      }).join('')}
    </tr>`).join('')}
</table>
</div>

<div class="legend">
  ${beadList.map(c => `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${c.hex}"></div>
      <span>${escapeHtml(c.name)}</span>
      <span class="legend-count">×${c.count}</span>
    </div>`).join('')}
</div>

<div class="meta" style="margin-top:20px;">${beadList.length} 种颜色 | 总计 ${beadList.reduce((s,c)=>s+c.count,0)} 颗珠子</div>
</body></html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (e) {
    console.error('打印导出失败:', e)
    res.status(500).json({ code: 500, message: '导出失败' })
  }
})

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default router
