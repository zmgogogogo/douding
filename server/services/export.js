// ============================================
//  导出服务 — PNG/PDF/SVG/JSON/CSV/ZIP
//  文档参考：.claude/导出.md
// ============================================
import sharp from 'sharp'
import PDFDocument from 'pdfkit'

// 中文字体（Arial Unicode 支持 CJK，macOS 自带独立 TTF）
const CN_FONT_PATH = '/Library/Fonts/Arial Unicode.ttf'
const CN_FONT_NAME = 'ArialUni'

// 给 PDFDocument 注册中文字体（如果可用）
function registerChineseFont(doc) {
  try {
    doc.registerFont(CN_FONT_NAME, CN_FONT_PATH)
    return true
  } catch (_) {
    return false
  }
}

// 安全字体调用：优先中文，降级 Helvetica
function cnFont(doc) {
  try {
    return doc.font(CN_FONT_NAME)
  } catch {
    return doc.font('Helvetica')
  }
}

// ============================================
//  列坐标工具（A-Z, AA-AZ...）
// ============================================
function colLabel(n) {
  let s = ''
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
  return s
}

// ============================================
//  PNG 高清导出
// ============================================
export async function exportHighRes(grid, gridW, gridH, opts = {}) {
  const scale = Math.min(50, Math.max(1, opts.scale || 10))
  const showGrid = !!opts.showGrid
  const showLabels = !!opts.showLabels
  const bgColor = opts.bgColor || '#f0f0f0'
  const gridColor = opts.gridColor || '#cccccc'

  const pixelW = gridW * scale
  const pixelH = gridH * scale

  let svgRects = ''
  let svgLabels = ''
  for (let r = 0; r < gridH; r++) {
    const row = grid[r]; if (!row) continue
    for (let c = 0; c < gridW; c++) {
      const cell = row[c]
      if (cell && cell.hex) {
        svgRects += `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}" fill="${cell.hex}" />\n`
        if (showLabels && scale >= 8) {
          const label = (cell.name || '').split(' ')[0] || cell.name || ''
          if (label && label.length <= 4) {
            const hx = cell.hex.replace('#', '')
            const cr = parseInt(hx.substring(0, 2), 16), cg = parseInt(hx.substring(2, 4), 16), cb = parseInt(hx.substring(4, 6), 16)
            const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb
            const fs = Math.max(4, scale * 0.55)
            svgLabels += `<text x="${c * scale + scale / 2}" y="${r * scale + scale / 2 + fs / 3}" font-size="${fs}" fill="${lum > 128 ? '#000' : '#fff'}" text-anchor="middle" font-family="monospace">${label}</text>\n`
          }
        }
      }
    }
  }

  let svgGrid = ''
  if (showGrid) {
    for (let r = 0; r <= pixelH; r += scale) {
      svgGrid += `<line x1="0" y1="${r}" x2="${pixelW}" y2="${r}" stroke="${gridColor}" stroke-width="1" />\n`
    }
    for (let c = 0; c <= pixelW; c += scale) {
      svgGrid += `<line x1="${c}" y1="0" x2="${c}" y2="${pixelH}" stroke="${gridColor}" stroke-width="1" />\n`
    }
  }

  const bgRect = bgColor === 'transparent' ? '' : `<rect width="${pixelW}" height="${pixelH}" fill="${bgColor}" />\n`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}">\n${bgRect}${svgRects}${svgGrid}${svgLabels}</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ============================================
