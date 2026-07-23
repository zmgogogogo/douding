/**
 * 颜色表 — 管理颜色索引 ↔ 珠子颜色数据的双向映射
 *
 * 核心设计：
 * - 每个珠子颜色分配唯一索引（1-254），0 = 空格子，255 = 保留
 * - 颜色数据包含 code/name/hex/rgb/brand/series
 * - 支持序列化为 JSON（嵌入 .bean 文件头）和从 beadData 批量构建
 */

export class ColorTable {
  /** @type {Array<{code:string, name:string, hex:string, rgb:[number,number,number], brand:string, series:string}>} */
  #colors = [] // 索引 → 颜色对象（索引 0 为 null 占位，实际颜色从 1 开始）

  /** @type {Map<string, number>} hex → 索引（hex 统一小写无 #） */
  #hexToIndex = new Map()

  /** @type {Map<string, number>} 色号 → 索引 */
  #codeToIndex = new Map()

  // ==================== 构建 ====================

  /**
   * 从珠子数据数组构建颜色表
   * @param {Array<{code:string, name:string, hex:string, brand:string, series:string}>} beadColors
   */
  buildFromBeadData(beadColors) {
    this.#colors = [null] // 索引 0 = 空格
    this.#hexToIndex.clear()
    this.#codeToIndex.clear()

    for (let i = 0; i < beadColors.length && i < 254; i++) {
      const c = beadColors[i]
      this.#colors.push({
        code: c.code,
        name: c.name,
        hex: c.hex,
        rgb: this._hexToRgb(c.hex),
        brand: c.brand,
        series: c.series,
      })
      const idx = i + 1
      this.#hexToIndex.set(this._normalizeHex(c.hex), idx)
      this.#codeToIndex.set(c.code, idx)
    }
  }

  /**
   * 从序列化数据恢复颜色表
   * @param {Array} serialized — ColorTable.serialize() 的输出
   */
  restore(serialized) {
    this.#colors = [null]
    this.#hexToIndex.clear()
    this.#codeToIndex.clear()

    for (let i = 0; i < serialized.length; i++) {
      const c = serialized[i]
      this.#colors.push({ ...c })
      const idx = i + 1
      this.#hexToIndex.set(this._normalizeHex(c.hex), idx)
      this.#codeToIndex.set(c.code, idx)
    }
  }

  // ==================== 查询 ====================

  /** 颜色总数（不含空格） */
  get size() {
    return this.#colors.length - 1
  }

  /** 所有颜色数据（索引 1..n，只读副本） */
  get colors() {
    return this.#colors.slice(1)
  }

  /**
   * 按 hex 查找索引
   * @param {string} hex
   * @returns {number} 索引，未找到返回 0（空格）
   */
  indexOf(hex) {
    return this.#hexToIndex.get(this._normalizeHex(hex)) || 0
  }

  /**
   * 按色号查找索引
   * @param {string} code
   * @returns {number}
   */
  indexOfCode(code) {
    return this.#codeToIndex.get(code) || 0
  }

  /**
   * 获取指定索引的颜色数据
   * @param {number} index
   * @returns {{code:string, name:string, hex:string, rgb:[number,number,number], brand:string, series:string}|null}
   */
  getColor(index) {
    if (index <= 0 || index >= this.#colors.length) return null
    return this.#colors[index]
  }

  /**
   * 获取 hex 字符串（用于 Canvas 渲染）
   * @param {number} index
   * @returns {string|null}
   */
  getHex(index) {
    const c = this.getColor(index)
    return c ? c.hex : null
  }

  /**
   * 查找最近的颜色索引（用于颜色匹配/导入）
   * @param {string} hex
   * @param {Array<{code:string, name:string, hex:string}>} beadData — 完整珠子数据
   * @returns {number} 最近的索引
   */
  findNearestIndex(hex, beadData) {
    const idx = this.indexOf(hex)
    if (idx > 0) return idx

    // 加权欧几里得距离匹配（人眼对绿色更敏感）
    const target = this._hexToRgb(hex)
    let bestIdx = 0
    let bestDist = Infinity

    for (let i = 1; i < this.#colors.length; i++) {
      const [tr, tg, tb] = target
      const [cr, cg, cb] = this.#colors[i].rgb
      const dr = tr - cr,
        dg = tg - cg,
        db = tb - cb
      const dist = dr * dr * 2 + dg * dg * 3 + db * db * 1
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    return bestIdx
  }

  // ==================== 序列化 ====================

  /** 序列化为可 JSON 存储的数组 */
  serialize() {
    return this.#colors.slice(1).map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex,
      brand: c.brand,
      series: c.series,
    }))
  }

  // ==================== 私有工具 ====================

  _normalizeHex(hex) {
    return hex.replace('#', '').toLowerCase()
  }

  _hexToRgb(hex) {
    const h = this._normalizeHex(hex)
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
}
