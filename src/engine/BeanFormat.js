/**
 * .bean 工程文件格式 — 序列化/反序列化
 *
 * 格式结构：
 * ┌─────────────────────────────────────────────────────────┐
 * │ 文件头（魔数 + 版本号 + 校验位）                          │
 * │ 元数据区（JSON）：图纸尺寸、色板信息、图层结构             │
 * │ 图层数据区（二进制）：每个图层的像素矩阵（RLE + DEFLATE）   │
 * │ 资源区（可选）：参考图、图案素材                           │
 * │ 文件尾（校验和）                                         │
 * └─────────────────────────────────────────────────────────┘
 *
 * 序列化输出：JSON（浏览器端，因为浏览器不支持直接写二进制）
 * 二进制输出：Node.js 端使用 Buffer + zlib
 */

import { LayerData } from './LayerData.js'

/** 魔数标识 */
const MAGIC = new Uint8Array([0x42, 0x45, 0x41, 0x4e]) // "BEAN"

/** 当前文件版本 */
const VERSION = 1

export class BeanFormat {
  /**
   * 序列化为 JSON 格式（浏览器端兼容）
   * @param {{
   *   width: number,
   *   height: number,
   *   colorTable: ColorTable,
   *   layers: Array<{id:string, name:string, visible:boolean, opacity:number,
   *                   blendMode:string, x:number, y:number, data:LayerData}>
   * }} project
   * @returns {string} JSON 字符串
   */
  static serializeJSON(project) {
    const { width, height, colorTable, layers } = project

    return JSON.stringify({
      version: VERSION,
      meta: {
        width,
        height,
        createdAt: new Date().toISOString(),
        colorTable: colorTable.serialize(),
      },
      layers: layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        x: l.x ?? 0,
        y: l.y ?? 0,
        // RLE 压缩像素数据
        rle: l.data ? l.data.toRLE() : [],
      })),
    })
  }

  /**
   * 从 JSON 反序列化
   * @param {string} jsonStr
   * @returns {{
   *   width: number,
   *   height: number,
   *   colorTableSerialized: Array,
   *   layers: Array<{id:string, name:string, visible:boolean, opacity:number,
   *                   blendMode:string, x:number, y:number, data:LayerData}>
   * }}
   */
  static deserializeJSON(jsonStr) {
    const raw = JSON.parse(jsonStr)

    if (!raw.version || raw.version > VERSION) {
      throw new Error(`不支持的文件版本: ${raw.version}`)
    }

    const { width, height } = raw.meta

    return {
      width,
      height,
      colorTableSerialized: raw.meta.colorTable,
      layers: raw.layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible !== false,
        opacity: l.opacity ?? 1.0,
        blendMode: l.blendMode ?? 'normal',
        x: l.x ?? 0,
        y: l.y ?? 0,
        // 从 RLE 恢复 LayerData
        data: LayerData.fromRLE(l.rle, width, height),
      })),
    }
  }

  /**
   * 从旧版 JSON 格式（V2.x grid 二维数组）转换为新格式
   * @param {{
   *   grid: Array<Array<{name:string, hex:string, brand:string, series:string}|null>>,
   *   colorTable: ColorTable
   * }} oldFormat
   * @returns {LayerData}
   */
  static migrateV2Grid(oldGrid, colorTable) {
    if (!oldGrid || oldGrid.length === 0) {
      return new LayerData(50, 50)
    }

    const h = oldGrid.length
    const w = oldGrid[0].length
    const data = new LayerData(w, h)

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = oldGrid[y]?.[x]
        if (cell && cell.hex) {
          data.set(x, y, colorTable.indexOf(cell.hex))
        }
      }
    }

    return data
  }
}
