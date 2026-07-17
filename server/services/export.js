// ============================================
//  高清导出服务 — Sharp PNG + PDFKit PDF 导出
// ============================================
import sharp from 'sharp'
import PDFDocument from 'pdfkit'

/**
 * 用 Sharp 从 gridData 生成高清 PNG
 * @param {Array<Array<object|null>>} grid - 二维网格数据
 * @param {number} gridW - 网格宽度
 * @param {number} gridH - 网格高度
 * @param {object} opts - 导出选项
 * @param {number} [opts.scale=10] - 每珠子的像素倍数
 * @param {boolean} [opts.showGrid=false] - 是否显示网格线
 * @param {string} [opts.bgColor='#f0f0f0'] - 空白格背景色
 * @param {string} [opts.gridColor='#cccccc'] - 网格线颜色
 * @returns {Promise<Buffer>} PNG 格式的图片 Buffer
 */
export async function exportHighRes(grid, gridW, gridH, opts = {}) {
  const scale = Math.min(50, Math.max(1, opts.scale || 10))
  const showGrid = !!opts.showGrid
  const bgColor = opts.bgColor || '#f0f0f0'
  const gridColor = opts.gridColor || '#cccccc'

  const pixelW = gridW * scale
  const pixelH = gridH * scale

  // 构建 SVG（比逐个 composite 高效得多）
  let svgRects = ''
  let idx = 0
  for (let r = 0; r < gridH; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < gridW; c++) {
      const cell = row[c]
      if (cell && cell.hex) {
        svgRects += `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}" fill="${cell.hex}" />\n`
      }
    }
  }

  // 网格线
  let svgGrid = ''
  if (showGrid) {
    for (let r = 0; r < pixelH; r += scale) {
      svgGrid += `<line x1="0" y1="${r}" x2="${pixelW}" y2="${r}" stroke="${gridColor}" stroke-width="1" />\n`
    }
    for (let c = 0; c < pixelW; c += scale) {
      svgGrid += `<line x1="${c}" y1="0" x2="${c}" y2="${pixelH}" stroke="${gridColor}" stroke-width="1" />\n`
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}">
    <rect width="${pixelW}" height="${pixelH}" fill="${bgColor}" />
    ${svgRects}
    ${svgGrid}
  </svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * 批量导出多个设计为 ZIP 包
 * @param {Array<{grid, gridW, gridH}>} designs - 设计数据列表
 * @param {object} opts - 导出选项
 * @returns {Promise<Buffer>} ZIP 格式的 Buffer
 */
export async function exportBatch(designs, opts = {}) {
  const archiver = (await import('archiver')).default
  const { PassThrough } = await import('stream')

  const archive = archiver('zip', { zlib: { level: 9 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  for (let i = 0; i < designs.length; i++) {
    const d = designs[i]
    const pngBuffer = await exportHighRes(d.grid, d.gridW, d.gridH, opts)
    archive.append(pngBuffer, { name: `拼豆_${d.gridW}x${d.gridH}_${i + 1}.png` })
  }

  archive.finalize()

  // 收集 ZIP 数据
  return new Promise((resolve, reject) => {
    const chunks = []
    passThrough.on('data', chunk => chunks.push(chunk))
    passThrough.on('end', () => resolve(Buffer.concat(chunks)))
    passThrough.on('error', reject)
  })
}

/**
 * 生成 300DPI PDF 图纸（含色号标注 + 网格线 + 材料清单）
 * 参考 Bead Craft 的 PDF 导出标准
 * @param {Array<Array<object|null>>} grid - 二维网格数据
 * @param {number} gridW - 网格宽度
 * @param {number} gridH - 网格高度
 * @param {object} opts - 选项
 * @param {string} [opts.title='拼豆图纸'] - 图纸标题
 * @param {boolean} [opts.showLabels=false] - 是否显示色号标注
 * @param {string} [opts.bgColor='#f0f0f0'] - 空白格颜色
 * @returns {Promise<Buffer>} PDF 格式的 Buffer
 */
export async function exportPDF(grid, gridW, gridH, opts = {}) {
  const title = opts.title || '拼豆图纸'
  const showLabels = !!opts.showLabels
  const bgColor = opts.bgColor || '#f0f0f0'

  // 页面参数：A4 210×297mm，带边距
  const pageW = 595.28  // A4 宽度 (pt)
  const pageH = 841.89  // A4 高度 (pt)
  const margin = 50     // 页边距

  // 可用绘图区域
  const drawW = pageW - margin * 2
  const drawH = pageH - margin * 2

  // 计算每个珠子的尺寸（尽量放大但不超出页面）
  if (!gridW || !gridH || gridW <= 0 || gridH <= 0) {
    throw new Error(`无效的网格尺寸: ${gridW}×${gridH}`)
  }
  const cellSize = Math.floor(Math.min(drawW / gridW, drawH / gridH))

  // 实际网格绘制尺寸
  const gridW_px = cellSize * gridW
  const gridH_px = cellSize * gridH

  // 居中偏移
  const offsetX = margin + (drawW - gridW_px) / 2
  const offsetY = margin + 40 // 顶部留标题空间

  // 统计材料清单
  const beadMap = new Map()
  for (let r = 0; r < gridH; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < gridW; c++) {
      const cell = row[c]
      if (cell?.name && cell?.hex) {
        const key = cell.hex
        if (!beadMap.has(key)) {
          beadMap.set(key, { name: cell.name, hex: cell.hex, count: 0 })
        }
        beadMap.get(key).count++
      }
    }
  }
  const beadList = [...beadMap.values()].sort((a, b) => b.count - a.count)
  const totalBeads = beadList.reduce((sum, b) => sum + b.count, 0)

  // 创建 PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: title,
      Author: '豆丁 - 拼豆图纸工具',
      Subject: `${gridW}×${gridH} 拼豆图纸`
    }
  })

  const chunks = []
  doc.on('data', chunk => chunks.push(chunk))

  // === 第1页：网格图纸 ===
  // 标题
  doc.fontSize(16).font('Helvetica-Bold').text(title, margin, margin, { align: 'center' })
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(`${gridW} × ${gridH}  |  ${beadList.length} 色  |  共 ${totalBeads} 颗珠子`, margin, margin + 20, { align: 'center' })
  doc.fillColor('#000')

  // 绘制网格背景
  doc.rect(offsetX, offsetY, gridW_px, gridH_px).fill(bgColor)

  // 绘制珠子
  for (let r = 0; r < gridH; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < gridW; c++) {
      const cell = row[c]
      const fill = (cell?.hex) ? cell.hex : bgColor
      doc.rect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize)
        .fill(fill)
    }
  }

  // 绘制网格线
  if (gridW <= 60 && gridH <= 60) {
    doc.strokeColor('#ccc').lineWidth(0.3)
    for (let r = 0; r <= gridH; r++) {
      doc.moveTo(offsetX, offsetY + r * cellSize)
        .lineTo(offsetX + gridW_px, offsetY + r * cellSize).stroke()
    }
    for (let c = 0; c <= gridW; c++) {
      doc.moveTo(offsetX + c * cellSize, offsetY)
        .lineTo(offsetX + c * cellSize, offsetY + gridH_px).stroke()
    }
    doc.lineWidth(1)
  }

  // 色号标注（在珠子中央显示编号）
  if (showLabels && beadList.length <= 30 && cellSize >= 12) {
    // 构建颜色索引
    const colorIndex = {}
    beadList.forEach((b, i) => { colorIndex[b.hex.toUpperCase()] = String(i + 1) })

    doc.fontSize(Math.max(4, cellSize * 0.5)).font('Helvetica')
    for (let r = 0; r < gridH; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < gridW; c++) {
        const cell = row[c]
        if (!cell?.hex) continue
        const idx = colorIndex[cell.hex.toUpperCase()]
        if (!idx) continue
        // 判断文字颜色（亮度高的背景用黑字，反之白字）
        const hex = cell.hex.replace('#', '')
        const cr = parseInt(hex.substring(0, 2), 16)
        const cg = parseInt(hex.substring(2, 4), 16)
        const cb = parseInt(hex.substring(4, 6), 16)
        const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb
        doc.fillColor(lum > 128 ? '#000' : '#fff')
        const tx = offsetX + c * cellSize + cellSize / 2
        const ty = offsetY + r * cellSize + cellSize / 2
        doc.text(idx, tx - cellSize * 0.15, ty - cellSize * 0.25, {
          width: cellSize * 0.6, align: 'center'
        })
      }
    }
  }

  // === 第2页：材料清单 ===
  doc.addPage()
  doc.fontSize(14).font('Helvetica-Bold').text('材料清单', margin, margin)
  doc.fontSize(9).font('Helvetica').fillColor('#666')
    .text(`共 ${beadList.length} 种颜色 · ${totalBeads} 颗珠子`, margin, margin + 18)
  doc.fillColor('#000')

  // 表格头
  const tableTop = margin + 40
  const colW = [30, 90, 70, 250, 60]  // 序号、色号、名称、颜色、数量
  const colX = [margin, margin + 35, margin + 130, margin + 205, margin + 460]

  doc.fontSize(8).font('Helvetica-Bold')
  doc.text('序号', colX[0], tableTop); doc.text('色号', colX[1], tableTop)
  doc.text('名称', colX[2], tableTop); doc.text('颜色', colX[3], tableTop)
  doc.text('数量', colX[4], tableTop)

  // 分隔线
  doc.moveTo(margin, tableTop + 12).lineTo(pageW - margin, tableTop + 12).stroke('#ccc')

  // 列表
  doc.font('Helvetica')
  beadList.forEach((b, i) => {
    const y = tableTop + 18 + i * 16
    if (y > pageH - margin) { doc.addPage(); return } // 超出则换页

    doc.fontSize(8)
    doc.text(String(i + 1), colX[0], y)
    doc.text(b.hex, colX[1], y)
    doc.text(b.name, colX[2], y, { width: 50 })
    // 颜色色块
    doc.rect(colX[3], y + 1, 10, 8).fill(b.hex)
    doc.rect(colX[3], y + 1, 10, 8).stroke('#999')
    doc.text(String(b.count) + ' 颗', colX[4], y)
  })

  // 页脚
  const footerY = pageH - margin
  doc.fontSize(7).fillColor('#999')
  doc.text(`由「豆丁」拼豆图纸工具生成 — ${new Date().toISOString().slice(0, 10)}`, margin, footerY, { align: 'center' })

  doc.end()

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })
}
