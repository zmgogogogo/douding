// ============================================
//  拼豆转换管道诊断工具
//  用法：node server/diagnose.js <图片路径>
//  逐阶段测试并输出中间结果
// ============================================
import sharp from 'sharp'
import { guidedFilter } from './services/guidedFilter.js'
import { segmentRegions, computeRegionPalettes } from './services/regionSegment.js'
import { regionConstrainedQuantize } from './services/regionQuantize.js'
import { postProcessGrid } from './services/gridPostProcess.js'
import { downsampleGrid, computeGridOffset, downsampleMask } from './services/edgeAlign.js'
import { loadBeadColors } from './services/colorMatch.js'
import fs from 'fs'
import path from 'path'

const IMG = process.argv[2]
if (!IMG) {
  console.log('用法: node server/diagnose.js <图片路径>')
  process.exit(1)
}

const TARGET = 60
const OUT = './diagnose_output'
fs.mkdirSync(OUT, { recursive: true })

async function savePixels(filename, pixels, w, h) {
  await sharp(pixels, { raw: { width: w, height: h, channels: 3 } }).toFile(
    path.join(OUT, filename)
  )
}

async function saveGrid(filename, grid, w, h) {
  const pixels = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = grid[y]?.[x]
      const off = (y * w + x) * 3
      if (cell?.hex) {
        const h = cell.hex.replace('#', '')
        pixels[off] = parseInt(h.substring(0, 2), 16)
        pixels[off + 1] = parseInt(h.substring(2, 4), 16)
        pixels[off + 2] = parseInt(h.substring(4, 6), 16)
      }
    }
  }
  await savePixels(filename, pixels, w, h)
}

function countColors(grid) {
  const s = new Set()
  for (const row of grid) for (const c of row) if (c?.hex) s.add(c.hex)
  return s.size
}

async function main() {
  console.log('=== 拼豆管道诊断 ===')
  console.log('目标尺寸:', TARGET, '×', TARGET)

  // 原图加载
  const meta = await sharp(IMG).metadata()
  console.log('原图:', meta.width, '×', meta.height)

  // 珠子颜色
  const labColors = loadBeadColors(null)
  console.log('珠子色板:', labColors.length, '色')

  // ====== 预缩放 ======
  const interW = Math.min(TARGET * 4, 800)
  const interH = Math.round(interW * (meta.height / meta.width))
  console.log('中间分辨率:', interW, '×', interH)

  const { data: interData, info: interInfo } = await sharp(IMG)
    .resize(interW, interH, { fit: 'fill', kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  await savePixels('0_intermediate.png', interData, interW, interH)
  console.log('  → 0_intermediate.png')

  // ====== 一、引导滤波 ======
  console.log('\n一、引导滤波 r=4 ε=0.02')
  const filtered = guidedFilter(interData, interW, interH, 4, 0.02)
  await savePixels('1_guided_filter.png', filtered, interW, interH)
  console.log('  → 1_guided_filter.png')

  // ====== 二、语义分区 ======
  console.log('\n二、语义分区')
  const { mask, stats: segStats } = segmentRegions(filtered, interW, interH)
  console.log('  分区:', JSON.stringify(segStats))

  // 保存掩码可视化
  const maskVis = new Uint8Array(interW * interH * 3)
  const pal = [
    [255, 255, 255],
    [30, 30, 30],
    [255, 200, 150],
    [80, 120, 220],
    [255, 100, 100],
  ]
  for (let i = 0; i < interW * interH; i++) {
    const off = i * 3
    const c = pal[mask[i]] || pal[4]
    maskVis[off] = c[0]
    maskVis[off + 1] = c[1]
    maskVis[off + 2] = c[2]
  }
  await savePixels('2_segmentation.png', maskVis, interW, interH)
  console.log('  → 2_segmentation.png (白=背景 黑=轮廓 橙=皮肤 蓝=主色块 红=细节)')

  const regionPalettes = computeRegionPalettes(mask, interW, interH, filtered, labColors)

  // ====== 三、量化 ======
  console.log('\n三、K-Means 纯色量化')
  const qResult = regionConstrainedQuantize(filtered, interW, interH, mask, labColors)
  console.log('  量化统计:', JSON.stringify(qResult.stats))
  await saveGrid('3_quantized_intermediate.png', qResult.grid, interW, interH)
  console.log('  → 3_quantized_intermediate.png')

  // ====== 3.5 预清理 ======
  console.log('\n3.5 中间网格预清理')
  const preClean = postProcessGrid(qResult.grid, interW, interH, mask, regionPalettes, {
    minComponentSize: 2,
    morphOpen: false,
  })
  const cleanInterGrid = preClean.grid
  console.log('  清理:', preClean.stats.componentFilter.removed, '噪点')
  await saveGrid('3_5_precleaned.png', cleanInterGrid, interW, interH)
  console.log('  → 3_5_precleaned.png')

  // ====== 四、边缘对齐下采样 ======
  console.log('\n四、边缘对齐多数投票下采样')
  const offset = computeGridOffset(filtered, interW, interH, TARGET, TARGET)
  console.log('  偏移:', JSON.stringify(offset))
  const grid = downsampleGrid(
    cleanInterGrid,
    interW,
    interH,
    TARGET,
    TARGET,
    mask,
    offset.ox,
    offset.oy
  )
  await saveGrid('4_downsampled.png', grid, TARGET, TARGET)
  console.log('  → 4_downsampled.png  (' + countColors(grid) + '色)')

  // 掩码下采样
  const targetMask = downsampleMask(mask, interW, interH, TARGET, TARGET)

  // ====== 五、后处理 ======
  console.log('\n五、后处理')
  const postResult = postProcessGrid(grid, TARGET, TARGET, targetMask, regionPalettes, {
    minComponentSize: 4,
    morphOpen: true,
  })
  console.log('  后处理:', JSON.stringify(postResult.stats))
  await saveGrid('5_final.png', postResult.grid, TARGET, TARGET)
  console.log('  → 5_final.png  (' + countColors(postResult.grid) + '色)')

  console.log('\n=== 诊断完成 ===')
  console.log('输出目录:', OUT)
  console.log('逐张检查: 0→1→2→3→3_5→4→5 定位杂色引入阶段')
}

main().catch((e) => {
  console.error('诊断失败:', e)
  process.exit(1)
})
