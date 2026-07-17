// ============================================
//  Canvas 渲染器 — 1:1 像素渲染
//  canvas 内部分辨率 = CSS 显示尺寸（gridSize × zoom）
//  零缩放、零变换、零模糊
// ============================================

export class CanvasRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.gridW = opts.gridW || 58
    this.gridH = opts.gridH || 58
    this.zoom = opts.zoom || 10
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!this.ctx) {
      throw new Error('CanvasRenderer: 无法获取 2D 上下文')
    }
  }

  /** 重设尺寸：内部分辨率 = gridW*zoom × gridH*zoom，与 CSS 显示 1:1 */
  resize(w, h, zoom) {
    this.gridW = w
    this.gridH = h
    this.zoom = zoom || this.zoom
    this.canvas.width = Math.round(w * this.zoom)
    this.canvas.height = Math.round(h * this.zoom)
    // 无缩放变换，1:1 像素
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  /** CSS 定位：尺寸与内部分辨率一致 */
  position(container, zoom, panX = 0, panY = 0) {
    if (!container) return
    this.zoom = zoom
    const cw = this.gridW * zoom
    const ch = this.gridH * zoom
    const cx = container.clientWidth / 2 + panX - cw / 2
    const cy = container.clientHeight / 2 + panY - ch / 2
    Object.assign(this.canvas.style, {
      left: Math.round(cx) + 'px',
      top: Math.round(cy) + 'px',
      width: Math.round(cw) + 'px',
      height: Math.round(ch) + 'px'
    })
  }

  // ========== 0. 全局坐标网格（底层） ==========
  setGlobalGridCanvas(canvas) {
    this.globalCanvas = canvas
    this.globalCtx = canvas.getContext('2d')
  }

  renderGlobalGrid(container, zoom, panX, panY) {
    if (!this.globalCanvas || !this.globalCtx) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw <= 0 || ch <= 0) return

    // 1:1 渲染
    this.globalCanvas.width = cw
    this.globalCanvas.height = ch
    this.globalCanvas.style.width = cw + 'px'
    this.globalCanvas.style.height = ch + 'px'
    this.globalCtx.setTransform(1, 0, 0, 1, 0, 0)

    const ox = cw / 2 + panX - this.gridW * zoom / 2
    const oy = ch / 2 + panY - this.gridH * zoom / 2

    const startCol = Math.floor(-ox / zoom)
    const endCol = Math.ceil((cw - ox) / zoom)
    const startRow = Math.floor(-oy / zoom)
    const endRow = Math.ceil((ch - oy) / zoom)

    // 细网格
    this.globalCtx.strokeStyle = '#dde1e6'
    this.globalCtx.lineWidth = 0.5
    this.globalCtx.beginPath()
    for (let r = startRow; r <= endRow; r++) {
      const y = Math.round(oy + r * zoom) + 0.5
      this.globalCtx.moveTo(0, y); this.globalCtx.lineTo(cw, y)
    }
    for (let c = startCol; c <= endCol; c++) {
      const x = Math.round(ox + c * zoom) + 0.5
      this.globalCtx.moveTo(x, 0); this.globalCtx.lineTo(x, ch)
    }
    this.globalCtx.stroke()

    // 主刻度线：每 50 格
    this.globalCtx.strokeStyle = '#c8ced6'
    this.globalCtx.lineWidth = 1
    this.globalCtx.beginPath()
    const majorStartCol = Math.floor(startCol / 50) * 50
    const majorStartRow = Math.floor(startRow / 50) * 50
    for (let r = majorStartRow; r <= endRow; r += 50) {
      const y = Math.round(oy + r * zoom) + 0.5
      this.globalCtx.moveTo(0, y); this.globalCtx.lineTo(cw, y)
    }
    for (let c = majorStartCol; c <= endCol; c += 50) {
      const x = Math.round(ox + c * zoom) + 0.5
      this.globalCtx.moveTo(x, 0); this.globalCtx.lineTo(x, ch)
    }
    this.globalCtx.stroke()
  }

  // ========== 1. 珠子渲染（fillRect，按颜色合批） ==========
  renderBeads(grid, highlightHex = null, dimHex = null) {
    const z = this.zoom
    const w = this.gridW, h = this.gridH
    const ctx = this.ctx

    // 清空 + 底板色
    ctx.fillStyle = '#e8eaed'
    ctx.fillRect(0, 0, w * z, h * z)

    // 按颜色分组，合批渲染
    const batches = new Map()
    for (let r = 0; r < h; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < w; c++) {
        const cell = row[c]
        if (!cell || !cell.hex) continue
        const key = cell.hex.toUpperCase()
        if (!batches.has(key)) batches.set(key, [])
        batches.get(key).push([r, c])
      }
    }

    for (const [hex, cells] of batches) {
      const cell0 = grid[cells[0][0]]?.[cells[0][1]]
      const dimmed = dimHex && hex !== dimHex.toUpperCase()
      const hl = highlightHex && hex === highlightHex.toUpperCase()

      let color = hex
      if (dimmed) {
        // 变暗
        const cr = parseInt(hex.slice(1, 3), 16)
        const cg = parseInt(hex.slice(3, 5), 16)
        const cb = parseInt(hex.slice(5, 7), 16)
        color = `rgb(${Math.round(cr * 0.25)},${Math.round(cg * 0.25)},${Math.round(cb * 0.25)})`
      } else if (hl) {
        // 高亮
        const cr = parseInt(hex.slice(1, 3), 16)
        const cg = parseInt(hex.slice(3, 5), 16)
        const cb = parseInt(hex.slice(5, 7), 16)
        color = `rgb(${Math.min(255, cr + Math.round((255 - cr) * 0.3))},${Math.min(255, cg + Math.round((255 - cg) * 0.3))},${Math.min(255, cb + Math.round((255 - cb) * 0.3))})`
      }

      ctx.fillStyle = color
      for (const [r, c] of cells) {
        ctx.fillRect(c * z, r * z, z, z)
      }
    }
  }

  // ========== 2. 参考图叠加 ==========
  renderRefOverlay(refPixels, refW, refH, opacity = 0.3, offsetX = 0, offsetY = 0, scale = 1) {
    if (!refPixels) return
    const z = this.zoom
    const w = this.gridW, h = this.gridH
    const ctx = this.ctx
    const alpha = Math.max(0, Math.min(1, opacity))

    // 用半透明 fillRect 逐珠覆盖
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const srcR = Math.floor((r - offsetY) / scale)
        const srcC = Math.floor((c - offsetX) / scale)
        const px = (srcR >= 0 && srcR < refH && srcC >= 0 && srcC < refW) ? refPixels[srcR]?.[srcC] : null
        if (!px) continue

        let hex = px.hex
        if (!hex && px.r !== undefined) {
          hex = '#' + [px.r, px.g, px.b].map(v => v.toString(16).padStart(2, '0')).join('')
        }
        if (!hex) continue

        ctx.fillStyle = hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.fillRect(c * z, r * z, z, z)
      }
    }
  }

  // ========== 3. 网格线（1:1 像素，锐利对齐） ==========
  renderGridLines(show = true) {
    if (!show) return
    const z = this.zoom
    const w = this.gridW, h = this.gridH
    const ctx = this.ctx

    // 细网格线：+0.5 偏移确保 1px 线条锐利
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let r = 0; r <= h; r++) {
      const y = Math.round(r * z) + 0.5
      ctx.moveTo(0, y); ctx.lineTo(w * z, y)
    }
    for (let c = 0; c <= w; c++) {
      const x = Math.round(c * z) + 0.5
      ctx.moveTo(x, 0); ctx.lineTo(x, h * z)
    }
    ctx.stroke()

    // 边界框
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.strokeRect(0.5, 0.5, w * z - 1, h * z - 1)
  }

  // ========== 4. 色号标签（缩放够大时才显示） ==========
  renderLabels(grid, zoom) {
    // 缩放到 12 以上才显示字号
    if (zoom < 12) return
    const z = zoom
    const w = this.gridW, h = this.gridH
    const ctx = this.ctx

    // 字号跟随缩放线性增长
    const fontSize = Math.round(z * 0.38)
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let r = 0; r < h; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < w; c++) {
        const cell = row[c]
        if (!cell || !cell.hex || !cell.name) continue
        // 只显示色号（去掉英文颜色名）
        const label = cell.name?.split(' ')[0] || cell.name
        if (!label) continue
        const cx = c * z + z / 2
        const cy = r * z + z / 2
        // 文字描边确保在任意底色可读
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'
        ctx.lineWidth = Math.max(1, fontSize * 0.2)
        ctx.strokeText(label, cx, cy)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(label, cx, cy)
      }
    }
  }

  // ========== 一次调用渲染全部 ==========
  renderAll(grid, opts = {}) {
    const { highlightHex, dimHex, refPixels, refW, refH, refOpacity, refOffsetX, refOffsetY, refScale, showGrid, zoom, showLabels } = opts
    try {
      if (!grid || !grid.length) {
        const z = this.zoom
        this.ctx.clearRect(0, 0, this.gridW * z, this.gridH * z)
        this.renderGridLines(showGrid)
        return
      }
      this.renderBeads(grid, highlightHex || null, dimHex || null)
      if (refPixels) this.renderRefOverlay(refPixels, refW || 0, refH || 0, refOpacity || 0, refOffsetX || 0, refOffsetY || 0, refScale || 1)
      this.renderGridLines(showGrid)
      if (showLabels !== false) this.renderLabels(grid, zoom || 10)
    } catch (e) {
      console.error('Canvas renderAll error:', e)
    }
  }

  // ========== 静态方法 ==========
  static exportHighRes(grid, gridW, gridH, bgColor = '#f0f0f0') {
    const SCALE = 10
    const canvas = document.createElement('canvas')
    canvas.width = gridW * SCALE
    canvas.height = gridH * SCALE
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let r = 0; r < gridH; r++) {
      const row = grid[r]; if (!row) continue
      for (let c = 0; c < gridW; c++) {
        const cell = row[c]
        ctx.fillStyle = (cell && cell.hex) ? cell.hex : bgColor
        ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE)
      }
    }
    return canvas
  }

  static extractGrid(sourceCanvas, targetW, targetH) {
    const srcW = sourceCanvas.width, srcH = sourceCanvas.height
    const srcCtx = sourceCanvas.getContext('2d')
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data
    const grid = []
    const cellW = Math.max(1, Math.floor(srcW / targetW))
    const cellH = Math.max(1, Math.floor(srcH / targetH))
    for (let r = 0; r < targetH; r++) {
      const row = []
      for (let c = 0; c < targetW; c++) {
        const sx = Math.min(srcW - 1, c * cellW + Math.floor(cellW / 2))
        const sy = Math.min(srcH - 1, r * cellH + Math.floor(cellH / 2))
        const idx = (sy * srcW + sx) * 4
        if (srcData[idx + 3] < 128) { row.push(null); continue }
        const hex = '#' + [srcData[idx], srcData[idx + 1], srcData[idx + 2]]
          .map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
        row.push({ r: srcData[idx], g: srcData[idx + 1], b: srcData[idx + 2], hex })
      }
      grid.push(row)
    }
    return grid
  }
}
