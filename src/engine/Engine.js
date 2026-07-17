/**
 * 拼豆渲染引擎 — 基于 PixiJS v8 的 WebGL 2.0 渲染管线
 *
 * 核心职责：
 * - 初始化 PixiJS Application（WebGL 优先，自动降级 Canvas 2D）
 * - 管理四层渲染体系（全局网格层→内容图层组→参考图层→交互层）
 * - 提供视口控制（缩放/平移，GPU 矩阵变换）
 * - 调度脏矩形局部重绘
 *
 * 分层结构（从底到顶）：
 *   globalGridContainer  → 全局坐标网格
 *   layersContainer      → 内容图层组（多层叠加，按 blendMode 混合）
 *   refOverlayContainer  → 参考图叠加层
 *   interactionContainer → 十字线/选区/对称轴/协作光标
 */

import { Application, Container } from 'pixi.js'
import { LayerRenderer } from './LayerRenderer.js'
import { GridRenderer } from './GridRenderer.js'
import { RefOverlay } from './RefOverlay.js'
import { InteractionLayer } from './InteractionLayer.js'

export class Engine {
  /** @type {Application} PixiJS 应用 */
  app = null

  /** @type {HTMLElement} 挂载容器 DOM */
  #containerEl = null

  /** @type {Container} 全局网格层 */
  #globalGridContainer = new Container()

  /** @type {Container} 内容图层组 */
  #layersContainer = new Container()

  /** @type {Container} 参考图叠加层 */
  #refOverlayContainer = new Container()

  /** @type {Container} 交互层 */
  #interactionContainer = new Container()

  /** @type {Map<string, LayerRenderer>} layerId → 图层渲染器 */
  #layerRenderers = new Map()

  /** @type {GridRenderer} */
  #gridRenderer = null

  /** @type {RefOverlay} */
  #refOverlay = null

  /** @type {InteractionLayer} */
  #interaction = null

  /** @type {number} 画布宽度（格子数） */
  #gridW = 50

  /** @type {number} 画布高度（格子数） */
  #gridH = 50

  /** @type {number} 当前缩放 */
  #zoom = 10

  /** @type {number} 横向平移（像素） */
  #panX = 0

  /** @type {number} 纵向平移（像素） */
  #panY = 0

  /** @type {string|null} 画布背景色 */
  #bgColor = '#e8eaed'

  /** @type {boolean} 是否使用 WebGL */
  #isWebGL = true

  // ==================== 初始化 ====================

