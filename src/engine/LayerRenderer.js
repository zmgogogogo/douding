/**
 * 图层渲染器 — 管理单个图层的 WebGL 纹理渲染
 *
 * 核心设计：
 * - 每个图层 = 一张离屏 Canvas → PixiJS Sprite → GPU 纹理
 * - 像素变更时重新绘制 Canvas → 上传纹理（未来优化为脏矩形局部更新）
 * - 纹理使用 nearest 缩放（像素艺术无模糊）
 * - 支持可见性、不透明度、混合模式
 */

import { Container, Sprite, Texture } from 'pixi.js'

export class LayerRenderer {
  /** @type {Container} PixiJS 容器 */
  container = new Container()

  /** @type {Sprite} 像素精灵 */
  #sprite = null

  /** @type {HTMLCanvasElement} 离屏 Canvas（用于绘制像素） */
  #canvas = null

  /** @type {CanvasRenderingContext2D} */
  #ctx = null

  /** @type {number} 画布宽度（格子数） */
  #w = 0

  /** @type {number} 画布高度（格子数） */
  #h = 0

  /**
   * @param {LayerData} layerData — 初始图层数据
   * @param {{visible?:boolean, opacity?:number, blendMode?:string}} [opts]
   */
  constructor(layerData, opts = {}) {
    this.#w = layerData.width
    this.#h = layerData.height

    // 创建离屏 Canvas（每个格子 1 像素，不缩放 — 由父容器的 scale 统一控制）
    this.#canvas = document.createElement('canvas')
    this.#canvas.width = this.#w
    this.#canvas.height = this.#h
    this.#ctx = this.#canvas.getContext('2d', { willReadFrequently: false })

    // 创建 Sprite
    this.#sprite = new Sprite()
    this.#sprite.label = 'layer-pixels'

    this.container.addChild(this.#sprite)

    // 设置初始状态
    this.container.visible = opts.visible !== false
    this.container.alpha = opts.opacity ?? 1.0
  }

  // ==================== 纹理更新 ====================

  /**
   * 完整更新纹理（从 LayerData + ColorTable 重新绘制全部像素）
   * @param {LayerData} layerData
   * @param {ColorTable} colorTable
   */
  updateTexture(layerData, colorTable) {
    this.#w = layerData.width
    this.#h = layerData.height

    // 调整 Canvas 尺寸
    if (this.#canvas.width !== this.#w || this.#canvas.height !== this.#h) {
      this.#canvas.width = this.#w
      this.#canvas.height = this.#h
    }

    // 按颜色合批绘制
    const { data, width } = layerData
    const ctx = this.#ctx

    // 先绘制背景（空格子 = 透明）
    ctx.clearRect(0, 0, this.#w, this.#h)

    // 按颜色索引分组，记录每组的所有坐标
    // 使用 Map<index, Array<{x,y}>>
    const batches = new Map()

    for (let y = 0; y < this.#h; y++) {
      for (let x = 0; x < this.#w; x++) {
        const idx = data[y * width + x]
        if (idx === 0) continue
        if (!batches.has(idx)) batches.set(idx, [])
        batches.get(idx).push({ x, y })
      }
    }

    // 逐批 fillRect
    for (const [idx, cells] of batches) {
      const hex = colorTable.getHex(idx)
      if (!hex) continue
      ctx.fillStyle = hex
      for (const { x, y } of cells) {
        ctx.fillRect(x, y, 1, 1)
      }
    }

    // 上传到 GPU 纹理
    this._uploadTexture()
  }

  /**
   * 局部更新纹理（脏矩形）
   * @param {LayerData} layerData
   * @param {ColorTable} colorTable
   * @param {{x:number, y:number, w:number, h:number}} dirtyRect — 格子坐标
   */
  updateTexturePartial(layerData, colorTable, dirtyRect) {
    const ctx = this.#ctx
    const { data, width } = layerData

    // 清空脏区域
    ctx.clearRect(dirtyRect.x, dirtyRect.y, dirtyRect.w, dirtyRect.h)

    // 重绘脏区域内所有非空格子
    const batches = new Map()
    const endX = dirtyRect.x + dirtyRect.w
    const endY = dirtyRect.y + dirtyRect.h

    for (let y = dirtyRect.y; y < endY && y < this.#h; y++) {
      for (let x = dirtyRect.x; x < endX && x < this.#w; x++) {
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
        ctx.fillRect(x, y, 1, 1)
      }
    }

    this._uploadTexture()
  }

  /** 将离屏 Canvas 上传到 GPU 纹理 */
  _uploadTexture() {
    // 销毁旧纹理
    if (this.#sprite.texture) {
      this.#sprite.texture.destroy(true)
    }

    // 从 Canvas 创建新纹理
    const texture = Texture.from(this.#canvas, {
      scaleMode: 'nearest', // 像素艺术关键 — 无模糊
      mipmap: false, // 像素艺术不需要 mipmap
    })

    this.#sprite.texture = texture
  }

  // ==================== 属性设置 ====================

  /** @param {boolean} v */
  setVisible(v) {
    this.container.visible = v
  }

  /** @param {number} v 0-1 */
  setOpacity(v) {
    this.container.alpha = v
  }

  /**
   * 设置混合模式（16 种）
   * @param {string} mode — 'normal'|'multiply'|'screen'|'overlay'|'darken'|'lighten'
   *                       |'color-dodge'|'color-burn'|'hard-light'|'soft-light'
   *                       |'difference'|'exclusion'|'hue'|'saturation'|'color'|'luminosity'
   */
  setBlendMode(mode) {
    this.#sprite.blendMode = mode
  }

  /** 获取图层宽高 */
  get size() {
    return { w: this.#w, h: this.#h }
  }

  // ==================== 销毁 ====================

  destroy() {
    if (this.#sprite.texture) {
      this.#sprite.texture.destroy(true)
    }
    this.container.removeFromParent()
    this.container.destroy({ children: true })
    this.#canvas = null
    this.#ctx = null
  }
}
