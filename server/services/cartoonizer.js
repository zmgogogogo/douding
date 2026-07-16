// ============================================
//  cartoonizer — 照片 Q 版卡通化处理
//  本地：posterize 色块化 + median 平滑 + 边缘叠加
//  可选：通义万相 API 增强
// ============================================
import sharp from 'sharp'

export async function photoToCartoon(inputPath, options = {}) {
  const { style = 'q_big_head', targetW = 512, targetH = 512 } = options

  // 尝试 AI API
  const aiResult = await tryAiCartoonize(inputPath, style, targetW, targetH)
  if (aiResult) return aiResult

  return localCartoonize(inputPath, targetW, targetH, style)
}

/**
 * 本地卡通化（posterize + median + edge overlay）
 */
async function localCartoonize(inputPath, w, h, style) {
  const sp = getStyleParams(style)

  // Step 1: 人脸居中裁剪 + 缩小（丢掉高频细节 = 自然色块化）
  const smallW = Math.floor(w / 2)
  const smallH = Math.floor(h / 2)
  const small = await sharp(inputPath)
    .resize(smallW, smallH, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer()

  // Step 2: Median 平滑（去除噪点，保持边缘）
  const smoothed = await sharp(small)
    .median(sp.smoothRadius)
    .png()
    .toBuffer()

  // Step 3: 放大回目标尺寸（nearest 保持像素块感）
  const upscaled = await sharp(smoothed)
    .resize(w, h, { fit: 'fill', kernel: 'nearest' })
    .png()
    .toBuffer()

  // Step 4: 生成边缘
  const edges = await generateEdges(inputPath, w, h, sp.edgeStrength)

  // Step 5: 合成：颜色图 × 边缘图
  const result = await sharp(upscaled)
    .composite([{ input: edges, blend: 'multiply' }])
    .sharpen({ sigma: 0.5 })
    .png()
    .toBuffer()

  return result
}

/**
 * 边缘检测 + 黑线描边
 */
async function generateEdges(inputPath, w, h, strength) {
  // 灰度 + 轻微模糊 + 边缘检测 + 阈值 → 黑白边缘图
  const edgeBuffer = await sharp(inputPath)
    .resize(w, h, { fit: 'cover', position: 'top' })
    .greyscale()
    .median(3)
    .convolve({
      width: 3, height: 3,
      kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
    })
    .linear(strength, -(128 * (strength - 1)))
    .threshold(60)
    .png()
    .toBuffer()

  // 白色边缘 → 反转为黑线白底
  return sharp(edgeBuffer)
    .negate()
    .png()
    .toBuffer()
}

// ============================================
//  AI API（通义万相）
// ============================================

async function tryAiCartoonize(inputPath, style, w, h) {
  const apiKey = process.env.ALIYUN_API_KEY
  if (!apiKey) return null
  try {
    return await tongyiWanxiang(inputPath, style, w, h, apiKey)
  } catch (e) {
    console.warn('AI 卡通化失败，降级本地:', e.message)
    return null
  }
}

async function tongyiWanxiang(inputPath, style, w, h, apiKey) {
  const fs = await import('fs')
  const imgBase64 = fs.readFileSync(inputPath).toString('base64')

  const prompts = {
    q_big_head: 'Q版卡通头像，大头小身，圆润可爱，大眼睛，黑色轮廓描边，扁平化色块，无阴影，纯白背景',
    cute_sticker: '卡通贴纸风格，粗黑外轮廓，高饱和纯色块，完全无阴影，白底',
    simple_line: '简约扁平插画，莫兰迪低饱和配色，细线条，纯色块，极简',
    pet_cute: 'Q版可爱宠物，圆润脸型大眼睛，简化毛发，黑色描边，纯色块',
    couple_double: 'Q版双人卡通，大头小身，可爱互动，黑色描边，扁平色块，简洁背景'
  }

  const resp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/generation', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'wanx-style-cartoon',
      input: {
        prompt: prompts[style] || prompts.q_big_head,
        negative_prompt: '写实，照片，复杂背景，渐变，阴影，模糊，噪点，变形',
        base_image: imgBase64
      },
      parameters: { size: `${w}*${h}`, n: 1 }
    })
  })

  const data = await resp.json()
  const url = data?.output?.results?.[0]?.url
  if (url) {
    const imgRes = await fetch(url)
    return Buffer.from(await imgRes.arrayBuffer())
  }
  return null
}

function getStyleParams(style) {
  const p = {
    q_big_head:   { smoothRadius: 3, edgeStrength: 2.0 },
    cute_sticker: { smoothRadius: 5, edgeStrength: 3.0 },
    simple_line:  { smoothRadius: 1, edgeStrength: 1.5 },
    pet_cute:     { smoothRadius: 3, edgeStrength: 2.0 },
    couple_double:{ smoothRadius: 3, edgeStrength: 2.0 }
  }
  return p[style] || p.q_big_head
}
