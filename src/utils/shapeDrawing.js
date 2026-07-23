/**
 * 形状绘制算法 — 直线、矩形、圆形、像素文字
 *
 * 所有算法输出格子坐标数组 [{r, c}, ...]
 * 调用方负责 setCell 和 saveSnapshot
 */

/**
 * Bresenham 直线算法（支持可变线宽）
 * @param {number} r1 起始行
 * @param {number} c1 起始列
 * @param {number} r2 结束行
 * @param {number} c2 结束列
 * @param {number} [width=1] 线宽
 * @returns {Array<{r:number, c:number}>}
 */
export function bresenhamLine(r1, c1, r2, c2, width = 1) {
  const cells = new Set() // 用 Set 防止重复坐标
  const add = (r, c) => cells.add(`${r},${c}`)

  const dr = Math.abs(r2 - r1)
  const dc = Math.abs(c2 - c1)
  const sr = r1 < r2 ? 1 : -1
  const sc = c1 < c2 ? 1 : -1
  let err = dr - dc

  let r = r1,
    c = c1

  while (true) {
    // 线宽：在垂直方向扩展
    const halfW = Math.floor(width / 2)
    for (let w = -halfW; w <= halfW; w++) {
      if (dc > dr) {
        add(r + w, c) // 水平主导 → 垂直扩展
      } else {
        add(r, c + w) // 垂直主导 → 水平扩展
      }
    }

    if (r === r2 && c === c2) break

    const e2 = 2 * err
    if (e2 > -dc) {
      err -= dc
      r += sr
    }
    if (e2 < dr) {
      err += dr
      c += sc
    }
  }

  return [...cells].map((k) => {
    const [r, c] = k.split(',').map(Number)
    return { r, c }
  })
}

/**
 * 矩形绘制
 * @param {number} r1 起始行
 * @param {number} c1 起始列
 * @param {number} r2 结束行
 * @param {number} c2 结束列
 * @param {'fill'|'outline'} mode
 * @param {number} [lineWidth=1] 轮廓线宽
 * @param {number} [radius=0] 圆角半径
 * @returns {Array<{r:number, c:number}>}
 */
export function drawRect(r1, c1, r2, c2, mode = 'outline', lineWidth = 1, radius = 0) {
  const minR = Math.min(r1, r2),
    maxR = Math.max(r1, r2)
  const minC = Math.min(c1, c2),
    maxC = Math.max(c1, c2)
  const cells = new Set()
  const add = (r, c) => cells.add(`${r},${c}`)

  if (mode === 'fill') {
    // 填充模式（含圆角裁剪）
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (radius > 0) {
          const inCorner =
            (r < minR + radius || r > maxR - radius) && (c < minC + radius || c > maxC - radius)
          if (inCorner) {
            const cornerRX = c < minC + radius ? minC + radius - 1 : maxC - radius
            const cornerRY = r < minR + radius ? minR + radius - 1 : maxR - radius
            const dx = c - cornerRX,
              dy = r - cornerRY
            if (dx * dx + dy * dy > radius * radius) continue
          }
        }
        add(r, c)
      }
    }
  } else {
    // 轮廓模式
    const lw = Math.max(1, lineWidth)
    for (let w = 0; w < lw; w++) {
      for (let c = minC - w; c <= maxC + w; c++) {
        add(minR - w, c)
        add(maxR + w, c)
      }
      for (let r = minR - w + 1; r <= maxR + w - 1; r++) {
        add(r, minC - w)
        add(r, maxC + w)
      }
    }
  }

  return [...cells].map((k) => {
    const [r, c] = k.split(',').map(Number)
    return { r, c }
  })
}

/**
 * 圆形/椭圆绘制（中点画圆算法）
 * @param {number} cr 圆心行
 * @param {number} cc 圆心列
 * @param {number} radius 半径
 * @param {'fill'|'outline'} mode
 * @param {'hard'|'smooth'} [pixelStyle='hard'] 像素化方式
 * @returns {Array<{r:number, c:number}>}
 */
export function drawCircle(cr, cc, radius, mode = 'outline', pixelStyle = 'hard') {
  const cells = new Set()
  const add = (r, c) => cells.add(`${r},${c}`)

  const r2 = radius * radius

  if (mode === 'fill') {
    for (let r = -radius; r <= radius; r++) {
      const maxC = Math.floor(Math.sqrt(r2 - r * r))
      for (let c = -maxC; c <= maxC; c++) {
        add(cr + r, cc + c)
      }
    }
  } else {
    // 中点画圆算法
    let x = 0,
      y = radius
    let d = 1 - radius

    while (x <= y) {
      add(cr + x, cc + y)
      add(cr - x, cc + y)
      add(cr + x, cc - y)
      add(cr - x, cc - y)
      add(cr + y, cc + x)
      add(cr - y, cc + x)
      add(cr + y, cc - x)
      add(cr - y, cc - x)

      if (d <= 0) {
        d += 2 * x + 3
      } else {
        d += 2 * (x - y) + 5
        y--
      }
      x++
    }

    // 平滑模式：在像素角添加额外格子以视觉圆滑
    if (pixelStyle === 'smooth' && radius > 5) {
      // 额外斜角像素
      for (let r = Math.ceil(radius * 0.7); r < radius; r++) {
        const maxC = Math.floor(Math.sqrt(r2 - r * r))
        const nextC = Math.floor(Math.sqrt(r2 - (r + 1) * (r + 1)))
        if (maxC - nextC > 1) {
          add(cr + r, cc + maxC - 1)
          add(cr - r, cc + maxC - 1)
          add(cr + r, cc - maxC + 1)
          add(cr - r, cc - maxC + 1)
        }
      }
    }
  }

  return [...cells].map((k) => {
    const [r, c] = k.split(',').map(Number)
    return { r, c }
  })
}