//  PDF 施工图纸导出（仅网格施工图）
// ============================================
export async function exportPDF(grid, gridW, gridH, opts = {}) {
  const title = opts.title || '拼豆图纸'
  const showLabels = opts.showLabels !== false
  const mode = opts.mode || 'color'

  const pageW = 595.28, pageH = 841.89, margin = 40, drawW = pageW - margin * 2, drawH = pageH - margin * 2

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: title, Author: '豆丁', Subject: `${gridW}×${gridH}` } })
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  registerChineseFont(doc);

  // ===== 网格施工图 =====
  const MAX_PER_PAGE = 60
  const pagesX = Math.ceil(gridW / MAX_PER_PAGE), pagesY = Math.ceil(gridH / MAX_PER_PAGE)
  for (let py = 0; py < pagesY; py++) {
    for (let px = 0; px < pagesX; px++) {
      doc.addPage()
      const gxs = px * MAX_PER_PAGE, gys = py * MAX_PER_PAGE
      const gxe = Math.min(gxs + MAX_PER_PAGE, gridW), gye = Math.min(gys + MAX_PER_PAGE, gridH)
      const gW = gxe - gxs, gH = gye - gys
      const pg = py * pagesX + px + 1, tp = pagesX * pagesY

      cnFont(doc.fontSize(12)).fillColor('#1e293b').text(`${title} — 施工图 (${pg}/${tp})`, margin, margin)
      cnFont(doc.fontSize(8)).fillColor('#64748b').text(`列 ${colLabel(gxs)}-${colLabel(gxe - 1)} · 行 ${gys + 1}-${gye}`, margin, margin + 16)

      const cm = 18, topH = 14
      const gcs = Math.floor(Math.min((drawW - cm) / gW, (drawH - topH - 40) / gH))
      const agw = gcs * gW, agh = gcs * gH
      const gx = margin + cm, gy = margin + topH + 24

      // 列坐标
      cnFont(doc.fontSize(6)).fillColor('#64748b')
      for (let c = 0; c < gW; c++) doc.text(colLabel(gxs + c), gx + c * gcs + gcs / 2 - 5, margin + 26, { width: 12, align: 'center' })
      // 行坐标
      for (let r = 0; r < gH; r++) doc.text(String(gys + r + 1), margin, gy + r * gcs + gcs / 2 - 3, { width: cm - 2, align: 'right' })

      // 色块
      for (let r = 0; r < gH; r++) {
        const row = grid[gys + r]; if (!row) continue
        for (let c = 0; c < gW; c++) {
          const cell = row[gxs + c], cx = gx + c * gcs, cy = gy + r * gcs
          if (mode === 'bw') {
            if (cell?.hex) doc.rect(cx, cy, gcs, gcs).fill('#ffffff').stroke('#94a3b8').lineWidth(0.3)
          } else {
            doc.rect(cx, cy, gcs, gcs).fill(cell?.hex || '#f8fafc')
          }
        }
      }

      // 网格线（5/10加粗）
      for (let r = 0; r <= gH; r++) {
        const b10 = (gys + r) % 10 === 0, b5 = (gys + r) % 5 === 0
        doc.lineWidth(b10 ? 1.2 : b5 ? 0.6 : 0.2).strokeColor(b10 ? '#475569' : b5 ? '#94a3b8' : '#cbd5e1')
          .moveTo(gx, gy + r * gcs).lineTo(gx + agw, gy + r * gcs).stroke()
      }
      for (let c = 0; c <= gW; c++) {
        const b10 = (gxs + c) % 10 === 0, b5 = (gxs + c) % 5 === 0
        doc.lineWidth(b10 ? 1.2 : b5 ? 0.6 : 0.2).strokeColor(b10 ? '#475569' : b5 ? '#94a3b8' : '#cbd5e1')
          .moveTo(gx + c * gcs, gy).lineTo(gx + c * gcs, gy + agh).stroke()
      }

      // 色号标注
      if (showLabels && gcs >= 10) {
        for (let r = 0; r < gH; r++) {
          const row = grid[gys + r]; if (!row) continue
          for (let c = 0; c < gW; c++) {
            const cell = row[gxs + c]; if (!cell?.hex) continue
            const hx = cell.hex.replace('#', '')
            const cr = parseInt(hx.substring(0, 2), 16), cg = parseInt(hx.substring(2, 4), 16), cb = parseInt(hx.substring(4, 6), 16)
            const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb
            const fs = Math.max(3.5, gcs * 0.45)
            const label = (cell.name || '').split(' ')[0] || cell.name || '?'
            cnFont(doc.fontSize(fs)).fillColor(lum > 128 ? '#1e293b' : '#ffffff')
              .text(label, gx + c * gcs + 1, gy + r * gcs + gcs / 2 - fs / 2, { width: gcs - 2, align: 'center', lineBreak: false })
          }
        }
      }

      doc.fontSize(7).fillColor('#94a3b8').text(`${colLabel(gxs)}${gys + 1} — ${colLabel(gxe - 1)}${gye}`, margin, pageH - 30, { width: drawW, align: 'center' })
      if (tp > 1) {
        const arrows = []
        if (py > 0) arrows.push('↑上接')
        if (py < pagesY - 1) arrows.push('↓下接')
        if (px > 0) arrows.push('←左接')
        if (px < pagesX - 1) arrows.push('→右接')
        doc.fontSize(7).fillColor('#0058BC').text(arrows.join(' '), margin, pageH - 22, { width: drawW, align: 'center' })
      }
    }
  }

  doc.end()
  return new Promise((resolve) => { doc.on('end', () => resolve(Buffer.concat(chunks))) })
}

