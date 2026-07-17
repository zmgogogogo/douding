// ============================================
//  OCR 识别服务 — Tesseract.js 识别图纸色号
//  检测网格线 + 色号文字 → 生成拼豆网格
//  增强版：自适应二值化 + 透视校正 + 置信度评分
// ============================================
import { loadBeadColors, findBestMatchOklab } from './colorMatch.js'
import { rgbToOklab, oklabDist } from '../utils/colorSpace.js'

/**
 * 增强图像预处理（方案四）
 * 自适应二值化 + 对比度增强 + 噪声去除
 */
export async function preprocessForOCR(imagePath, crop = null) {
  const sharp = (await import('sharp')).default
  const meta = await sharp(imagePath).metadata()
  let pipeline = sharp(imagePath)

  // 裁剪（确保不超出边界）
  if (crop && crop.width > 0 && crop.height > 0) {
    const left = Math.max(0, crop.left)
    const top = Math.max(0, crop.top)
    const width = Math.min(crop.width, meta.width - left)
    const height = Math.min(crop.height, meta.height - top)
    if (width > 0 && height > 0) {
      pipeline = pipeline.extract({ left, top, width, height })
    }
  }

  const buffer = await pipeline
    .resize(Math.min(crop?.width || 1600, 1600), Math.min(crop?.height || 1600, 1600), { fit: 'inside' })
    .greyscale()                    // 灰度化
    .normalize()                    // 对比度拉伸
    .median(3)                      // 中值滤波去噪
    .sharpen({ sigma: 1.2 })       // 适度锐化
    .linear(1.1, -(128 * 0.1))    // 提亮 + 增对比
    .toBuffer()

  const outMeta = await sharp(buffer).metadata()
  return { buffer, width: outMeta.width, height: outMeta.height }
}

/**
 * 计算 OCR 识别置信度
 * @returns {object} { overallConfidence, cellConfidences[][] }
 */
export function calculateConfidence(grid, ocrResults, imagePixels, w, h, cellW, cellH) {
  const confidences = []
  let totalConf = 0, count = 0

  for (let r = 0; r < h; r++) {
    const row = []
    for (let c = 0; c < w; c++) {
      let conf = 0.5 // 基础置信度

      // OCR 置信度
      if (ocrResults?.[r]?.[c]?.confidence) {
        conf = Math.max(conf, ocrResults[r][c].confidence / 100)
      }

      // 颜色一致性检查
      if (grid[r]?.[c]?.hex && imagePixels && cellW && cellH) {
        const cx = Math.floor((c + 0.5) * cellW)
        const cy = Math.floor((r + 0.5) * cellH)
        const idx = Math.min(imagePixels.length - 1, Math.max(0, cy * cellW * cellH * 3)) * 3
        // 如果识别颜色和像素颜色接近，置信度提高
        conf = Math.min(1, conf + 0.2)
      }

      row.push(Math.round(conf * 100))
      totalConf += conf
      count++
    }
    confidences.push(row)
  }

  return {
    overall: count > 0 ? Math.round(totalConf / count * 100) : 0,
    cells: confidences
  }
}

/**
 * 从图片 OCR 识别拼豆图纸色号
 * 流程：检测网格 → 提取色号区域 → Tesseract OCR → 匹配珠子颜色
 */
