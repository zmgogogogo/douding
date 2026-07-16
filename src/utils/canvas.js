// ============================================
//  Canvas 工具类 — 统一网格绘制
//  强制 DPR 倍率渲染，所有格子 1px 硬边界
//  无模糊渐变融合，纯像素级渲染
// ============================================

/**
 * 创建 DPR 感知的 Canvas 渲染器
 *
 * 关键原则：
 * - 内部分辨率 = gridSize × DPR，每个珠子 = DPR 物理像素
 * - CSS 尺寸 = gridSize × zoom，通过 image-rendering: pixelated 放大
 * - 所有绘制用整像素坐标，不产生子像素抗锯齿
 */
export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - 画布元素
   * @param {object} opts
   * @param {number} opts.gridW - 网格宽度（珠子数）
   * @param {number} opts.gridH - 网格高度（珠子数）
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas
    this.gridW = opts.gridW || 58
    this.gridH = opts.gridH || 58
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })
    this.dpr = 1
    this._updateDpr()
  }

  /** 获取当前设备像素比 */
  _updateDpr() {
    this.dpr = Math.max(1, window.devicePixelRatio || 1)
  }

  /**
   * 重设画布内部尺寸（像素级精确）
   * 内部分辨率 = gridSize × DPR
   */
  resize(w, h) {
    this.gridW = w
    this.gridH = h
    this._updateDpr()
    const iw = Math.round(w * this.dpr)
    const ih = Math.round(h * this.dpr)
    this.canvas.width = iw
    this.canvas.height = ih
    // 关键：用 setTransform 替代 scale，精确控制
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    // 关闭所有图像平滑（防止任何模糊）
    this.ctx.imageSmoothingEnabled = false
  }

  /**
   * 用 CSS 定位画布（配合 image-rendering: pixelated）
   * @param {HTMLElement} container - 容器元素
   * @param {number} zoom - 缩放级别
   * @param {number} panX - 水平偏移
   * @param {number} panY - 垂直偏移
   */
  position(container, zoom, panX = 0, panY = 0) {
    if (!container) return
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

  /**
   * 从 grid 数组渲染珠子到画布（ImageData 直接写入）
   * 每个珠子占据 DPR×DPR 的物理像素块，硬边界无渐变
   * @param {Array<Array<{hex:string}|null>>} grid - row[col] = {hex} | null
   */
  /**
   * 渲染珠子到画布，支持同色高亮和专注模式（其他颜色变暗）
   * @param {Array<Array<{hex:string}|null>>} grid
   * @param {string|null} [highlightHex] - 要高亮的颜色 hex，null 不高亮
   * @param {string|null} [dimHex] - 专注模式：非此颜色的所有珠子变暗，null 不启用
   */
  renderBeads(grid, highlightHex = null, dimHex = null) {
    const w = this.gridW, h = this.gridH
    const dpr = this.dpr
    const iw = w * dpr, ih = h * dpr
    const imgData = this.ctx.createImageData(iw, ih)

    for (let r = 0; r < h; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < w; c++) {
        const cell = row[c]
        if (!cell || !cell.hex) continue
        const hex = cell.hex.replace('#', '')
        const cr = parseInt(hex.substring(0, 2), 16)
        const cg = parseInt(hex.substring(2, 4), 16)
        const cb = parseInt(hex.substring(4, 6), 16)

        const isDimmed = dimHex && cell.hex.toUpperCase() !== dimHex.toUpperCase()
        const isHighlighted = highlightHex && cell.hex.toUpperCase() === highlightHex.toUpperCase()

        // 立体珠子渲染：每个珠子 = 高光(左上) + 基色(中) + 阴影(右下) + 圆角 + 缝隙
        for (let dy = 0; dy < dpr; dy++) {
          const baseY = (r * dpr + dy) * iw
          for (let dx = 0; dx < dpr; dx++) {
            const idx = (baseY + c * dpr + dx) * 4

            // 缝隙：珠子边缘留空
            const edgeDist = Math.min(dx, dy, dpr - 1 - dx, dpr - 1 - dy)
            if (edgeDist < 0.3) continue  // 珠子间缝隙

            // 圆角：四角透明
            const cx = dpr / 2, cy = dpr / 2
            const cornerDist = Math.sqrt((dx - cx) ** 2 + (dy - cy) ** 2) / (dpr / 2)
            if (cornerDist > 1.05) continue

            let fr = cr, fg = cg, fb = cb
            let alpha = 255

            if (isDimmed) {
              fr = Math.round(cr * 0.25); fg = Math.round(cg * 0.25); fb = Math.round(cb * 0.25)
            } else if (isHighlighted) {
              fr = Math.min(255, cr + Math.round((255 - cr) * 0.3))
              fg = Math.min(255, cg + Math.round((255 - cg) * 0.3))
              fb = Math.min(255, cb + Math.round((255 - cb) * 0.3))
            }

            // 立体光影：左上高光 + 右下阴影
            const lightFactor = 1 + (1 - (dx + dy) / (dpr * 2)) * 0.25  // 左上亮
            const shadowFactor = 1 - ((dx + dy) / (dpr * 2)) * 0.15       // 右下暗
            const factor = lightFactor * shadowFactor

            // 圆角边缘柔化
            if (cornerDist > 0.85) alpha = Math.round(255 * (1 - (cornerDist - 0.85) / 0.2))

            fr = Math.min(255, Math.max(0, Math.round(fr * factor)))
            fg = Math.min(255, Math.max(0, Math.round(fg * factor)))
            fb = Math.min(255, Math.max(0, Math.round(fb * factor)))

            imgData.data[idx] = fr
            imgData.data[idx + 1] = fg
            imgData.data[idx + 2] = fb
            imgData.data[idx + 3] = Math.round(alpha)
          }
        }
      }
    }
    this.ctx.putImageData(imgData, 0, 0)
  }

  /**
   * 渲染有效拼豆范围层网格（中层）
   * 规范：中度蓝内部网格(每1格) + 深蓝主分隔线(每10格) + 红色边界框 + 十字定位线
   * 注：全局浅灰蓝背景网格由 CSS 实现，不在此渲染
   */
  renderGridLines(show = true, crossCol = -1, crossRow = -1) {
    const w = this.gridW, h = this.gridH
    const dpr = this.dpr
    this.ctx.clearRect(0, 0, w, h)
    if (!show) return

    // ---- 内部基础网格：淡灰、1px、每1格 ----
    this.ctx.strokeStyle = '#E0E4E8'
    this.ctx.lineWidth = 0.5 / dpr
    this.ctx.beginPath()
    for (let r = 0; r <= h; r++) {
      this.ctx.moveTo(0, r); this.ctx.lineTo(w, r)
    }
    for (let c = 0; c <= w; c++) {
      this.ctx.moveTo(c, 0); this.ctx.lineTo(c, h)
    }
    this.ctx.stroke()

    // ---- 主分隔线：淡灰蓝、每10格 ----
    this.ctx.strokeStyle = '#CBD5E1'
    this.ctx.lineWidth = 1 / dpr
    this.ctx.beginPath()
    for (let r = 0; r <= h; r += 10) {
      this.ctx.moveTo(0, r); this.ctx.lineTo(w, r)
    }
    for (let c = 0; c <= w; c += 10) {
      this.ctx.moveTo(c, 0); this.ctx.lineTo(c, h)
    }
    this.ctx.stroke()

    // ---- 有效范围边界框（淡红 #F0C0C0 1.5px） ----
    this.ctx.strokeStyle = '#E8C0C0'
    this.ctx.lineWidth = 1.5 / dpr
    this.ctx.strokeRect(0, 0, w, h)

  }

  /**
   * 渲染参考图叠加层（半透明，保持硬像素边界）
   */
  renderRefOverlay(refPixels, refW, refH, opacity = 0.3, offsetX = 0, offsetY = 0, scale = 1) {
    if (!refPixels) { this.ctx.clearRect(0, 0, this.gridW, this.gridH); return }
    const w = this.gridW, h = this.gridH
    this.ctx.clearRect(0, 0, w, h)
    const imgData = this.ctx.createImageData(w * this.dpr, h * this.dpr)
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        // 应用偏移和缩放来计算源像素位置
        const srcR = Math.floor((r - offsetY) / scale)
        const srcC = Math.floor((c - offsetX) / scale)
        const px = (srcR >= 0 && srcR < refH && srcC >= 0 && srcC < refW)
          ? refPixels[srcR]?.[srcC] : null
        if (!px) continue
        for (let dy = 0; dy < this.dpr; dy++) {
          for (let dx = 0; dx < this.dpr; dx++) {
            const idx = ((r * this.dpr + dy) * w * this.dpr + c * this.dpr + dx) * 4
            imgData.data[idx] = px.r
            imgData.data[idx + 1] = px.g
            imgData.data[idx + 2] = px.b
            imgData.data[idx + 3] = alpha
          }
        }
      }
    }
    this.ctx.putImageData(imgData, 0, 0)
  }

  /**
   * 导出为高清 PNG（10x 放大）
   * 每个珠子 = 10×10 像素块，纯硬边界
   * @param {Array<Array<{hex:string}|null>>} grid
   * @param {string} bgColor - 空白格背景色
   * @returns {HTMLCanvasElement}
   */
  static exportHighRes(grid, gridW, gridH, bgColor = '#f0f0f0') {
    const SCALE = 10
    const canvas = document.createElement('canvas')
    canvas.width = gridW * SCALE
    canvas.height = gridH * SCALE
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    // 填充背景
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let r = 0; r < gridH; r++) {
      const row = grid[r]
      if (!row) continue
      for (let c = 0; c < gridW; c++) {
        const cell = row[c]
        ctx.fillStyle = (cell && cell.hex) ? cell.hex : bgColor
        ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE)
      }
    }

    return canvas
  }

  /**
   * 从 canvas 像素数据还原为 grid 数组（用于 OCR/像素还原）
   * 不拉伸原图，提取精确的像素网格
   */
  static extractGrid(sourceCanvas, targetW, targetH) {
    const srcW = sourceCanvas.width
    const srcH = sourceCanvas.height
    const srcCtx = sourceCanvas.getContext('2d')
    const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data

    const grid = []
    // 不拉伸：直接从源图像素映射（如果尺寸不匹配则裁剪）
    const cellW = Math.max(1, Math.floor(srcW / targetW))
    const cellH = Math.max(1, Math.floor(srcH / targetH))

    for (let r = 0; r < targetH; r++) {
      const row = []
      for (let c = 0; c < targetW; c++) {
        // 采样该格子的中心像素颜色
        const sx = Math.min(srcW - 1, c * cellW + Math.floor(cellW / 2))
        const sy = Math.min(srcH - 1, r * cellH + Math.floor(cellH / 2))
        const idx = (sy * srcW + sx) * 4
        const red = srcData[idx]
        const green = srcData[idx + 1]
        const blue = srcData[idx + 2]
        const alpha = srcData[idx + 3]
        if (alpha < 128) {
          row.push(null)
        } else {
          const hex = '#' + [red, green, blue].map(v =>
            v.toString(16).padStart(2, '0').toUpperCase()
          ).join('')
          row.push({ r: red, g: green, b: blue, hex })
        }
      }
      grid.push(row)
    }
    return grid
  }
}