  /**
   * 初始化引擎
   * @param {HTMLElement} containerEl — 画布容器 DOM 元素
   * @param {{ width?: number, height?: number, bgColor?: string }} [opts]
   * @returns {Promise<boolean>} true = WebGL 就绪，false = 降级 Canvas 2D
   */
  async init(containerEl, opts = {}) {
    this.#containerEl = containerEl
    this.#bgColor = opts.bgColor || '#e8eaed'

    try {
      this.app = new Application()
      await this.app.init({
        background: this.#bgColor,
        antialias: false,           // 像素艺术不需要抗锯齿
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        // PixiJS v8 自动检测 WebGL/WebGPU 支持，不支持时降级 Canvas 2D
        preference: 'webgl',
      })

      this.#isWebGL = this.app.renderer.type === 1 // 1 = WebGL

      // 设置容器样式
      this.app.canvas.style.width = '100%'
      this.app.canvas.style.height = '100%'
      this.app.canvas.style.display = 'block'
      this.app.canvas.style.imageRendering = 'pixelated'

      containerEl.appendChild(this.app.canvas)

      console.log(`[Engine] 初始化完成 — ${this.#isWebGL ? 'WebGL' : 'Canvas2D'} 模式`)
    } catch (e) {
      console.warn('[Engine] PixiJS 初始化失败，将使用 Canvas 2D 降级', e)
      this.#isWebGL = false
      return false
    }

    // 构建四层容器
    this.app.stage.addChild(this.#globalGridContainer)
    this.app.stage.addChild(this.#layersContainer)
    this.app.stage.addChild(this.#refOverlayContainer)
    this.app.stage.addChild(this.#interactionContainer)

    // 初始化子渲染器
    this.#gridRenderer = new GridRenderer(this.#globalGridContainer)
    this.#refOverlay = new RefOverlay(this.#refOverlayContainer)
    this.#interaction = new InteractionLayer(this.#interactionContainer)

    // 首帧渲染
    this.renderAll()

    return this.#isWebGL
  }

  // ==================== 画布尺寸 ====================

  /**
   * 设置画布逻辑尺寸（格子数）并调整渲染器
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.#gridW = w
    this.#gridH = h

    if (this.app) {
      this.app.renderer.resize(
        this.#containerEl.clientWidth,
        this.#containerEl.clientHeight
      )
    }

    this.#gridRenderer?.updateGrid(w, h, this.#zoom, this.#panX, this.#panY)
  }

  // ==================== 图层管理 ====================

  /**
   * 创建图层渲染器
   * @param {string} layerId
   * @param {LayerData} layerData
   * @param {{visible?:boolean, opacity?:number, blendMode?:string}} [opts]
   */
  addLayer(layerId, layerData, opts = {}) {
    const renderer = new LayerRenderer(layerData, opts)
    this.#layersContainer.addChild(renderer.container)
    this.#layerRenderers.set(layerId, renderer)
    this._updateLayerOrder()
  }

  /**
   * 移除图层渲染器
   * @param {string} layerId
   */
  removeLayer(layerId) {
    const renderer = this.#layerRenderers.get(layerId)
    if (renderer) {
      this.#layersContainer.removeChild(renderer.container)
      renderer.destroy()
      this.#layerRenderers.delete(layerId)
    }
  }

  /**
   * 更新图层像素数据（脏标记，触发纹理更新）
   * @param {string} layerId
   * @param {LayerData} layerData
   * @param {ColorTable} colorTable
   */
  updateLayerData(layerId, layerData, colorTable) {
    const renderer = this.#layerRenderers.get(layerId)
    if (renderer) {
      renderer.updateTexture(layerData, colorTable)
    }
  }

  /**
   * 设置图层可见性
   * @param {string} layerId
   * @param {boolean} visible
   */
  setLayerVisible(layerId, visible) {
    const renderer = this.#layerRenderers.get(layerId)
    if (renderer) renderer.setVisible(visible)
  }

  /**
   * 设置图层不透明度
   * @param {string} layerId
   * @param {number} opacity 0-1
   */
  setLayerOpacity(layerId, opacity) {
    const renderer = this.#layerRenderers.get(layerId)
    if (renderer) renderer.setOpacity(opacity)
  }

  /**
   * 设置图层混合模式
   * @param {string} layerId
   * @param {string} mode — PixiJS blendMode 名称
   */
  setLayerBlendMode(layerId, mode) {
    const renderer = this.#layerRenderers.get(layerId)
    if (renderer) renderer.setBlendMode(mode)
  }

  /** 按图层面板顺序更新渲染层级 */
  _updateLayerOrder() {
    // children 顺序 = 渲染顺序（先添加的在底层）
    // 不需要额外排序，addChild 和 removeChild 已维护
  }

  // ==================== 视口控制 ====================

  /**
   * 设置视口变换（缩放 + 平移）
   * 对所有内容层应用统一的矩阵变换
   * @param {number} zoom
   * @param {number} panX — CSS 像素偏移
   * @param {number} panY
   */
  setViewport(zoom, panX, panY) {
    this.#zoom = zoom
    this.#panX = panX
    this.#panY = panY

    const containerW = this.#containerEl.clientWidth
    const containerH = this.#containerEl.clientHeight

    // 计算画布左上角在容器中的位置（居中 + 平移偏移）
    const canvasLeft = (containerW - this.#gridW * zoom) / 2 + panX
    const canvasTop = (containerH - this.#gridH * zoom) / 2 + panY

    // 应用变换到内容层（网格层、图层组、参考图层、交互层）
    const setTransform = (container) => {
      container.x = canvasLeft
      container.y = canvasTop
      container.scale.set(zoom)
    }
    setTransform(this.#globalGridContainer)
    setTransform(this.#layersContainer)
    setTransform(this.#refOverlayContainer)
    setTransform(this.#interactionContainer)
  }

  // ==================== 参考图 ====================

  /**
   * 设置参考图数据
   * @param {ImageData|null} imageData
   * @param {number} w
   * @param {number} h
   * @param {number} opacity 0-1
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {number} scale
   */
  setRefOverlay(imageData, w, h, opacity, offsetX, offsetY, scale) {
    this.#refOverlay?.setData(imageData, w, h, opacity, offsetX, offsetY, scale)
  }

  // ==================== 交互层 ====================

  get interaction() { return this.#interaction }

  // ==================== 渲染 ====================

  /**
   * 全量渲染所有层
   */
  renderAll() {
    this.#layersContainer.children.forEach(child => {
      if (child instanceof LayerRenderer) child.render()
    })
    this.#gridRenderer?.render(this.#gridW, this.#gridH, this.#zoom)
  }

  /**
   * 脏矩形局部重绘（仅重绘指定区域）
   * @param {{x:number, y:number, w:number, h:number}} rect — 格子坐标
   */
  renderDirty(rect) {
    // TODO: 阶段 0.2 实现脏矩形合并和批量重绘
    this.renderAll()
  }

  // ==================== 降级 ====================

  /** 是否使用 WebGL */
  get isWebGL() { return this.#isWebGL }

  /** 获取画布尺寸 */
  get gridSize() { return { w: this.#gridW, h: this.#gridH } }

  /** 获取当前缩放 */
  get zoom() { return this.#zoom }

  // ==================== 销毁 ====================

  destroy() {
    this.#layerRenderers.forEach(r => r.destroy())
    this.#layerRenderers.clear()
    this.#gridRenderer?.destroy()
    this.#refOverlay?.destroy()
    this.#interaction?.destroy()

    if (this.app) {
      this.app.destroy(true, { children: true })
      this.app = null
    }
  }
}