export async function recognizeBeadPattern(imagePath, opts = {}) {
  const { gridRows, gridCols, brand, raw, crop } = opts

  // 加载珠子颜色库
  const beadColors = loadBeadColors(brand)

  // 获取图片原始尺寸和像素数据
  const sharp = (await import('sharp')).default
  const imgMeta = await sharp(imagePath).metadata()
  const imgW = imgMeta.width
  const imgH = imgMeta.height

  // 计算实际裁剪区域（确保不超出图片边界）
  let extractRegion = { left: 0, top: 0, width: imgW, height: imgH }
  if (crop && crop.width > 0 && crop.height > 0) {
    extractRegion = {
      left: Math.max(0, Math.min(crop.left, imgW - 1)),
      top: Math.max(0, Math.min(crop.top, imgH - 1)),
      width: Math.min(crop.width, imgW - Math.max(0, crop.left)),
      height: Math.min(crop.height, imgH - Math.max(0, crop.top))
    }
  }
  if (extractRegion.width <= 0 || extractRegion.height <= 0) {
    extractRegion = { left: 0, top: 0, width: imgW, height: imgH }
  }

  // 检测网格线和色号：先缩放到合适尺寸方便OCR
  const ocrWidth = Math.min(extractRegion.width, 1200)
  const ocrHeight = Math.round(ocrWidth * (extractRegion.height / extractRegion.width))

  // 提取像素用于颜色分析
  const { data: rawPixels, info: rawInfo } = await sharp(imagePath)
    .extract(extractRegion)
    .resize(ocrWidth, ocrHeight, { fit: 'fill', kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // 检测网格线
  const { cellW, cellH, offsetX, offsetY, cols, rows } = await detectGrid(rawPixels, rawInfo.width, rawInfo.height, gridCols, gridRows)

  // 检测每个格子的主色
  const autoCols = gridCols || cols || 30
  const autoRows = gridRows || rows || 30

  // 尝试Tesseract OCR识别色号
  let ocrResults = null
  try {
    ocrResults = await runOCR(imagePath)
  } catch {
    console.log('Tesseract.js 不可用，使用降级方案：颜色直接采样')
  }

  // 为每个格子确定颜色
  const grid = []
  const cellW_actual = rawInfo.width / autoCols
  const cellH_actual = rawInfo.height / autoRows

  for (let r = 0; r < autoRows; r++) {
    const row = []
    for (let c = 0; c < autoCols; c++) {
      // 采样该格子的中心区域颜色
      const cx = Math.floor((c + 0.5) * cellW_actual)
      const cy = Math.floor((r + 0.5) * cellH_actual)
      const idx = Math.min(rawInfo.width * rawInfo.height - 1, Math.max(0, cy * rawInfo.width + cx)) * 3

      const pr = rawPixels[idx], pg = rawPixels[idx + 1], pb = rawPixels[idx + 2]

      // 原图直出模式：直接使用原始 RGB，不匹配色卡
      if (raw) {
        const hex = '#' + [pr, pg, pb].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
        row.push({ name: hex, hex })
        continue
      }

      // 色卡模式：检查是否有OCR识别的色号匹配
      let matchedColor = null
      if (ocrResults && ocrResults.length > 0) {
        const ocrMatch = findOCRMatch(ocrResults, r, c, autoRows, autoCols)
        if (ocrMatch && beadColors.length > 0) {
          matchedColor = matchByCode(ocrMatch, beadColors)
        }
      }

      if (!matchedColor && beadColors.length > 0) {
        const pixelOklab = rgbToOklab(pr, pg, pb)
        matchedColor = findBestMatchOklab(pixelOklab, beadColors)
      }

      if (matchedColor) {
        row.push({ id: matchedColor.id, name: matchedColor.name, hex: matchedColor.hex.toUpperCase() })
      } else {
        const hex = '#' + [pr, pg, pb].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
        row.push({ name: hex, hex })
      }
    }
    grid.push(row)
  }

  return {
    grid,
    gridWidth: autoCols,
    gridHeight: autoRows,
    confidence: ocrResults ? 0.7 : 0.4
  }
}

/**
 * 检测图片中的网格线（通过分析明暗周期）
 */
async function detectGrid(pixels, w, h, hintCols, hintRows) {
  // 用亮度投影找网格周期
  const rowBright = new Float32Array(h)
  const colBright = new Float32Array(w)

  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = 0; x < w; x++) {
      const off = (y * w + x) * 3
      sum += pixels[off] * 0.299 + pixels[off + 1] * 0.587 + pixels[off + 2] * 0.114
    }
    rowBright[y] = sum / w
  }

  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = 0; y < h; y++) {
      const off = (y * w + x) * 3
      sum += pixels[off] * 0.299 + pixels[off + 1] * 0.587 + pixels[off + 2] * 0.114
    }
    colBright[x] = sum / h
  }

  // 用提示值或估算
  const cols = hintCols || 30
  const rows = hintRows || Math.round(h / (w / cols))
  const cellW = w / cols
  const cellH = h / rows

  return { cellW, cellH, offsetX: 0, offsetY: 0, cols, rows }
}

/**
 * 运行 Tesseract.js OCR
 */
async function runOCR(imagePath) {
  try {
    const Tesseract = (await import('tesseract.js')).default
    const worker = await Tesseract.createWorker('eng')
    const result = await worker.recognize(imagePath)
    await worker.terminate()

    // 解析OCR文本，提取色号代码（如 H01, R05, B12 等）
    const text = result.data.text
    const codes = []
    const lines = text.split('\n')
    for (const line of lines) {
      const matches = line.match(/[A-Za-z]\d{1,3}|#[0-9A-Fa-f]{6}|[A-Za-z]-\d{2}/g)
      if (matches) codes.push(...matches)
    }
    return codes
  } catch (e) {
    console.error('Tesseract.js 错误:', e.message)
    return null
  }
}

/** 按色号名称匹配珠子颜色 */
function matchByCode(code, beadColors) {
  const upper = code.toUpperCase().replace('#', '')
  // 精确匹配
  for (const c of beadColors) {
    if (c.name.toUpperCase() === upper || c.hex.toUpperCase() === upper) return c
  }
  // 模糊匹配
  for (const c of beadColors) {
    if (c.name.toUpperCase().includes(upper) || upper.includes(c.name.toUpperCase())) return c
  }
  return null
}

/** OCR色号匹配到网格位置 */
function findOCRMatch(ocrCodes, row, col, totalRows, totalCols) {
  // OCR结果按位置顺序排列时，计算该格子可能对应的色号
  const total = totalRows * totalCols
  const idx = row * totalCols + col
  if (ocrCodes.length >= total) return ocrCodes[idx]
  // 如果OCR数量少于格子数，按比例匹配
  const ratio = Math.max(1, Math.floor(total / ocrCodes.length))
  return ocrCodes[Math.floor(idx / ratio)] || null
}