// ============================================
//  SVG 矢量导出（分层结构）
// ============================================
export function exportSVGString(grid, gridW, gridH, opts = {}) {
  const cellSize = opts.cellSize || 10
  const showLabels = opts.showLabels !== false
  const showCoords = opts.showCoords !== false
  const totalW = gridW * cellSize, totalH = gridH * cellSize

  let gridLayer = '', colorLayer = '', textLayer = '', coordLayer = ''

  for (let r = 0; r < gridH; r++) {
    const row = grid[r]; if (!row) continue
    for (let c = 0; c < gridW; c++) {
      const cell = row[c]
      if (cell?.hex) {
        colorLayer += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${cell.hex}" />\n`
        if (showLabels && cellSize >= 8) {
          const label = (cell.name || '').split(' ')[0] || ''
          if (label && label.length <= 4) {
            const hx = cell.hex.replace('#', '')
            const cr = parseInt(hx.substring(0, 2), 16), cg = parseInt(hx.substring(2, 4), 16), cb = parseInt(hx.substring(4, 6), 16)
            const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb
            textLayer += `<text x="${c * cellSize + cellSize / 2}" y="${r * cellSize + cellSize / 2 + 3}" font-size="${cellSize * 0.5}" fill="${lum > 128 ? '#000' : '#fff'}" text-anchor="middle" font-family="monospace">${label}</text>\n`
          }
        }
      }
    }
  }

  for (let r = 0; r <= gridH; r++) {
    const sw = r % 5 === 0 ? 1.5 : 0.5
    gridLayer += `<line x1="0" y1="${r * cellSize}" x2="${totalW}" y2="${r * cellSize}" stroke="#999" stroke-width="${sw}" />\n`
  }
  for (let c = 0; c <= gridW; c++) {
    const sw = c % 5 === 0 ? 1.5 : 0.5
    gridLayer += `<line x1="${c * cellSize}" y1="0" x2="${c * cellSize}" y2="${totalH}" stroke="#999" stroke-width="${sw}" />\n`
  }

  if (showCoords) {
    for (let c = 0; c < gridW; c++) coordLayer += `<text x="${c * cellSize + cellSize / 2}" y="${totalH + 14}" font-size="8" fill="#666" text-anchor="middle">${colLabel(c)}</text>\n`
    for (let r = 0; r < gridH; r++) coordLayer += `<text x="${totalW + 10}" y="${r * cellSize + cellSize / 2 + 3}" font-size="8" fill="#666" text-anchor="start">${r + 1}</text>\n`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${showCoords ? totalW + 30 : totalW}" height="${showCoords ? totalH + 20 : totalH}" viewBox="0 0 ${showCoords ? totalW + 30 : totalW} ${showCoords ? totalH + 20 : totalH}">
  <g id="color-layer">${colorLayer}</g>
  <g id="grid-layer">${gridLayer}</g>
  <g id="label-layer">${textLayer}</g>
  <g id="coord-layer">${coordLayer}</g>
</svg>`
}

// ============================================
//  JSON 工程源文件导出
// ============================================
export function exportJSONData(grid, design, author) {
  const pixelData = [], colorMap = new Map()
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]; if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (cell?.hex) {
        pixelData.push({ x: c, y: r, colorCode: cell.name || '', hex: cell.hex })
        colorMap.set(cell.hex, (colorMap.get(cell.hex) || 0) + 1)
      }
    }
  }
  return {
    workId: design.id, title: design.title,
    width: design.grid_width, height: design.grid_height,
    brand: design.brand || 'Hama',
    pixelData, colorTotal: colorMap.size, totalBeadCount: pixelData.length,
    authorInfo: author ? { id: author.id, nickname: author.nickname || author.username } : {},
    paramInfo: { difficulty: design.difficulty || 1, costTime: design.cost_time || '', realSize: design.real_size || '' },
    exportedAt: new Date().toISOString(),
  }
}

// ============================================
//  CSV 物料清单导出
// ============================================
export function exportCSVString(grid, design, lossRate = 5) {
  const beadMap = new Map()
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]; if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]
      if (cell?.hex) {
        const key = cell.hex
        if (!beadMap.has(key)) beadMap.set(key, { name: cell.name || '', hex: cell.hex, needCount: 0 })
        beadMap.get(key).needCount++
      }
    }
  }
  const list = [...beadMap.values()].sort((a, b) => b.needCount - a.needCount)
  let csv = 'colorCode,colorName,hexRgb,needCount,suggestCount,brand\n'
  for (const b of list) {
    const suggest = Math.ceil(b.needCount * (1 + lossRate / 100))
    csv += `${(b.name || '').split(' ')[0] || b.name},${b.name},${b.hex},${b.needCount},${suggest},${design.brand || 'Hama'}\n`
  }
  return csv
}

// ============================================
//  全格式 ZIP 打包 + readme.txt
// ============================================
export async function exportBatch(designs, opts = {}) {
  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('stream')
  const archive = archiver('zip', { zlib: { level: 9 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  const formats = opts.formats || ['pdf', 'png', 'csv', 'svg', 'json']

  for (let i = 0; i < designs.length; i++) {
    const d = designs[i]
    const prefix = designs.length > 1 ? `${String(i + 1).padStart(2, '0')}_` : ''

    if (formats.includes('pdf')) {
      const buf = await exportPDF(d.grid, d.gridW, d.gridH, { title: d.title, author: d.author || '', lossRate: d.lossRate || 5 })
      archive.append(buf, { name: `${prefix}打印施工图纸.pdf` })
    }
    if (formats.includes('png')) {
      const buf = await exportHighRes(d.grid, d.gridW, d.gridH, { scale: 2, showGrid: true })
      archive.append(buf, { name: `${prefix}高清预览图.png` })
    }
    if (formats.includes('csv')) {
      archive.append(Buffer.from('﻿' + exportCSVString(d.grid, { brand: 'Hama' }, d.lossRate || 5), 'utf-8'), { name: `${prefix}物料采购清单.csv` })
    }
    if (formats.includes('svg')) {
      archive.append(Buffer.from(exportSVGString(d.grid, d.gridW, d.gridH), 'utf-8'), { name: `${prefix}矢量图纸.svg` })
    }
    if (formats.includes('json')) {
      archive.append(Buffer.from(JSON.stringify(exportJSONData(d.grid, { id: 0, title: d.title, grid_width: d.gridW, grid_height: d.gridH, brand: 'Hama', difficulty: 1, cost_time: '', real_size: '' }, null), null, 2), 'utf-8'), { name: `${prefix}工程源文件.json` })
    }

    // readme.txt
    const readme = `拼豆图纸 — ${d.title}\n${'─'.repeat(40)}\n\n📐 基本信息\n  尺寸：${d.gridW}×${d.gridH} 格\n  品牌：${d.brand || 'Hama'}\n\n🖨️ 打印设置\n  纸张：A4 横向\n  缩放：100%\n\n📦 文件说明\n  01_打印施工图纸.pdf — 可打印施工图纸\n  02_高清预览图.png — 高清预览\n  03_物料采购清单.csv — 采购清单\n  04_矢量图纸.svg — 可导入 AI/Inkscape\n  05_工程源文件.json — 可回传平台编辑\n\n⚠️ 注意事项\n  备货量已含 ${d.lossRate || 5}% 损耗\n  熨烫温度 160-180°C\n  仅供个人使用，禁止商用\n`
    archive.append(Buffer.from(readme, 'utf-8'), { name: 'readme.txt' })
  }

  archive.finalize()
  return new Promise((resolve, reject) => {
    const chunks = []
    passThrough.on('data', (c) => chunks.push(c))
    passThrough.on('end', () => resolve(Buffer.concat(chunks)))
    passThrough.on('error', reject)
  })
}
