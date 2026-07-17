/**
 * 多格式导出工具 — CSV/Excel/物料清单/GIF
 */

// ==================== CSV 色号矩阵 ====================

/**
 * 导出 CSV 色号二维矩阵
 * @param {Array<Array<object|null>>} grid
 * @param {number} gridW
 * @param {number} gridH
 */
export function exportColorMatrixCSV(grid, gridW, gridH) {
  const rows = []
  for (let r = 0; r < gridH; r++) {
    const row = []
    for (let c = 0; c < gridW; c++) {
      const cell = grid[r]?.[c]
      // 提取色号中的数字部分（如 "H01" → "H01"）
      row.push(cell?.name || cell?.code || '')
    }
    rows.push(row.join(','))
  }
  return rows.join('\n')
}

// ==================== 用料清单 CSV ====================

/**
 * 生成用料清单 CSV
 * @param {Array<{name:string, hex:string, count:number}>} colorStats
 * @param {object} [opts]
 * @param {number} [opts.gramPerBead=0.13] 每颗豆子克重（5mm规格约0.13g）
 * @param {number} [opts.pricePerGram=0.02] 每克单价
 * @returns {string} CSV 字符串
 */
export function exportMaterialList(colorStats, opts = {}) {
  const { gramPerBead = 0.13, pricePerGram = 0.02 } = opts
  const header = '色号,颜色名称,HEX,数量(颗),重量(g),预估成本(元)'
  const rows = [header]

  let totalBeads = 0, totalWeight = 0, totalCost = 0

  for (const s of colorStats) {
    const weight = s.count * gramPerBead
    const cost = weight * pricePerGram
    totalBeads += s.count
    totalWeight += weight
    totalCost += cost
    rows.push(`${s.name},${s.name},${s.hex},${s.count},${weight.toFixed(2)},${cost.toFixed(2)}`)
  }

  rows.push('')
  rows.push(`合计,,,,${totalBeads},${totalWeight.toFixed(2)},${totalCost.toFixed(2)}`)
  return rows.join('\n')
}

// ==================== Excel 导出（CSV UTF-8 BOM） ====================

export function downloadCSV(csvContent, filename) {
  // UTF-8 BOM for Excel compatibility
  const BOM = '﻿'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ==================== GIF 制作过程动画 ====================

/**
 * 生成逐颗制作的 GIF 动画帧
 * 模拟逐行/逐色摆放过程
 * @param {Array<Array<object|null>>} grid
 * @param {number} gridW
 * @param {number} gridH
 * @param {number} cellSize 每格像素
 * @param {number} maxFrames 最大帧数（限制文件大小）
 * @returns {Promise<Blob>} GIF Blob
 */
export async function exportCreationGIF(grid, gridW, gridH, cellSize = 4, maxFrames = 60) {
  // 收集所有非空格子，按行优先排序
  const cells = []
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      if (grid[r]?.[c]?.hex) cells.push({ r, c, hex: grid[r][c].hex })
    }
  }

  const totalCells = cells.length
  const step = Math.max(1, Math.floor(totalCells / maxFrames))
  const frameCount = Math.min(maxFrames, Math.ceil(totalCells / step))

  // 使用离屏 Canvas 逐帧渲染
  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = gridW * cellSize
  frameCanvas.height = gridH * cellSize
  const ctx = frameCanvas.getContext('2d')

  // 背景
  ctx.fillStyle = '#e8eaed'
  ctx.fillRect(0, 0, frameCanvas.width, frameCanvas.height)

  // 收集帧的 ImageData
  const frames = []
  let placed = 0

  for (let f = 0; f < frameCount; f++) {
    // 放置一批格子
    const end = Math.min(placed + step, totalCells)
    for (let i = placed; i < end; i++) {
      const { r, c, hex } = cells[i]
      ctx.fillStyle = hex
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
    }
    placed = end

    // 获取当前帧
    frames.push(ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height))
  }

  // 简单的 GIF 编码（使用 Canvas 序列 + 手动拼接）
  // 浏览器端 GIF 编码较复杂，这里返回帧序列供后端处理
  return { frames, width: frameCanvas.width, height: frameCanvas.height }
}

/**
 * 将帧序列转为简单的动画 PNG DataURI 列表（供预览）
 * @returns {string[]}
 */
export function framesToDataURIs(frames, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  return frames.map(frame => {
    canvas.width = width
    canvas.height = height
    ctx.putImageData(frame, 0, 0)
    return canvas.toDataURL('image/png')
  })
}

// ==================== 色板导入（.act / .ase / .gpl） ====================

/**
 * 解析 .gpl（GIMP 调色板）文件
 * @param {string} content 文件内容
 * @returns {Array<{name:string, hex:string}>}
 */
export function parseGPL(content) {
  const colors = []
  const lines = content.split('\n')
  for (const line of lines) {
    // 格式: R G B  Name
    const match = line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(.+)/)
    if (match) {
      const hex = '#' + [match[1], match[2], match[3]]
        .map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
      colors.push({ name: match[4].trim(), hex })
    }
  }
  return colors
}

/**
 * 解析 .act（Adobe Color Table）二进制文件
 * @param {ArrayBuffer} buffer
 * @returns {Array<{name:string, hex:string}>}
 */
export function parseACT(buffer) {
  const colors = []
  const bytes = new Uint8Array(buffer)
  // ACT 格式：每 3 字节一组 RGB（0-255），最多 256 色
  for (let i = 0; i + 2 < bytes.length; i += 3) {
    const r = bytes[i], g = bytes[i + 1], b = bytes[i + 2]
    if (r === 0 && g === 0 && b === 0) continue // 跳过空白
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    colors.push({ name: `色板_${i / 3 + 1}`, hex })
  }
  return colors
}

/**
 * 解析 .ase（Adobe Swatch Exchange）文件（简化版）
 * 注：完整 ASE 支持需要解析更多块类型，此处为基础实现
 * @param {ArrayBuffer} buffer
 * @returns {Array<{name:string, hex:string}>}
 */
export function parseASE(buffer) {
  const colors = []
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)

  // ASE 文件头：4字节签名 "ASEF" + 4字节版本
  const signature = String.fromCharCode(...bytes.slice(0, 4))
  if (signature !== 'ASEF') return colors

  // 跳过头部，读取色块
  const numBlocks = view.getUint32(8, false) // big-endian
  let offset = 12

  for (let i = 0; i < numBlocks && offset < bytes.length; i++) {
    const blockType = view.getUint16(offset, false)
    const blockLen = view.getUint32(offset + 2, false)

    if (blockType === 0x0001) {
      // 颜色块
      const nameLen = view.getUint16(offset + 6, false)
      let name = ''
      // 名称是 UTF-16BE
      for (let j = 0; j < nameLen - 1 && offset + 8 + j * 2 + 1 < bytes.length; j++) {
        name += String.fromCharCode(view.getUint16(offset + 8 + j * 2, false))
      }
      name = name.replace(/\0/g, '').trim() || `ASE_${i + 1}`

      // 颜色数据在名称之后
      const colorOffset = offset + 6 + 2 + nameLen * 2 + 2 + 4 // skip name + color model
      if (colorOffset + 3 <= bytes.length) {
        const r = bytes[colorOffset + 1]
        const g = bytes[colorOffset + 2]
        const b = bytes[colorOffset + 3]
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
        colors.push({ name, hex })
      }
    }

    offset += 6 + blockLen
  }

  return colors
}
