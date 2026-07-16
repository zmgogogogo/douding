// ============================================
//  图片处理路由 — 上传 + 图片转拼豆图纸 + Q版转换
// ============================================
import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { authRequired, authOptional } from '../middleware/auth.js'
import { DEFAULT_GRID_SIZE } from '../config.js'
import { loadBeadColors } from '../services/colorMatch.js'
import { floydSteinbergDitherWithRegions } from '../services/dither.js'
import { guidedFilter } from '../services/guidedFilter.js'
import { segmentRegions, computeRegionPalettes } from '../services/regionSegment.js'
import { regionConstrainedQuantize } from '../services/regionQuantize.js'
import { postProcessGrid } from '../services/gridPostProcess.js'
import { rgbToOklab, oklabDist } from '../utils/colorSpace.js'
import { unsharpMask } from '../services/unsharpMask.js'
import { getStyleList, buildImageOptionsFromStyle, getStyleById } from '../services/qStyleTemplates.js'

const router = Router()

// ============================================
//  简单图片上传
// ============================================
router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })
  res.json({ code: 200, data: { url: `/uploads/${req.file.filename}`, filename: req.file.filename } })
})

// ============================================
//  图片转拼豆网格（核心端点）
//  严格按五阶段顺序执行
// ============================================
// GET /api/image/qstyles — 获取 Q 版风格列表
router.get('/image/qstyles', (req, res) => {
  res.json({ code: 200, data: getStyleList() })
})

// GET /api/image/qstyle/:id — 获取单个风格详情
router.get('/image/qstyle/:id', (req, res) => {
  const style = getStyleById(req.params.id)
  if (!style) return res.status(404).json({ code: 404, message: '风格不存在' })
  res.json({ code: 200, data: style })
})

