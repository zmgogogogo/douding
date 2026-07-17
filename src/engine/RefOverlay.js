/**
 * 参考图叠加层 — 半透明像素图层
 *
 * 支持：
 * - 从 ImageData 渲染为 Sprite
 * - 透明度调节
 * - 缩放/平移偏移（独立于内容图层）
 */

import { Container, Sprite, Texture } from 'pixi.js'

export class RefOverlay {
  /** @type {Container} */
  container = new Container()

  /** @type {Sprite|null} */
  #sprite = null

  /** @type {HTMLCanvasElement|null} */
  #canvas = null

  /** @type {number} */
  #opacity = 0.5

  /** @type {number} */
  #offsetX = 0

  /** @type {number} */
  #offsetY = 0

  /** @type {number} */
  #scale = 1

  constructor(parent) {
    this.container.label = 'ref-overlay'
    parent.addChild(this.container)
  }

  /**
   * 设置参考图数据
   * @param {ImageData|null} imageData — null = 清除参考图
   * @param {number} w — 原始宽度
   * @param {number} h — 原始高度
   * @param {number} opacity 0-1
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {number} scale
   */
  setData(imageData, w, h, opacity, offsetX, offsetY, scale) {
    this.#opacity = opacity
    this.#offsetX = offsetX
    this.#offsetY = offsetY
    this.#scale = scale
    this.container.alpha = opacity

    // 清除旧 Sprite
    if (this.#sprite) {
      this.#sprite.texture?.destroy(true)
      this.container.removeChild(this.#sprite)
      this.#sprite = null
    }

    if (!imageData) return

    // 创建离屏 Canvas 绘制参考图
    if (!this.#canvas || this.#canvas.width !== w || this.#canvas.height !== h) {
      this.#canvas = document.createElement('canvas')
      this.#canvas.width = w
      this.#canvas.height = h
    }

    const ctx = this.#canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)

    const texture = Texture.from(this.#canvas, {
      scaleMode: 'nearest',
      mipmap: false,
    })

    this.#sprite = new Sprite(texture)
    this.#sprite.label = 'ref-image'

    // 应用偏移和缩放
    this.#sprite.x = offsetX
    this.#sprite.y = offsetY
    this.#sprite.scale.set(scale)

    this.container.addChild(this.#sprite)
  }

  /**
   * 更新透明度
   * @param {number} v 0-1
   */
  setOpacity(v) {
    this.#opacity = v
    this.container.alpha = v
  }

  /**
   * 更新偏移
   */
  setOffset(x, y) {
    this.#offsetX = x
    this.#offsetY = y
    if (this.#sprite) {
      this.#sprite.x = x
      this.#sprite.y = y
    }
  }

  /**
   * 更新缩放
   */
  setScale(s) {
    this.#scale = s
    if (this.#sprite) {
      this.#sprite.scale.set(s)
    }
  }

  /** @param {boolean} v */
  setVisible(v) { this.container.visible = v }

  destroy() {
    if (this.#sprite?.texture) {
      this.#sprite.texture.destroy(true)
    }
    this.container.removeFromParent()
    this.container.destroy({ children: true })
    this.#canvas = null
  }
}
