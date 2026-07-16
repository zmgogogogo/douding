// ============================================
//  imageAnalyzer — AI 智能图片分析
//  自动裁剪建议 + 复杂度分析 + 参数推荐
// ============================================
import sharp from 'sharp'

/**
 * 分析图片内容，返回智能建议
 * @param {string} imagePath - 图片文件路径
 * @returns {object} 分析结果
 */
export async function analyzeImage(imagePath) {
  const img = sharp(imagePath)
  const meta = await img.metadata()
  const { width, height, format } = meta

  // 1. 缩放到分析分辨率（200px 宽，用于快速计算）
  const analyzeW = Math.min(200, width)
  const analyzeH = Math.round(height * (analyzeW / width))
  const { data, info } = await img
    .resize(analyzeW, analyzeH, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = data
  const iw = info.width, ih = info.height
  const channels = info.channels

  // 2. 计算边缘密度（用于显著性检测）
  const edgeMap = computeEdgeDensity(pixels, iw, ih, channels)
  const contentRect = findContentRegion(edgeMap, iw, ih)

  // 3. 颜色复杂度分析
  const colorComplexity = analyzeColorComplexity(pixels, iw, ih, channels)

  // 4. 生成参数建议
  const recommendations = generateRecommendations(contentRect, colorComplexity, width, height)

  return {
    originalSize: { width, height, format },
    contentRegion: {
      x: Math.round(contentRect.x * width / iw),
      y: Math.round(contentRect.y * height / ih),
      w: Math.round(contentRect.w * width / iw),
      h: Math.round(contentRect.h * height / ih)
    },
    colorComplexity,
    recommendations
  }
}

/**
 * 用 Sobel 算子计算边缘密度
 */
function computeEdgeDensity(pixels, w, h, channels) {
  const density = new Float32Array(w * h)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * channels
      const gray = channels >= 3
        ? pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
        : pixels[idx]

      // 简化的边缘检测
      const right = getGray(pixels, y, x + 1, w, channels)
      const down = getGray(pixels, y + 1, x, w, channels)
      const gx = right - gray
      const gy = down - gray
      density[y * w + x] = Math.sqrt(gx * gx + gy * gy)
    }
  }

  return density
}

function getGray(pixels, y, x, w, channels) {
  const idx = (y * w + x) * channels
  return channels >= 3
    ? pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
    : pixels[idx]
}

/**
 * 基于边缘密度找到内容区域（自动裁剪建议）
 */
function findContentRegion(edgeMap, w, h) {
  // 计算水平和垂直投影
  const rowDensity = new Float32Array(h)
  const colDensity = new Float32Array(w)

  for (let y = 0; y < h; y++) {
    let sum = 0
    for (let x = 0; x < w; x++) sum += edgeMap[y * w + x]
    rowDensity[y] = sum / w
  }

  for (let x = 0; x < w; x++) {
    let sum = 0
    for (let y = 0; y < h; y++) sum += edgeMap[y * w + x]
    colDensity[x] = sum / h
  }

  // 找到边缘密度超过阈值的区域
  const threshold = Math.max(...rowDensity) * 0.15
  let top = 0, bottom = h - 1, left = 0, right = w - 1

  for (let y = 0; y < h; y++) {
    if (rowDensity[y] > threshold) { top = y; break }
  }
  for (let y = h - 1; y >= 0; y--) {
    if (rowDensity[y] > threshold) { bottom = y; break }
  }
  for (let x = 0; x < w; x++) {
    if (colDensity[x] > threshold) { left = x; break }
  }
  for (let x = w - 1; x >= 0; x--) {
    if (colDensity[x] > threshold) { right = x; break }
  }

  // 加 5% padding
  const pw = Math.round((right - left) * 0.05)
  const ph = Math.round((bottom - top) * 0.05)

  return {
    x: Math.max(0, left - pw),
    y: Math.max(0, top - ph),
    w: Math.min(w - 1, right - left + pw * 2),
    h: Math.min(h - 1, bottom - top + ph * 2)
  }
}