router.post('/image-to-grid', authOptional, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片' })

  // Q 版风格：自动适配参数
  const qStyle = req.body.qStyle || null
  let targetWidth = parseInt(req.body.targetWidth) || DEFAULT_GRID_SIZE
  const brand = req.body.brand || null

  // 如果指定了 Q 版风格，加载预设参数
  const qStyleOptions = qStyle ? buildImageOptionsFromStyle(qStyle) : null
  if (qStyleOptions) {
    const style = getStyleById(qStyle)
    if (style) {
      targetWidth = parseInt(req.body.targetWidth) || style.recommend_size[0]
      // 注入风格参数到请求中
      if (!req.body.prefilter) req.body.prefilter = qStyleOptions.prefilter
      if (!req.body.crisp) req.body.crisp = qStyleOptions.crisp
      if (!req.body.dither && qStyleOptions.dither) req.body.dither = qStyleOptions.dither
      if (!req.body.segmentation) req.body.segmentation = qStyleOptions.segmentation
    }
  }

  // 算法控制参数
  const rawMode = req.body.raw === 'true' || req.body.raw === '1'  // 1:1还原，不匹配色卡
  const prefilterEnabled = req.body.prefilter === 'true' || req.body.prefilter === '1'
  const crispMode = req.body.crisp !== 'false' && req.body.crisp !== false
  const segmentationEnabled = req.body.segmentation !== 'false' && req.body.segmentation !== false
  const forceDither = req.body.dither === 'true' || req.body.dither === '1'
  const edgeAlignEnabled = req.body.edgeAlign !== 'false' && req.body.edgeAlign !== false

  // 裁剪参数
  const cropX = parseInt(req.body.cropX) || 0
  const cropY = parseInt(req.body.cropY) || 0
  const cropW = parseInt(req.body.cropW) || 0
  const cropH = parseInt(req.body.cropH) || 0

  try {
    const sharp = (await import('sharp')).default
    const autoCrop = req.body.autoCrop === 'true' || req.body.autoCrop === true || req.body.autoCrop === '1'

    // 自动裁剪
    let cropRect = null
    if (autoCrop && !(cropW > 0 && cropH > 0)) {
      try { cropRect = await detectContentRect(sharp, req.file.path) } catch {}
      if (cropRect) console.log(`自动裁剪: (${cropRect.left},${cropRect.top}) ${cropRect.width}×${cropRect.height}`)
    }

    let pipeline = sharp(req.file.path)
    const meta0 = await sharp(req.file.path).metadata()

    if (cropW > 0 && cropH > 0 && (cropW < meta0.width * 0.95 || cropH < meta0.height * 0.95)) {
      pipeline = pipeline.extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    } else if (cropRect && (cropRect.width < meta0.width * 0.95 || cropRect.height < meta0.height * 0.95)) {
      pipeline = pipeline.extract(cropRect)
    }

    const metadata = await pipeline.metadata()
    const targetHeight = parseInt(req.body.targetHeight) ||
      Math.round(targetWidth * (metadata.height / metadata.width))

    // ============================================
    //  预缩放：最近邻缩放到 4× 目标中间分辨率
    //  后续所有算法在此中间分辨率上运行
    // ============================================
    const interW = Math.min(targetWidth * 6, 1200)
    const interH = Math.round(interW * (metadata.height / metadata.width))

    const { data: interData, info: interInfo } = await pipeline
      .resize(interW, interH, { fit: 'fill', kernel: 'nearest' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let workingPixels = interData
    const workingW = interW, workingH = interH

    // ============================================
    //  Raw 模式：1:1 原色还原，不匹配任何系统色卡
    //  直接用原图最近邻缩放到目标尺寸，每像素保留原始 RGB
    // ============================================
    if (rawMode) {
      console.log(`🎨 Raw 1:1 还原模式: ${targetWidth}×${targetHeight} 原色输出`)
      const { data: rawData } = await pipeline
        .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'nearest' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      const grid = []
      for (let y = 0; y < targetHeight; y++) {
        const row = []
        for (let x = 0; x < targetWidth; x++) {
          const i = (y * targetWidth + x) * 3
          const hex = '#' + [rawData[i], rawData[i + 1], rawData[i + 2]]
            .map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
          row.push({ name: hex, hex })
        }
        grid.push(row)
      }

      const responseData = {
        url: `/uploads/${req.file.filename}`,
        grid, gridWidth: targetWidth, gridHeight: targetHeight,
        algorithm: 'raw-1to1',
        colorCount: countUniqueColors(grid),
        beadCount: countNonNullCells(grid),
        beadList: computeBeadList(grid, [])
      }
      return res.json({ code: 200, data: responseData })
    }

    // ============================================
    //  一、前置预处理：引导滤波保边平滑
    //  在原图阶段抹平细碎渐变噪点，保留轮廓边缘
    // ============================================
    if (prefilterEnabled) {
      // 仅在用户明确要求时启用（适合噪点多的照片）
      console.log(`一、引导滤波: r=1, ε=0.005 (${workingW}×${workingH}) [用户启用]`)
      workingPixels = guidedFilter(workingPixels, workingW, workingH, 1, 0.005)
      // 强 USM 锐化补偿滤波的柔和效应
      workingPixels = unsharpMask(workingPixels, workingW, workingH, { amount: 0.8, radius: 1, threshold: 1 })
    } else if (crispMode) {
      // 清晰模式：不做任何平滑，直接锐化原图保留所有细节
      console.log(`一、清晰模式: 跳过平滑，直接USM锐化 (${workingW}×${workingH})`)
      workingPixels = unsharpMask(workingPixels, workingW, workingH, { amount: 0.3, radius: 1, threshold: 0 })
    }

    // 加载珠子颜色
    const labColors = loadBeadColors(brand)

    // ============================================
    //  二、核心第一步：语义分区掩码生成
    //  基于 HSV 自动分割 5 类区域，各区域独立调色板
    // ============================================
    let regionMask = null, regionPalettes = null, segStats = null
    if (segmentationEnabled) {
      console.log(`二、语义分区 (${workingW}×${workingH})`)
      const seg = segmentRegions(workingPixels, workingW, workingH)
      regionMask = seg.mask
      segStats = seg.stats
      regionPalettes = computeRegionPalettes(regionMask, workingW, workingH, workingPixels, labColors)
    }

    // ============================================
    //  三、核心第二步：分区约束纯色量化
    //  各区域独立 K-Means + 固定色板硬映射，无抖动
    // ============================================
    let interGrid, quantStats

    if (forceDither && labColors.length > 0) {
      console.log(`三、Floyd-Steinberg 抖动（回退模式）`)
      const r = floydSteinbergDitherWithRegions(workingW, workingH, workingPixels, labColors, regionMask, regionPalettes)
      interGrid = r.grid
    } else if (segmentationEnabled && regionMask && labColors.length > 0) {
      console.log(`三、分区约束 K-Means 纯色量化`)
      const r = regionConstrainedQuantize(workingPixels, workingW, workingH, regionMask, labColors)
      interGrid = r.grid
      quantStats = r.stats
    } else {
      console.log(`三、简单 Lab 最近邻（降级模式）`)
      interGrid = simpleLabMatch(workingW, workingH, workingPixels, labColors)
    }

    // interGrid 是中间分辨率（~4×目标）的拼豆网格

    // ============================================
    //  3.5 中间网格预清理（轻量连通域过滤，阈值2px）
    //  在下采样前清除中间网格的孤立噪点
    // ============================================
    if (segmentationEnabled && regionMask && regionPalettes) {
      const preClean = postProcessGrid(interGrid, workingW, workingH, regionMask, regionPalettes, {
        minComponentSize: 2,
        morphOpen: false  // 中间网格不用开运算，留给最终后处理
      })
      interGrid = preClean.grid
      console.log(`  中间网格预清理: ${preClean.stats.componentFilter.removed}噪点`)
    }

    // ============================================
    //  四、核心第三步：边缘对齐最近邻像素化
    //  Canny 检测轮廓 → 微调网格偏移 → 多数投票下采样到目标尺寸
    //  每个目标格统计覆盖区域内所有中间像素，取多数颜色
    // ============================================
    let grid, finalW, finalH
    const offsetUsed = { ox: 0, oy: 0 }

    if (edgeAlignEnabled && workingW >= targetWidth * 2) {
      const { computeGridOffset, downsampleGrid } = await import('../services/edgeAlign.js')
      const offset = computeGridOffset(workingPixels, workingW, workingH, targetWidth, targetHeight)
      offsetUsed.ox = offset.ox
      offsetUsed.oy = offset.oy
      console.log(`四、边缘对齐区域感知下采样: ${workingW}×${workingH} → ${targetWidth}×${targetHeight}`)
      grid = downsampleGrid(interGrid, workingW, workingH, targetWidth, targetHeight, regionMask, offset.ox, offset.oy)
    } else {
      const { downsampleGrid } = await import('../services/edgeAlign.js')
      console.log(`四、区域感知下采样: ${workingW}×${workingH} → ${targetWidth}×${targetHeight}`)
      grid = downsampleGrid(interGrid, workingW, workingH, targetWidth, targetHeight, regionMask, 0, 0)
    }
    finalW = targetWidth
    finalH = targetHeight

    // ============================================
    //  五、后处理：连通域净化 + 轮廓补强
    //  三步收尾：连通域过滤 → 轮廓补强 → 形态学开运算
    //
    //  注意：后处理需要目标尺寸的区域掩码。
    //  将中间分辨率的 mask 下采样到目标尺寸。
    // ============================================
    let postStats = null
    if (segmentationEnabled && regionMask && regionPalettes) {
      // 多数投票下采样区域掩码到目标尺寸
      const { downsampleMask } = await import('../services/edgeAlign.js')
      const targetMask = downsampleMask(regionMask, workingW, workingH, finalW, finalH)

      console.log(`五、后处理 (${finalW}×${finalH})`)
      const postResult = postProcessGrid(grid, finalW, finalH, targetMask, regionPalettes, {
        minComponentSize: 3,
        morphOpen: true
      })
      grid = postResult.grid
      postStats = postResult.stats
    }

    // 算法标识
    const algoParts = ['guided-filter', 'semantic-seg', 'kmeans-hardmap']
    if (edgeAlignEnabled) algoParts.splice(3, 0, 'edge-aligned-nn')
    else algoParts.splice(3, 0, 'nn-downsample')
    algoParts.push('postprocess')

    // 材料清单：统计每种珠子的数量
    const beadList = computeBeadList(grid, labColors)

    const responseData = {
      url: `/uploads/${req.file.filename}`,
      grid,
      gridWidth: finalW,
      gridHeight: finalH,
      algorithm: algoParts.join('+'),
      colorCount: countUniqueColors(grid),
      beadCount: countNonNullCells(grid),
      beadList  // [{name, hex, brand, count}, ...] 按数量降序
    }
    if (segStats) responseData.segmentationStats = segStats
    if (quantStats) responseData.quantizeStats = quantStats
    if (postStats) responseData.postProcessStats = postStats
    if (offsetUsed.ox !== 0 || offsetUsed.oy !== 0) responseData.gridOffset = offsetUsed

    res.json({ code: 200, data: responseData })
  } catch (e) {
    console.error('图片转换失败:', e)
    res.status(500).json({ code: 500, message: '图片处理失败: ' + e.message })
  }
})

// ============================================
//  简单 Lab 最邻近匹配（降级方案）
// ============================================
function simpleLabMatch(w, h, pixels, labColors) {
  const grid = []
  for (let y = 0; y < h; y++) {
    const row = []
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const pixelOklab = rgbToOklab(pixels[i], pixels[i + 1], pixels[i + 2])
      let best = labColors[0], bestDist = Infinity
      for (const c of labColors) {
        const d = oklabDist(pixelOklab, c.oklab || c.lab)
        if (d < bestDist) { bestDist = d; best = c }
      }
      row.push(best ? { id: best.id, name: best.name, hex: best.hex.toUpperCase() } : null)
    }
    grid.push(row)
  }
  return grid
}