/**
 * 像素文字渲染
 * 使用内置简易 3x5 像素字体（A-Z, 0-9）
 * @param {string} text
 * @param {number} startR 起始行
 * @param {number} startC 起始列
 * @param {number} [scale=1] 缩放倍数
 * @param {number} [letterSpacing=1] 字母间距
 * @returns {Array<{r:number, c:number}>}
 */
export function drawPixelText(text, startR, startC, scale = 1, letterSpacing = 1) {
  const upper = text.toUpperCase()
  const cells = []

  let colOffset = 0
  for (const ch of upper) {
    const glyph = PIXEL_FONT[ch]
    if (!glyph) {
      colOffset += 4 * scale + letterSpacing
      continue
    }

    for (const { r, c } of glyph) {
      for (let sr = 0; sr < scale; sr++) {
        for (let sc = 0; sc < scale; sc++) {
          cells.push({ r: startR + r * scale + sr, c: startC + colOffset + c * scale + sc })
        }
      }
    }
    colOffset += glyph.width * scale + letterSpacing
  }

  return cells
}

// ==================== 内置 3×5 像素字体 ====================
// 每个字形：{ width, cells: [{r,c}, ...] }
const PIXEL_FONT = {}

function defineGlyph(ch, width, ...rows) {
  const cells = []
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < width; c++) {
      if (row[c] === '1') cells.push({ r, c })
    }
  }
  PIXEL_FONT[ch] = { width, cells }
}

// 5行高 × 3列宽（大写字母）
defineGlyph('A', 3, '010', '101', '111', '101', '101')
defineGlyph('B', 3, '110', '101', '110', '101', '110')
defineGlyph('C', 3, '011', '100', '100', '100', '011')
defineGlyph('D', 3, '110', '101', '101', '101', '110')
defineGlyph('E', 3, '111', '100', '110', '100', '111')
defineGlyph('F', 3, '111', '100', '110', '100', '100')
defineGlyph('G', 3, '011', '100', '101', '101', '011')
defineGlyph('H', 3, '101', '101', '111', '101', '101')
defineGlyph('I', 3, '111', '010', '010', '010', '111')
defineGlyph('J', 3, '001', '001', '001', '101', '010')
defineGlyph('K', 3, '101', '101', '110', '101', '101')
defineGlyph('L', 3, '100', '100', '100', '100', '111')
defineGlyph('M', 5, '10001', '11011', '10101', '10001', '10001')
defineGlyph('N', 3, '101', '111', '111', '101', '101')
defineGlyph('O', 3, '010', '101', '101', '101', '010')
defineGlyph('P', 3, '110', '101', '110', '100', '100')
defineGlyph('Q', 4, '0110', '1001', '1001', '1001', '0111')
defineGlyph('R', 3, '110', '101', '110', '101', '101')
defineGlyph('S', 3, '011', '100', '010', '001', '110')
defineGlyph('T', 3, '111', '010', '010', '010', '010')
defineGlyph('U', 3, '101', '101', '101', '101', '010')
defineGlyph('V', 3, '101', '101', '101', '010', '010')
defineGlyph('W', 5, '10001', '10001', '10101', '11011', '10001')
defineGlyph('X', 3, '101', '010', '010', '010', '101')
defineGlyph('Y', 3, '101', '010', '010', '010', '010')
defineGlyph('Z', 3, '111', '001', '010', '100', '111')
// 数字
defineGlyph('0', 3, '010', '101', '101', '101', '010')
defineGlyph('1', 3, '010', '110', '010', '010', '111')
defineGlyph('2', 3, '110', '001', '010', '100', '111')
defineGlyph('3', 3, '110', '001', '010', '001', '110')
defineGlyph('4', 3, '100', '101', '111', '001', '001')
defineGlyph('5', 3, '111', '100', '110', '001', '110')
defineGlyph('6', 3, '011', '100', '110', '101', '010')
defineGlyph('7', 3, '111', '001', '010', '010', '010')
defineGlyph('8', 3, '010', '101', '010', '101', '010')
defineGlyph('9', 3, '010', '101', '011', '001', '010')
// 符号
defineGlyph('.', 1, '0', '0', '0', '0', '1')
defineGlyph('!', 1, '1', '1', '1', '0', '1')
defineGlyph('?', 3, '110', '001', '010', '000', '010')
defineGlyph('-', 3, '000', '000', '111', '000', '000')
defineGlyph('+', 3, '000', '010', '111', '010', '000')
defineGlyph(' ', 3, '000', '000', '000', '000', '000')
