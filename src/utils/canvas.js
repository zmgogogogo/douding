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
      height: Math.round(ch) + 'px',
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

    const ox = cw / 2 + panX - (this.gridW * zoom) / 2
    const oy = ch / 2 + panY - (this.gridH * zoom) / 2

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
      this.globalCtx.moveTo(0, y)
      this.globalCtx.lineTo(cw, y)
    }
    for (let c = startCol; c <= endCol; c++) {
      const x = Math.round(ox + c * zoom) + 0.5
      this.globalCtx.moveTo(x, 0)
      this.globalCtx.lineTo(x, ch)
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
      this.globalCtx.moveTo(0, y)
      this.globalCtx.lineTo(cw, y)
    }
    for (let c = majorStartCol; c <= endCol; c += 50) {
      const x = Math.round(ox + c * zoom) + 0.5
      this.globalCtx.moveTo(x, 0)
      this.globalCtx.lineTo(x, ch)
    }
    this.globalCtx.stroke()
  }

  // ========== 1. 珠子渲染（fillRect，按颜色合批） ==========
  renderBeads(grid, highlightHex = null, dimHex = null, exclusiveHex = null) {
    const z = this.zoom
    const w = this.gridW,
      h = this.gridH
    const ctx = this.ctx

    // 清空 + 底板色
    ctx.fillStyle = exclusiveHex ? '#e2e8f0' : '#ffffff'
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
      // 独占模式：只渲染选中的颜色，跳过所有其他颜色
      if (exclusiveHex && hex !== exclusiveHex.toUpperCase()) {
        continue
      }

      const cell0 = grid[cells[0][0]]?.[cells[0][1]]
      const dimmed = dimHex && hex !== dimHex.toUpperCase()
      const hl = highlightHex && hex === highlightHex.toUpperCase()

      let color = hex
      if (dimmed) {
        const cr = parseInt(hex.slice(1, 3), 16)
        const cg = parseInt(hex.slice(3, 5), 16)
        const cb = parseInt(hex.slice(5, 7), 16)
        color = `rgb(${Math.round(cr * 0.25)},${Math.round(cg * 0.25)},${Math.round(cb * 0.25)})`
      } else if (hl || exclusiveHex) {
        // 独占模式或高亮：保持原色
        color = hex
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
    const w = this.gridW,
      h = this.gridH
    const ctx = this.ctx
    const alpha = Math.max(0, Math.min(1, opacity))

    // 用半透明 fillRect 逐珠覆盖
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const srcR = Math.floor((r - offsetY) / scale)
        const srcC = Math.floor((c - offsetX) / scale)
        const px =
          srcR >= 0 && srcR < refH && srcC >= 0 && srcC < refW ? refPixels[srcR]?.[srcC] : null
        if (!px) continue

        let hex = px.hex
        if (!hex && px.r !== undefined) {
          hex = '#' + [px.r, px.g, px.b].map((v) => v.toString(16).padStart(2, '0')).join('')
        }
        if (!hex) continue

        ctx.fillStyle =
          hex +
          Math.round(alpha * 255)
            .toString(16)
            .padStart(2, '0')
        ctx.fillRect(c * z, r * z, z, z)
      }
    }
  }

  // ========== 3. 网格线（1:1 像素，锐利对齐） ==========
  renderGridLines(show = true, gridColor = 'rgba(0,0,0,0.12)') {
    if (!show) return
    const z = this.zoom
    const w = this.gridW,
      h = this.gridH
    const ctx = this.ctx

    // 细网格线：+0.5 偏移确保 1px 线条锐利
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let r = 0; r <= h; r++) {
      const y = Math.round(r * z) + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(w * z, y)
    }
    for (let c = 0; c <= w; c++) {
      const x = Math.round(c * z) + 0.5
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h * z)
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
    const w = this.gridW,
      h = this.gridH
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
    const {
      highlightHex,
      dimHex,
      exclusiveHex,
      refPixels,
      refW,
      refH,
      refOpacity,
      refOffsetX,
      refOffsetY,
      refScale,
      showGrid,
      zoom,
      showLabels,
    } = opts
    try {
      if (!grid || !grid.length) {
        const z = this.zoom
        this.ctx.clearRect(0, 0, this.gridW * z, this.gridH * z)
        this.renderGridLines(showGrid)
        return
      }
      this.renderBeads(grid, highlightHex || null, dimHex || null, exclusiveHex || null)
      if (refPixels)
        this.renderRefOverlay(
          refPixels,
          refW || 0,
          refH || 0,
          refOpacity || 0,
          refOffsetX || 0,
          refOffsetY || 0,
          refScale || 1
        )
      this.renderGridLines(showGrid)
      if (showLabels !== false) this.renderLabels(grid, zoom || 10)
    } catch (e) {
      console.error('Canvas renderAll error:', e)
    }
  }

  // ========== 5. 十字定位线（辅助层叠加） ==========
  renderCrosshair(crosshairCol, crosshairRow, containerW, containerH, zoom, panX, panY, color = '#ef4444', mode = 'follow') {
    if (mode === 'off') return
    if (mode === 'follow' && (crosshairCol === null || crosshairRow === null)) return

    const ctx = this.ctx
    const cw = containerW
    const ch = containerH
    if (cw <= 0 || ch <= 0) return

    // 计算十字线中心在画布上的位置
    const gridCx = crosshairCol * zoom + zoom / 2
    const gridCy = crosshairRow * zoom + zoom / 2

    // 画布偏移量
    const ox = cw / 2 + panX
    const oy = ch / 2 + panY

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    // 水平线
    ctx.moveTo(0, Math.round(oy + gridCy - (this.gridH * zoom) / 2) + 0.5)
    ctx.lineTo(cw, Math.round(oy + gridCy - (this.gridH * zoom) / 2) + 0.5)
    // 垂直线
    ctx.moveTo(Math.round(ox + gridCx - (this.gridW * zoom) / 2) + 0.5, 0)
    ctx.lineTo(Math.round(ox + gridCx - (this.gridW * zoom) / 2) + 0.5, ch)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // ========== 6. 已完成/高亮覆盖层渲染 ==========
  /**
   * 在已有画布上叠加半透明覆盖层
   * @param {Set<string>} finishedCells — "r,c" 格式的已完成格子的 Set
   * @param {number} opacity — 透明度 (0~1)
   * @param {string} overlayColor — 覆盖颜色（默认白色）
   */
  renderOverlay(finishedCells, opacity = 0.4, overlayColor = '#ffffff') {
    if (!finishedCells || finishedCells.size === 0) return
    const z = this.zoom
    const ctx = this.ctx

    ctx.fillStyle = overlayColor + Math.round(opacity * 255).toString(16).padStart(2, '0')

    for (const key of finishedCells) {
      const [r, c] = key.split(',').map(Number)
      ctx.fillRect(c * z, r * z, z, z)
    }
  }

  // ========== 7. 高光效果渲染（发光边框） ==========
  /**
   * 给指定格子添加发光效果
   * @param {Array<{r:number, c:number}>} cells — 要高亮的格子的数组
   * @param {string} glowColor — 发光颜色
   * @param {number} intensity — 强度 (0~1)
   */
  renderGlowEffect(cells, glowColor = '#fbbf24', intensity = 0.5) {
    if (!cells || cells.length === 0) return
    const z = this.zoom
    const ctx = this.ctx

    ctx.save()
    ctx.strokeStyle = glowColor
    ctx.lineWidth = Math.max(2, z * 0.25)
    ctx.shadowColor = glowColor
    ctx.shadowBlur = Math.max(4, z * 0.5) * intensity

    for (const { r, c } of cells) {
      // 只画边框，不填充
      ctx.strokeRect(c * z + 0.5, r * z + 0.5, z - 1, z - 1)
    }

    ctx.shadowBlur = 0
    ctx.restore()
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
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < gridW; c++) {
        const cell = row[c]
        ctx.fillStyle = cell && cell.hex ? cell.hex : bgColor
        ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE)
      }
    }
    return canvas
  }

  static extractGrid(sourceCanvas, targetW, targetH) {
    const srcW = sourceCanvas.width,
      srcH = sourceCanvas.height
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
        if (srcData[idx + 3] < 128) {
          row.push(null)
          continue
        }
        const hex =
          '#' +
          [srcData[idx], srcData[idx + 1], srcData[idx + 2]]
            .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
            .join('')
        row.push({ r: srcData[idx], g: srcData[idx + 1], b: srcData[idx + 2], hex })
      }
      grid.push(row)
    }
    return grid
  }

  /**
   * 渲染放大镜内容 — 从源 Canvas 截取局部区域并放大
   * @param {HTMLCanvasElement} sourceCanvas — 源画布（图纸画布）
   * @param {HTMLCanvasElement} targetCanvas — 目标画布（放大镜画布）
   * @param {number} centerX — 放大中心在源画布上的 X 坐标
   * @param {number} centerY — 放大中心在源画布上的 Y 坐标
   * @param {number} scale — 放大倍数（默认3）
   * @param {number} size — 放大镜窗口尺寸（默认150px）
   * @param {boolean} showGrid — 是否显示网格线
   * @param {boolean} showCrosshair — 是否显示十字分割线
   */
  static renderMagnifier(
    sourceCanvas,
    targetCanvas,
    centerX,
    centerY,
    scale = 3,
    size = 150,
    showGrid = true,
    showCrosshair = true
  ) {
    const ctx = targetCanvas.getContext('2d')
    if (!ctx) return

    const halfSize = size / 2
    const srcHalf = halfSize / scale

    // 确保源区域不超出画布边界
    const srcX = Math.max(0, Math.min(sourceCanvas.width - srcHalf * 2, centerX - srcHalf))
    const srcY = Math.max(0, Math.min(sourceCanvas.height - srcHalf * 2, centerY - srcHalf))
    const srcW = Math.min(srcHalf * 2, sourceCanvas.width - srcX)
    const srcH = Math.min(srcHalf * 2, sourceCanvas.height - srcY)

    targetCanvas.width = size
    targetCanvas.height = size

    // 背景
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, size, size)

    // 圆形裁剪
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.clip()

    // 从源 canvas 放大截取区域
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, size, size)

    // 计算目标绘制区域（居中）
    const destX = (size - srcW * scale) / 2
    const destY = (size - srcH * scale) / 2

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, srcX, srcY, srcW, srcH, destX, destY, srcW * scale, srcH * scale)

    // 网格线
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= srcW; i++) {
        const x = Math.round(destX + i * scale) + 0.5
        ctx.moveTo(x, destY)
        ctx.lineTo(x, destY + srcH * scale)
      }
      for (let j = 0; j <= srcH; j++) {
        const y = Math.round(destY + j * scale) + 0.5
        ctx.moveTo(destX, y)
        ctx.lineTo(destX + srcW * scale, y)
      }
      ctx.stroke()
    }

    // 十字分割线
    if (showCrosshair) {
      ctx.strokeStyle = 'rgba(239,68,68,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(size / 2, destY)
      ctx.lineTo(size / 2, destY + srcH * scale)
      ctx.moveTo(destX, size / 2)
      ctx.lineTo(destX + srcW * scale, size / 2)
      ctx.stroke()
    }

    ctx.restore()

    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()
  }
}