// ============================================
//  自动检测图片内容边界框
// ============================================
async function detectContentRect(sharp, filePath) {
  try {
    const meta = await sharp(filePath).metadata()
    const scale = Math.min(1, 200 / (meta.width || 400))
    const { data, info } = await sharp(filePath)
      .resize(Math.round((meta.width || 400) * scale), Math.round((meta.height || 400) * scale), { fit: 'fill' })
      .removeAlpha({ background: '#FFFFFF' })
      .raw().toBuffer({ resolveWithObject: true })

    let minX = info.width, minY = info.height, maxX = 0, maxY = 0
    let contentPixels = 0
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 3
        if (data[idx] < 235 || data[idx + 1] < 235 || data[idx + 2] < 235) {
          if (x < minX) minX = x; if (y < minY) minY = y
          if (x > maxX) maxX = x; if (y > maxY) maxY = y
          contentPixels++
        }
      }
    }
    if (contentPixels < (info.width * info.height) * 0.02 || minX >= maxX || minY >= maxY) return null
    const invScale = 1 / scale
    return {
      left: Math.floor(minX * invScale), top: Math.floor(minY * invScale),
      width: Math.ceil((maxX - minX + 1) * invScale), height: Math.ceil((maxY - minY + 1) * invScale)
    }
  } catch { return null }
}

