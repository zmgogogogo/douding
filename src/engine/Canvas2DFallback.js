/**
 * Canvas 2D 降级渲染器 — 当 WebGL 不可用时使用
 *
 * 核心设计：
 * - 复用现有 CanvasRenderer 的核心逻辑（1:1 像素渲染）
 * - 提供与 Engine 兼容的 API 接口
 * - 不支持混合模式/图层样式等 WebGL 特性
 */

export class Canvas2DFallback {
  /** @type {HTMLCanvasElement} */
  canvas = null

  /** @type {CanvasRenderingContext2D} */
  #ctx = null

  /** @type {number} */
  #w = 50

  /** @type {number} */
  #h = 50

  /** @type {number} */
  #zoom = 10

  /** @type {number} */
  #panX = 0

  /** @type {number} */
  #panY = 0

  /** @type {HTMLElement} */
  #containerEl = null

  /** 所有图层的像素数据缓存 */
  #layers = new Map()

  /** @type {boolean} */
  #showGrid = true

  /**
   * 初始化
   * @param {HTMLElement} containerEl
   * @param {{bgColor?:string}} [opts]
   */
  init(containerEl, opts = {}) {
    this.#containerEl = containerEl

    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'
    this.canvas.style.imageRendering = 'pixelated'

    this.#ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    containerEl.appendChild(this.canvas)

    this._resizeCanvas()
    return true
  }

  /** 调整 Canvas 物理像素以匹配容器 */
  _resizeCanvas() {
    const rect = this.#containerEl.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
  }

  // ==================== 图层管理 ====================

  addLayer(layerId, layerData, opts = {}) {
    this.#layers.set(layerId, {
      data: layerData.clone(),
      visible: opts.visible !== false,
      opacity: opts.opacity ?? 1.0,
    })
  }

  removeLayer(layerId) {
    this.#layers.delete(layerId)
  }

  updateLayerData(layerId, layerData, colorTable) {
    const entry = this.#layers.get(layerId)
    if (entry) {
      entry.data = layerData.clone()
    }
  }

  setLayerVisible(layerId, visible) {
    const entry = this.#layers.get(layerId)
    if (entry) entry.visible = visible
  }

  setLayerOpacity(layerId, opacity) {
    const entry = this.#layers.get(layerId)
    if (entry) entry.opacity = opacity
  }

  setLayerBlendMode(layerId, mode) {
    // Canvas 2D 降级不支持混合模式，静默忽略
  }

  // ==================== 视口控制 ====================

  setViewport(zoom, panX, panY) {
    this.#zoom = zoom
    this.#panX = panX
    this.#panY = panY
  }

  // ==================== 渲染 ====================

  /**
   * 渲染所有图层到 Canvas
   * @param {ColorTable} colorTable
   * @param {{showGrid?:boolean, refData?:{imageData:ImageData,opacity:number,offsetX:number,offsetY:number,scale:number}}} [opts]
   */
  renderAll(colorTable, opts = {}) {
    const ctx = this.#ctx
    const dpr = window.devicePixelRatio || 1

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const containerW = this.#containerEl.clientWidth
    const containerH = this.#containerEl.clientHeight

    // 背景色
    ctx.fillStyle = '#e8eaed'
    ctx.fillRect(0, 0, containerW, containerH)

    // 计算画布左上角位置
    const canvasLeft = (containerW - this.#w * this.#zoom) / 2 + this.#panX
    const canvasTop = (containerH - this.#h * this.#zoom) / 2 + this.#panY

    ctx.save()
    ctx.translate(canvasLeft, canvasTop)

    // 绘制每个图层的珠子（从底到顶 = 从后到前迭代 Map）
    for (const [id, entry] of this.#layers) {
      if (!entry.visible) continue
      ctx.globalAlpha = entry.opacity
      this._renderLayerPixels(ctx, entry.data, colorTable)
    }

    ctx.globalAlpha = 1.0

    // 参考图叠加
    if (opts.refData?.imageData) {
      this._renderRefOverlay(ctx, opts.refData)
    }

    // 网格线
    if (opts.showGrid !== false && this.#showGrid) {
      this._renderGridLines(ctx)
    }

    ctx.restore()
    ctx.restore()
  }

  /** 绘制单层像素 */
  _renderLayerPixels(ctx, layerData, colorTable) {
    const { data, width, height } = layerData
    const z = this.#zoom

    // 按颜色合批
    const batches = new Map()
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = data[y * width + x]
        if (idx === 0) continue
        if (!batches.has(idx)) batches.set(idx, [])
        batches.get(idx).push({ x, y })
      }
    }

    for (const [idx, cells] of batches) {
      const hex = colorTable.getHex(idx)
      if (!hex) continue
      ctx.fillStyle = hex
      for (const { x, y } of cells) {
        ctx.fillRect(x * z, y * z, z, z)
      }
    }
  }

  /** 绘制参考图叠加 */
  _renderRefOverlay(ctx, refData) {
    const { imageData, opacity, offsetX, offsetY, scale } = refData
    ctx.globalAlpha = opacity

    // 将 ImageData 绘制到临时 Canvas，再 drawImage
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = imageData.width
    tmpCanvas.height = imageData.height
    const tmpCtx = tmpCanvas.getContext('2d')
    tmpCtx.putImageData(imageData, 0, 0)

    const z = this.#zoom
    const sx = offsetX * z
    const sy = offsetY * z
    const sw = imageData.width * scale * z
    const sh = imageData.height * scale * z

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmpCanvas, sx, sy, sw, sh)
    ctx.globalAlpha = 1.0
  }

  /** 绘制网格线 */
  _renderGridLines(ctx) {
    const z = this.#zoom
    if (z < 6) return // 太小不画细网格

    const totalW = this.#w * z
    const totalH = this.#h * z

    // 细网格
    ctx.strokeStyle = 'rgba(200, 208, 216, 0.5)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = 0; x <= this.#w; x++) {
      ctx.moveTo(x * z + 0.5, 0)
      ctx.lineTo(x * z + 0.5, totalH)
    }
    for (let y = 0; y <= this.#h; y++) {
      ctx.moveTo(0, y * z + 0.5)
      ctx.lineTo(totalW, y * z + 0.5)
    }
    ctx.stroke()

    // 主网格（每5格）
    ctx.strokeStyle = 'rgba(128, 144, 160, 0.7)'
    ctx.lineWidth = 1.0
    ctx.beginPath()
    for (let x = 0; x <= this.#w; x += 5) {
      ctx.moveTo(x * z, 0)
      ctx.lineTo(x * z, totalH)
    }
    for (let y = 0; y <= this.#h; y += 5) {
      ctx.moveTo(0, y * z)
      ctx.lineTo(totalW, y * z)
    }
    ctx.stroke()

    // 橙色边框
    ctx.strokeStyle = 'rgba(240, 112, 48, 0.8)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, totalW, totalH)
  }

  // ==================== 尺寸 ====================

  resize(w, h) {
    this.#w = w
    this.#h = h
    this._resizeCanvas()
  }

  // ==================== 销毁 ====================

  destroy() {
    this.#layers.clear()
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
    this.canvas = null
    this.#ctx = null
  }
}
