/**
 * SVG 矢量导出 — 前端直接生成 SVG
 *
 * 核心设计：
 * - 每个豆子 = 一个 <rect> 元素
 * - 按颜色分组 → <g> 标签，减少冗余属性
 * - 支持带/不带网格、带/不带色号标注
 * - 纯矢量输出，无损缩放
 */

/**
 * 生成拼豆图纸 SVG 字符串
 * @param {Array<Array<object|null>>} grid — 合成网格（getCompositeGrid 结果）
 * @param {number} gridW — 宽度
 * @param {number} gridH — 高度
 * @param {object} opts
 * @param {number} [opts.cellSize=10] — 每格 SVG 像素大小
 * @param {boolean} [opts.showGrid=true] — 是否显示网格线
 * @param {boolean} [opts.showLabels=false] — 是否显示色号标注
 * @param {boolean} [opts.transparent=true] — 空格子是否透明
 * @param {string} [opts.bgColor='#ffffff'] — 背景色（透明模式下忽略）
 * @returns {string} SVG 字符串
 */
export function generateSVG(grid, gridW, gridH, opts = {}) {
  const {
    cellSize = 10,
    showGrid = true,
    showLabels = false,
    transparent = true,
    bgColor = '#ffffff',
  } = opts

  const totalW = gridW * cellSize
  const totalH = gridH * cellSize

  // 按颜色分组
  const colorGroups = new Map() // hex → { name, hex, cells: [{r,c}, ...] }
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const cell = grid[r]?.[c]
      const hex = cell?.hex
      if (!hex) continue
      const key = hex.toUpperCase()
      if (!colorGroups.has(key)) {
        colorGroups.set(key, {
          name: cell.name || key,
          hex: cell.hex,
          cells: [],
        })
      }
      colorGroups.get(key).cells.push({ r, c })
    }
  }

  // 构建 SVG
  const parts = []
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`
  )

  // 背景
  if (!transparent) {
    parts.push(`  <rect width="${totalW}" height="${totalH}" fill="${bgColor}" />`)
  }

  // 颜色分组绘制
  for (const [hex, group] of colorGroups) {
    parts.push(`  <!-- ${group.name} (${hex}) — ${group.cells.length} 颗 -->`)
    parts.push(`  <g fill="${group.hex}">`)
    for (const { r, c } of group.cells) {
      const x = c * cellSize
      const y = r * cellSize
      parts.push(`    <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" />`)
    }
    parts.push(`  </g>`)
  }

  // 色号标注
  if (showLabels && cellSize >= 12) {
    parts.push(`  <!-- 色号标注 -->`)
    parts.push(
      `  <g fill="#333" font-family="monospace" font-size="${Math.max(6, cellSize * 0.55)}" text-anchor="middle">`
    )
    for (const [hex, group] of colorGroups) {
      const label = group.name.replace(/\s/g, '').slice(0, 6)
      for (const { r, c } of group.cells) {
        const x = c * cellSize + cellSize / 2
        const y = r * cellSize + cellSize / 2 + cellSize * 0.18
        parts.push(`    <text x="${x}" y="${y}">${label}</text>`)
      }
    }
    parts.push(`  </g>`)
  }

  // 网格线
  if (showGrid) {
    parts.push(`  <!-- 网格线 -->`)
    parts.push(`  <g stroke="#c0c8d0" stroke-width="0.3">`)
    for (let c = 0; c <= gridW; c++) {
      const x = c * cellSize
      parts.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${totalH}" />`)
    }
    for (let r = 0; r <= gridH; r++) {
      const y = r * cellSize
      parts.push(`    <line x1="0" y1="${y}" x2="${totalW}" y2="${y}" />`)
    }
    parts.push(`  </g>`)

    // 主网格线（每5格）
    parts.push(`  <g stroke="#8090a0" stroke-width="0.8">`)
    for (let c = 0; c <= gridW; c += 5) {
      const x = c * cellSize
      parts.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${totalH}" />`)
    }
    for (let r = 0; r <= gridH; r += 5) {
      const y = r * cellSize
      parts.push(`    <line x1="0" y1="${y}" x2="${totalW}" y2="${y}" />`)
    }
    parts.push(`  </g>`)
  }

  parts.push(`</svg>`)
  return parts.join('\n')
}

/**
 * 触发 SVG 文件下载
 * @param {string} svgStr — SVG 字符串
 * @param {string} filename
 */
export function downloadSVG(svgStr, filename = 'douding-pattern.svg') {
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 生成 SVG Data URI（用于预览）
 * @param {string} svgStr
 * @returns {string}
 */
export function svgToDataURI(svgStr) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgStr)
}
