/**
 * 交互层 — 最上层的辅助显示
 *
 * 包含：
 * - 十字定位线：鼠标悬停时显示，贯穿整行整列
 * - 选区蚂蚁线：流动虚线标识选区范围
 * - 对称轴线：对称绘制时的辅助线
 * - 画笔预览：当前笔刷大小的预览框
 */

import { Container, Graphics } from 'pixi.js'

export class InteractionLayer {
  /** @type {Container} */
  container = new Container()

  /** @type {Graphics} */
  #g = null

  /** @type {{x:number, y:number}|null} */
  #mouseCell = null

  /** @type {{x:number, y:number, w:number, h:number}|null} */
  #selectionRect = null

  /** @type {'none'|'h'|'v'|'quad'} */
  #symmetryMode = 'none'

  /** @type {{x:number, y:number}|null} */
  #symmetryCenter = null

  /** @type {number} 对称轴 X（垂直对称时） */
  #symmetryAxisX = 0

  /** @type {number} 对称轴 Y（水平对称时） */
  #symmetryAxisY = 0

  /** @type {number} */
  #brushSize = 1

  /** @type {{x:number, y:number}|null} */
  #brushPos = null

  constructor(parent) {
    this.container.label = 'interaction'
    this.#g = new Graphics()
    this.container.addChild(this.#g)
  }

  // ==================== 十字定位线 ====================

  /**
   * 设置鼠标悬停位置
   * @param {number} x 格子列
   * @param {number} y 格子行
   * @param {number} maxW 画布最大宽度
   * @param {number} maxH 画布最大高度
   */
  setMouseCell(x, y, maxW, maxH) {
    this.#mouseCell = { x, y, maxW, maxH }
    this._redraw()
  }

  clearMouseCell() {
    this.#mouseCell = null
    this._redraw()
  }

  // ==================== 选区 ====================

  /**
   * 设置选区矩形
   * @param {{x:number, y:number, w:number, h:number}|null} rect — null = 清除
   */
  setSelection(rect) {
    this.#selectionRect = rect
    this._redraw()
  }

  // ==================== 对称轴 ====================

  /**
   * 设置对称模式
   * @param {'none'|'h'|'v'|'quad'} mode
   * @param {{x:number, y:number}} center — 对称中心点
   * @param {number} axisX — 垂直对称轴 X
   * @param {number} axisY — 水平对称轴 Y
   */
  setSymmetry(mode, center, axisX, axisY) {
    this.#symmetryMode = mode
    this.#symmetryCenter = center
    this.#symmetryAxisX = axisX
    this.#symmetryAxisY = axisY
    this._redraw()
  }

  clearSymmetry() {
    this.#symmetryMode = 'none'
    this.#symmetryCenter = null
    this._redraw()
  }

  // ==================== 画笔预览 ====================

  /**
   * 设置画笔预览位置
   * @param {number} x
   * @param {number} y
   * @param {number} size
   */
  setBrushPreview(x, y, size) {
    this.#brushPos = { x, y }
    this.#brushSize = size
    this._redraw()
  }

  clearBrushPreview() {
    this.#brushPos = null
    this._redraw()
  }

  // ==================== 绘制 ====================

  _redraw() {
    const g = this.#g
    g.clear()

    // 十字定位线
    if (this.#mouseCell) {
      const { x, y, maxW, maxH } = this.#mouseCell
      g.setStrokeStyle({ width: 0.5, color: 0x444444, alpha: 0.6 })

      // 横线
      g.moveTo(0, y + 0.5)
      g.lineTo(maxW, y + 0.5)
      // 竖线
      g.moveTo(x + 0.5, 0)
      g.lineTo(x + 0.5, maxH)
      g.stroke()

      // 高亮格子
      g.setStrokeStyle({ width: 1.0, color: 0x0058bc, alpha: 0.8 })
      g.rect(x, y, 1, 1)
      g.stroke()
    }

    // 选区蚂蚁线
    if (this.#selectionRect) {
      const { x, y, w, h } = this.#selectionRect
      g.setStrokeStyle({ width: 1.0, color: 0x0058bc, alpha: 0.9 })
      g.rect(x, y, w, h)
      g.stroke()
    }

    // 对称轴线
    if (this.#symmetryMode !== 'none' && this.#symmetryCenter) {
      g.setStrokeStyle({ width: 0.5, color: 0xff6600, alpha: 0.5 })

      if (this.#symmetryMode === 'h' || this.#symmetryMode === 'quad') {
        // 水平对称轴
        g.moveTo(0, this.#symmetryAxisY + 0.5)
        g.lineTo(9999, this.#symmetryAxisY + 0.5)
      }
      if (this.#symmetryMode === 'v' || this.#symmetryMode === 'quad') {
        // 垂直对称轴
        g.moveTo(this.#symmetryAxisX + 0.5, 0)
        g.lineTo(this.#symmetryAxisX + 0.5, 9999)
      }
      g.stroke()
    }

    // 画笔预览方框
    if (this.#brushPos && this.#brushSize > 1) {
      const half = Math.floor(this.#brushSize / 2)
      const x = this.#brushPos.x - half
      const y = this.#brushPos.y - half
      g.setStrokeStyle({ width: 0.8, color: 0x0058bc, alpha: 0.7 })
      g.rect(x, y, this.#brushSize, this.#brushSize)
      g.stroke()
    }

    // 远程协作光标
    for (const cursor of this.#remoteCursors) {
      const { r, c, nickname, color } = cursor
      const hex = parseInt(color.replace('#', ''), 16)

      // 光标十字
      g.setStrokeStyle({ width: 0.8, color: hex, alpha: 0.9 })
      g.rect(c, r, 1, 1)
      g.stroke()

      // 用户名标签背景
      const labelW = nickname.length * 6 + 10
      g.setFillStyle({ color: hex, alpha: 0.85 })
      g.roundRect(c + 2, r - 2, labelW, 10, 3)
      g.fill()

      // 标签文字（PixiJS Graphics 不支持文字，这里用矩形示意）
      g.setFillStyle({ color: 0xffffff, alpha: 1 })
      g.roundRect(c + 4, r, labelW - 8, 6, 2)
      g.fill()
    }

    // 评论标记
    for (const marker of this.#commentMarkers) {
      const hex = parseInt(marker.color?.replace('#', '') || 'ff6600', 16)
      g.setFillStyle({ color: hex, alpha: 0.9 })
      g.circle(marker.c + 0.5, marker.r + 0.5, 3)
      g.fill()
      g.setStrokeStyle({ width: 0.5, color: 0xffffff, alpha: 0.8 })
      g.circle(marker.c + 0.5, marker.r + 0.5, 3)
      g.stroke()
    }
  }

  // ==================== 协作光标 ====================

  /** @type {Array<{r:number, c:number, nickname:string, color:string}>} */
  #remoteCursors = []

  /**
   * 更新远程光标列表
   * @param {Array<{r:number, c:number, nickname:string, color:string}>} cursors
   */
  setRemoteCursors(cursors) {
    this.#remoteCursors = cursors
    this._redraw()
  }

  // ==================== 评论标记 ====================

  /** @type {Array<{id:string, r:number, c:number, text:string, color:string}>} */
  #commentMarkers = []

  setCommentMarkers(markers) {
    this.#commentMarkers = markers
    this._redraw()
  }

  // ==================== 清除 ====================

  clear() {
    this.#mouseCell = null
    this.#selectionRect = null
    this.#symmetryMode = 'none'
    this.#symmetryCenter = null
    this.#brushPos = null
    this.#g.clear()
  }

  destroy() {
    this.container.removeFromParent()
    this.container.destroy({ children: true })
  }
}
