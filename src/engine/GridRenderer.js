/**
 * 全局网格线渲染器 — 使用 PixiJS Graphics 绘制网格
 *
 * 两级网格：
 * - 细网格：1格1线，浅蓝灰色，zoom < 8 时自动隐藏
 * - 主网格：每5格（可配）一条粗线，深蓝色
 * - 橙色边框：标识有效拼豆范围
 */

import { Graphics } from 'pixi.js'

export class GridRenderer {
  /** @type {Graphics} */
  #graphics = null

  /** @type {boolean} */
  #visible = true

  /** @type {number} 主网格间隔（格） */
  #majorInterval = 5

  constructor(parent) {
    this.#graphics = new Graphics()
    this.#graphics.label = 'grid-lines'
    parent.addChild(this.#graphics)
  }

  /**
   * 渲染网格线
   * @param {number} gridW — 格子宽度
   * @param {number} gridH — 格子高度
   * @param {number} zoom — 当前缩放（用于决定细网格是否显示）
   * @param {boolean} [show=true]
   */
  render(gridW, gridH, zoom, show = true) {
    const g = this.#graphics
    g.clear()

    if (!show || !this.#visible) return

    const showMinor = zoom >= 6  // zoom < 6 隐藏细网格，减少视觉噪音

    // 细网格（1格1线，浅蓝灰色）
    if (showMinor) {
      g.setStrokeStyle({
        width: 0.3 / zoom,  // 线宽随 zoom 缩放，保证视觉一致
        color: 0xc8d0d8,
        alpha: 0.5,
      })

      // 竖线
      for (let x = 0; x <= gridW; x++) {
        g.moveTo(x, 0)
        g.lineTo(x, gridH)
      }
      // 横线
      for (let y = 0; y <= gridH; y++) {
        g.moveTo(0, y)
        g.lineTo(gridW, y)
      }
      g.stroke()
    }

    // 主网格（每 majorInterval 格）
    g.setStrokeStyle({
      width: 1.2 / zoom,
      color: 0x8090a0,
      alpha: 0.7,
    })

    for (let x = 0; x <= gridW; x += this.#majorInterval) {
      g.moveTo(x, 0)
      g.lineTo(x, gridH)
    }
    for (let y = 0; y <= gridH; y += this.#majorInterval) {
      g.moveTo(0, y)
      g.lineTo(gridW, y)
    }
    g.stroke()

    // 橙色边框（有效拼豆范围）
    g.setStrokeStyle({
      width: 1.5 / zoom,
      color: 0xf07030,
      alpha: 0.8,
    })
    g.rect(0, 0, gridW, gridH)
    g.stroke()
  }

  /**
   * 更新网格（缩放改变时）
   */
  updateGrid(gridW, gridH, zoom, panX, panY) {
    this.render(gridW, gridH, zoom, this.#visible)
  }

  /** @param {boolean} v */
  setVisible(v) {
    this.#visible = v
    this.#graphics.visible = v
  }

  destroy() {
    this.#graphics.removeFromParent()
    this.#graphics.destroy()
  }
}
