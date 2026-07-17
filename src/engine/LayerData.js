/**
 * 图层像素数据 — Uint8Array 颜色索引矩阵
 *
 * 核心设计：
 * - 每个单元格 = 1 字节颜色索引（0 = 空格，1-254 = ColorTable 颜色）
 * - 支持按坐标读写、区域操作、序列化/RLE 压缩
 * - 与图层元数据（name/visible/opacity/blendMode）分离，此处仅管像素
 */

export class LayerData {
  /** @type {number} */
  width
  /** @type {number} */
  height
  /** @type {Uint8Array} 颜色索引，长度 = width * height */
  data

  /**
   * @param {number} width
   * @param {number} height
   * @param {Uint8Array} [data] — 可选，复用已有数据
   */
  constructor(width, height, data) {
    this.width = width
    this.height = height
    this.data = data || new Uint8Array(width * height)
  }

  // ==================== 基本读写 ====================

  /**
   * 获取格子索引
   * @param {number} x 列
   * @param {number} y 行
   * @returns {number} 0-255
   */
  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0
    return this.data[y * this.width + x]
  }

  /**
   * 设置格子索引
   * @param {number} x 列
   * @param {number} y 行
   * @param {number} index 颜色索引
   */
  set(x, y, index) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    this.data[y * this.width + x] = index & 0xFF
  }

  /**
   * 填充整个图层
   * @param {number} index 颜色索引，0 = 清空
   */
  fill(index) {
    this.data.fill(index & 0xFF)
  }

  // ==================== 区域操作 ====================

  /**
   * 复制矩形区域数据
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {LayerData} 新图层数据
   */
  copyRegion(x, y, w, h) {
    const result = new LayerData(w, h)
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        result.set(dx, dy, this.get(x + dx, y + dy))
      }
    }
    return result
  }

  /**
   * 粘贴数据到指定位置
   * @param {LayerData} source
   * @param {number} targetX
   * @param {number} targetY
   */
  paste(source, targetX, targetY) {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const val = source.get(x, y)
        if (val !== 0) {
          this.set(targetX + x, targetY + y, val)
        }
      }
    }
  }

  /**
   * 水平翻转区域
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [w=this.width]
   * @param {number} [h=this.height]
   */
  flipH(x = 0, y = 0, w = this.width, h = this.height) {
    const halfW = Math.floor(w / 2)
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < halfW; dx++) {
        const left = this.get(x + dx, y + dy)
        const right = this.get(x + w - 1 - dx, y + dy)
        this.set(x + dx, y + dy, right)
        this.set(x + w - 1 - dx, y + dy, left)
      }
    }
  }

  /**
   * 垂直翻转区域
   */
  flipV(x = 0, y = 0, w = this.width, h = this.height) {
    const halfH = Math.floor(h / 2)
    for (let dy = 0; dy < halfH; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const top = this.get(x + dx, y + dy)
        const bottom = this.get(x + dx, y + h - 1 - dy)
        this.set(x + dx, y + dy, bottom)
        this.set(x + dx, y + h - 1 - dy, top)
      }
    }
  }

  // ==================== 尺寸变换 ====================

  /**
   * 调整图层尺寸（裁剪/扩展）
   * @param {number} newW
   * @param {number} newH
   * @param {number} [offsetX=0] 旧内容在新画布中的偏移
   * @param {number} [offsetY=0]
   * @param {number} [fillIndex=0] 新增区域的填充色
   */
  resize(newW, newH, offsetX = 0, offsetY = 0, fillIndex = 0) {
    const newData = new Uint8Array(newW * newH)
    newData.fill(fillIndex)

    // 拷贝旧数据到新位置
    for (let y = 0; y < this.height; y++) {
      const newY = y + offsetY
      if (newY < 0 || newY >= newH) continue
      for (let x = 0; x < this.width; x++) {
        const newX = x + offsetX
        if (newX < 0 || newX >= newW) continue
        newData[newY * newW + newX] = this.data[y * this.width + x]
      }
    }

    this.width = newW
    this.height = newH
    this.data = newData
  }

  /**
   * 裁剪到内容边界 + 边距
   * @param {number} padding
   * @returns {{x:number, y:number, w:number, h:number}} 裁剪后的包围盒
   */
  autoFit(padding = 4) {
    let minX = this.width, minY = this.height, maxX = -1, maxY = -1

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.data[y * this.width + x] !== 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    // 全空格子
    if (maxX === -1) return { x: 0, y: 0, w: 1, h: 1 }

    // 加边距
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(this.width - 1, maxX + padding)
    maxY = Math.min(this.height - 1, maxY + padding)

    const newW = maxX - minX + 1
    const newH = maxY - minY + 1
    const newData = new Uint8Array(newW * newH)

    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        newData[y * newW + x] = this.data[(y + minY) * this.width + (x + minX)]
      }
    }

    this.width = newW
    this.height = newH
    this.data = newData

    return { x: minX, y: minY, w: newW, h: newH }
  }

  // ==================== 克隆与比较 ====================

  /** 深拷贝 */
  clone() {
    return new LayerData(this.width, this.height, new Uint8Array(this.data))
  }

  /** 比较两个图层数据是否相等 */
  equals(other) {
    if (this.width !== other.width || this.height !== other.height) return false
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== other.data[i]) return false
    }
    return true
  }

  // ==================== 迭代 ====================

  /** 遍历所有非空格子 */
  *nonEmpty() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = this.data[y * this.width + x]
        if (idx !== 0) yield { x, y, index: idx }
      }
    }
  }

  /** 非空格子数 */
  get beadCount() {
    let count = 0
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== 0) count++
    }
    return count
  }

  // ==================== 序列化 ====================

  /**
   * RLE（游程编码）压缩
   * 格式：[value, count, value, count, ...]
   * 适用于大面积同色的拼豆图纸
   * @returns {number[]}
   */
  toRLE() {
    const runs = []
    let prev = this.data[0]
    let count = 1
    for (let i = 1; i < this.data.length; i++) {
      if (this.data[i] === prev && count < 65535) {
        count++
      } else {
        runs.push(prev, count)
        prev = this.data[i]
        count = 1
      }
    }
    runs.push(prev, count)
    return runs
  }

  /**
   * 从 RLE 数据恢复
   * @param {number[]} runs
   * @param {number} width
   * @param {number} height
   * @returns {LayerData}
   */
  static fromRLE(runs, width, height) {
    const data = new Uint8Array(width * height)
    let i = 0
    for (let r = 0; r < runs.length; r += 2) {
      const val = runs[r]
      const count = runs[r + 1]
      data.fill(val, i, i + count)
      i += count
    }
    return new LayerData(width, height, data)
  }
}