// ============================================
//  材料清单：统计每种珠子的名称、色号、数量
// ============================================
function computeBeadList(grid, beadColors) {
  const counts = new Map() // hex → { name, hex, brand, count }
  for (const row of grid) {
    if (!Array.isArray(row)) continue
    for (const cell of row) {
      if (!cell || !cell.hex) continue
      const entry = counts.get(cell.hex)
      if (entry) { entry.count++ }
      else { counts.set(cell.hex, { name: cell.name, hex: cell.hex, brand: '', count: 1 }) }
    }
  }
  // 从珠子数据库中补全品牌信息
  const beadMap = new Map()
  for (const bc of (beadColors || [])) {
    beadMap.set(bc.hex.toUpperCase(), bc.brand || '')
  }
  const list = [...counts.values()].map(item => ({
    ...item,
    brand: beadMap.get(item.hex) || ''
  }))
  // 按数量降序排列
  list.sort((a, b) => b.count - a.count)
  return list
}

// 统计工具
function countUniqueColors(grid) {
  const colors = new Set()
  for (const row of grid) {
    if (!Array.isArray(row)) continue
    for (const cell of row) { if (cell && cell.hex) colors.add(cell.hex) }
  }
  return colors.size
}
function countNonNullCells(grid) {
  let n = 0
  for (const row of grid) {
    if (!Array.isArray(row)) continue
    for (const cell of row) { if (cell && cell.hex) n++ }
  }
  return n
}

export default router
