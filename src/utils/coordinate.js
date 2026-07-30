// ============================================================
//  coordinate.js — 拼豆制作模式坐标工具
//  屏幕坐标 ↔ 网格坐标转换、行列格式化
// ============================================================

/**
 * 屏幕坐标 → 网格坐标
 * @param {number} sx — 屏幕 X 坐标（相对于容器）
 * @param {number} sy — 屏幕 Y 坐标（相对于容器）
 * @param {number} zoom — 当前缩放级别
 * @param {number} panX — 水平平移偏移
 * @param {number} panY — 垂直平移偏移
 * @param {number} gridW — 图纸宽度（格数）
 * @param {number} gridH — 图纸高度（格数）
 * @param {number} containerW — 容器宽度
 * @param {number} containerH — 容器高度
 * @returns {{col:number, row:number}|null} 网格坐标，超出边界返回 null
 */
export function screenToGrid(sx, sy, zoom, panX, panY, gridW, gridH, containerW, containerH) {
  // 画布在容器中的偏移
  const cw = gridW * zoom
  const ch = gridH * zoom
  const ox = containerW / 2 + panX - cw / 2
  const oy = containerH / 2 + panY - ch / 2

  const col = Math.floor((sx - ox) / zoom)
  const row = Math.floor((sy - oy) / zoom)

  if (col < 0 || col >= gridW || row < 0 || row >= gridH) {
    return null
  }

  return { col, row }
}

/**
 * 网格坐标 → 屏幕坐标（格子的中心点）
 * @returns {{x:number, y:number}}
 */
export function gridToScreen(col, row, zoom, panX, panY, gridW, gridH, containerW, containerH) {
  const cw = gridW * zoom
  const ch = gridH * zoom
  const ox = containerW / 2 + panX - cw / 2
  const oy = containerH / 2 + panY - ch / 2

  return {
    x: ox + col * zoom + zoom / 2,
    y: oy + row * zoom + zoom / 2,
  }
}

/**
 * 获取画布在容器中的偏移量
 */
export function getCanvasOffset(zoom, panX, panY, gridW, gridH, containerW, containerH) {
  const cw = gridW * zoom
  const ch = gridH * zoom
  return {
    x: containerW / 2 + panX - cw / 2,
    y: containerH / 2 + panY - ch / 2,
    w: cw,
    h: ch,
  }
}

/**
 * 格式化网格坐标为显示文本
 * @param {number|null} col — 列号 (0-based)
 * @param {number|null} row — 行号 (0-based)
 * @param {'grid'|'cm'|'inch'} unit — 单位
 * @returns {string}
 */
export function formatCoord(col, row, unit = 'grid') {
  if (col === null || row === null || col < 0 || row < 0) return '—'
  switch (unit) {
    case 'cm':
      // 标准拼豆间距约 5mm
      return `(${(col * 0.5).toFixed(1)}cm, ${(row * 0.5).toFixed(1)}cm)`
    case 'inch':
      return `(${(col * 0.197).toFixed(1)}in, ${(row * 0.197).toFixed(1)}in)`
    case 'grid':
    default:
      return `(${col + 1}, ${row + 1})`
  }
}

/**
 * 行列号转豆子序号（按行遍历）
 * @param {number} col
 * @param {number} row
 * @param {number} gridW
 * @returns {number} 1-based 序号
 */
export function coordToIndex(col, row, gridW) {
  return row * gridW + col + 1
}

/**
 * 豆子序号转行列号
 * @param {number} index — 1-based 序号
 * @param {number} gridW
 * @returns {{col:number, row:number}}
 */
export function indexToCoord(index, gridW) {
  const i = index - 1
  return {
    col: i % gridW,
    row: Math.floor(i / gridW),
  }
}

/**
 * 判断网格坐标是否在指定区域内
 */
export function isInBounds(col, row, bounds) {
  if (!bounds) return false
  return col >= bounds.cStart && col < bounds.cEnd && row >= bounds.rStart && row < bounds.rEnd
}

/**
 * 计算两点之间的网格距离
 */
export function gridDistance(col1, row1, col2, row2) {
  return Math.sqrt((col2 - col1) ** 2 + (row2 - row1) ** 2)
}

/**
 * 限制缩放值在安全范围内
 * @param {number} zoom — 当前缩放
 * @param {number} min — 最小值（默认 0.5，即 5%）
 * @param {number} max — 最大值（默认 160，即 1600%）
 * @returns {number}
 */
export function clampZoom(zoom, min = 0.5, max = 160) {
  return Math.min(max, Math.max(min, zoom))
}

/**
 * 限制平移值，防止画布超出屏幕太远
 * @param {number} pan — 平移值
 * @param {number} canvasSize — 画布在该方向上的像素尺寸
 * @param {number} containerSize — 容器在该方向上的像素尺寸
 * @param {number} margin — 允许超出边界的安全边距（默认画布一半）
 * @returns {number}
 */
export function clampPan(pan, canvasSize, containerSize, margin = null) {
  if (margin === null) margin = canvasSize * 0.5
  const min = -canvasSize
  const max = containerSize + margin
  return Math.min(max, Math.max(min, pan))
}
