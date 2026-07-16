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
//  AI API（Replicate 优先，通义万相备选）
// ============================================

async function tryAiCartoonize(inputPath, style, w, h) {
  // 方案A：Replicate（免费额度，像素画专用模型）
  const replicateKey = process.env.REPLICATE_API_KEY
  if (replicateKey) {
    try {
      return await replicateCartoon(inputPath, style, w, h, replicateKey)
    } catch (e) { console.warn('Replicate 失败，尝试备选:', e.message) }
  }

  // 方案B：通义万相
  const aliKey = process.env.ALIYUN_API_KEY
  if (aliKey) {
    try {
      return await tongyiCartoon(inputPath, style, w, h, aliKey)
    } catch (e) { console.warn('通义万相失败:', e.message) }
  }

  return null
}

/**
 * Replicate API — retro-diffusion 像素画专用模型
 * 新用户有免费额度，$0.002-0.005/张
 */
async function replicateCartoon(inputPath, style, w, h, apiKey) {
  const fs = await import('fs')
  const imgBase64 = fs.readFileSync(inputPath).toString('base64')
  const dataUrl = `data:image/jpeg;base64,${imgBase64}`

  const prompts = {
    q_big_head: 'chibi cartoon portrait, big head small body 1:1 ratio, cute big eyes, black outline, flat color blocks, no shading, clean white background, pixel art style',
    cute_sticker: 'sticker style cartoon, thick black outline, bright saturated flat colors, no shadows, white background, simple cute design, pixel art',
    simple_line: 'minimalist flat illustration, muted pastel colors, thin lines, large solid color areas, simple elegant, pixel art style',
    pet_cute: 'chibi cute pet, round face big eyes, simplified fur, black outline, flat colors, pixel art style',
    couple_double: 'chibi couple cartoon, two characters, big heads small bodies, cute interaction, black outlines, flat colors, simple background, pixel art'
  }

  // 使用 Replicate 的 retro-diffusion 模型
  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: apiKey })

  const output = await replicate.run(
    'catacolabs/retro-diffusion:378394eb258bccf1b0ba3067ea90dc10178f43f274fe33e9f20f2265ab1989f0',
    {
      input: {
        prompt: prompts[style] || prompts.q_big_head,
        negative_prompt: 'realistic, photo, complex background, gradient, shadows, blur, noise, ugly, deformed, complex textures',
        image: dataUrl,
        width: w,
        height: h,
        num_outputs: 1,
        num_inference_steps: 25,
        guidance_scale: 7.5
      }
    }
  )

  // output 是图片 URL 数组
  const imgUrl = Array.isArray(output) ? output[0] : output
  if (imgUrl) {
    const imgRes = await fetch(imgUrl)
    return Buffer.from(await imgRes.arrayBuffer())
  }
  return null
}

/**
 * 通义万相（备选）
 */
async function tongyiCartoon(inputPath, style, w, h, apiKey) {
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