/**
 * 分析颜色复杂度
 */
function analyzeColorComplexity(pixels, w, h, channels) {
  const colorSet = new Set()
  const samples = Math.min(5000, w * h)

  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(Math.random() * w * h) * channels
    if (channels >= 3) {
      const r = Math.round(pixels[idx] / 16)
      const g = Math.round(pixels[idx + 1] / 16)
      const b = Math.round(pixels[idx + 2] / 16)
      colorSet.add((r << 8) | (g << 4) | b)
    }
  }

  const uniqueRatio = colorSet.size / 4096  // 16^3 / 16^3 量化后的比例

  let level
  if (uniqueRatio < 0.05) level = 'simple'
  else if (uniqueRatio < 0.15) level = 'moderate'
  else level = 'complex'

  return {
    level,
    levelLabel: { simple: '简单（少颜色）', moderate: '中等（适中颜色）', complex: '复杂（多颜色）' }[level],
    uniqueColorRatio: Math.round(uniqueRatio * 100)
  }
}

/**
 * 生成参数推荐
 */
function generateRecommendations(contentRect, colorComplexity, origW, origH) {
  // 推荐网格尺寸
  let recommendedSize
  switch (colorComplexity.level) {
    case 'simple': recommendedSize = 32; break
    case 'moderate': recommendedSize = 58; break
    case 'complex': recommendedSize = 78; break
  }

  // 推荐颜色数
  const colorCount = colorComplexity.level === 'simple' ? 8 :
                     colorComplexity.level === 'moderate' ? 16 : 32

  // 是否建议裁剪
  const contentRatio = (contentRect.w * contentRect.h) / (origW * origH)
  const shouldCrop = contentRatio < 0.7 && contentRatio > 0.1

  return {
    recommendedGridSize: recommendedSize,
    recommendedColorCount: colorCount,
    shouldCrop,
    cropRect: shouldCrop ? contentRect : null,
    suggestion: shouldCrop
      ? '建议裁剪到内容区域以突出主体，去掉周围空白'
      : colorComplexity.level === 'complex'
        ? '图片颜色丰富，建议适当增大网格尺寸获得更好效果'
        : '图片适合直接转换，可使用默认参数'
  }
}

// ============================================
//  智能去背景（基于边缘检测 + 透明度）
// ============================================

/**
 * 简单去背景：检测边缘区域并设为透明
 * 适用于纯色背景的图片
 */
export async function removeBackgroundSimple(imagePath, threshold = 30) {
  const img = sharp(imagePath)
  const { data, info } = await img
    .resize(400, 400, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width, h = info.height

  // 采样四角颜色（假设为背景色）
  const corners = [
    getPixel(data, 0, 0, w),
    getPixel(data, w - 1, 0, w),
    getPixel(data, 0, h - 1, w),
    getPixel(data, w - 1, h - 1, w)
  ]
  const bgColor = averageColor(corners)

  // 创建新像素数组（RGBA）
  const newPixels = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const srcIdx = i * 4
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2]
    const dist = Math.sqrt(
      (r - bgColor.r) ** 2 + (g - bgColor.g) ** 2 + (b - bgColor.b) ** 2
    )
    newPixels[srcIdx] = r
    newPixels[srcIdx + 1] = g
    newPixels[srcIdx + 2] = b
    newPixels[srcIdx + 3] = dist > threshold ? 255 : 0  // 距背景色远的保留
  }

  const outputBuffer = await sharp(newPixels, {
    raw: { width: w, height: h, channels: 4 }
  }).png().toBuffer()

  return outputBuffer
}

function getPixel(data, x, y, w) {
  const idx = (y * w + x) * 4
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] || 255 }
}

function averageColor(colors) {
  const sum = colors.reduce((s, c) => ({ r: s.r + c.r, g: s.g + c.g, b: s.b + c.b }), { r: 0, g: 0, b: 0 })
  return { r: Math.round(sum.r / colors.length), g: Math.round(sum.g / colors.length), b: Math.round(sum.b / colors.length) }
}
