// ============================================
//  网页爬虫服务 — 小红书/外部链接图片提取
//  双策略：OG 元标签解析（主路径）+ 页面 img 提取（兜底）
// ============================================

/**
 * 校验是否为有效的小红书链接
 * @param {string} url
 * @returns {{ valid: boolean, noteId?: string, reason?: string }}
 */
export function validateXhsLink(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: '请输入链接' }
  }

  const trimmed = url.trim()

  // 支持短链：xhslink.com
  const shortPattern = /^https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/
  // 支持长链：xiaohongshu.com/explore/ 或 /item/
  const longPattern = /^https?:\/\/(www\.|mobile\.)?xiaohongshu\.com\/(explore|discovery\/item)\/[a-zA-Z0-9]+/
  // 支持分享链接
  const sharePattern = /^https?:\/\/www\.xiaohongshu\.com\/discovery\/item\/([a-zA-Z0-9]+)/

  if (shortPattern.test(trimmed) || longPattern.test(trimmed) || sharePattern.test(trimmed)) {
    // 尝试提取笔记 ID
    const idMatch = trimmed.match(/\/([a-zA-Z0-9]{16,})\b/)
    return { valid: true, noteId: idMatch ? idMatch[1] : null }
  }

  return { valid: false, reason: '请输入有效的小红书笔记链接（支持 xhslink.com / xiaohongshu.com）' }
}

/**
 * 从 HTML 中提取笔记元数据
 * @param {string} html - 页面 HTML
 * @param {string} sourceUrl - 原始链接
 * @returns {{ title: string, authorName: string, coverUrl: string, imageUrls: string[] }}
 */
function extractNoteMeta(html, sourceUrl) {
  // 提取 og:title（笔记标题）
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+name="og:title"\s+content="([^"]*)"/i)
  const title = titleMatch
    ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/').trim()
    : '小红书笔记'

  // 提取 og:description / author
  const authorMatch = html.match(/<meta\s+property="og:article:author"\s+content="([^"]*)"/i)
    || html.match(/nickname[":]\s*["']([^"']+)["']/i)
    || html.match(/"nickname"\s*:\s*"([^"]+)"/i)
  const authorName = authorMatch ? authorMatch[1].trim() : '小红书用户'

  // 提取 og:image（封面图）
  const coverMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)
  const coverUrl = coverMatch ? coverMatch[1] : null

  // 提取所有图片 URL
  const imageUrls = []
  const seen = new Set()

  // 优先提取 og:image
  if (coverUrl && !seen.has(coverUrl)) {
    imageUrls.push(coverUrl)
    seen.add(coverUrl)
  }

  // 提取页面中 CDN 图片（小红书图床特征）
  const imgPatterns = [
    /https?:\/\/sns-webpic-qc\.xhscdn\.com\/[^"'\s)]+/g,
    /https?:\/\/ci\.xiaohongshu\.com\/[^"'\s)]+/g,
    /https?:\/\/sns-img-hw\.xhscdn\.com\/[^"'\s)]+/g,
    /https?:\/\/sns-avatar-qc\.xhscdn\.com\/[^"'\s)]+/g,
  ]

  for (const pattern of imgPatterns) {
    const matches = html.match(pattern) || []
    for (const m of matches) {
      const clean = m.replace(/[!"';,\s]+$/, '').trim()
      if (!seen.has(clean)) {
        imageUrls.push(clean)
        seen.add(clean)
      }
    }
  }

  // 兜底：提取所有 img src（排除图标、头像等小图）
  if (imageUrls.length === 0) {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi
    let m
    while ((m = imgRegex.exec(html)) !== null) {
      const src = m[1]
      if (
        !seen.has(src)
        && !src.includes('data:')
        && !src.includes('beacon')
        && !src.includes('favicon')
        && (src.includes('xhscdn') || src.includes('sns-img') || src.includes('sns-webpic') || src.startsWith('http'))
      ) {
        imageUrls.push(src)
        seen.add(src)
      }
    }
  }

  return { title, authorName, coverUrl: coverUrl || (imageUrls[0] || null), imageUrls }
}

/**
 * 解析小红书分享链接，提取笔记信息和图片列表
 * @param {string} url - 小红书分享链接
 * @returns {Promise<{ noteId: string|null, title: string, authorName: string, coverUrl: string|null, imageUrls: string[], imageCount: number, sourceUrl: string }>}
 */
export async function parseXhsLink(url) {
  // 1. 链接格式校验
  const validation = validateXhsLink(url)
  if (!validation.valid) {
    throw new Error(validation.reason || '链接格式无效')
  }

  // 2. 模拟移动端 User-Agent
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  }

  // 3. 请求页面
  let html
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000) // 15 秒超时

    const resp = await fetch(url.trim(), {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!resp.ok) {
      if (resp.status === 404) throw new Error('笔记不存在或已被删除')
      if (resp.status === 403) throw new Error('笔记为私密内容，无法解析')
      throw new Error(`无法访问该链接 (HTTP ${resp.status})`)
    }

    html = await resp.text()

    // 检测是否被重定向到登录页
    if (html.includes('请登录') || html.includes('login-container') || html.includes('verify')) {
      throw new Error('该内容需要登录才能访问，请尝试手动截图后上传')
    }
  } catch (e) {
    if (e.message.includes('笔记不') || e.message.includes('私密') || e.message.includes('登录') || e.message.includes('手动截图')) {
      throw e // 重新抛出自定义错误
    }
    if (e.name === 'AbortError') {
      throw new Error('链接解析超时，请检查网络后重试')
    }
    throw new Error('无法访问该链接，请检查链接是否正确或尝试手动上传截图')
  }

  // 4. 提取元数据
  const meta = extractNoteMeta(html, url.trim())

  // 5. 兜底：如果完全没有提取到图片
  if (meta.imageUrls.length === 0) {
    throw new Error('未能从页面提取到图片，该内容可能需登录才能访问。请尝试手动截图后上传')
  }

  return {
    noteId: validation.noteId,
    title: meta.title,
    authorName: meta.authorName,
    coverUrl: meta.coverUrl,
    imageUrls: meta.imageUrls,
    imageCount: meta.imageUrls.length,
    sourceUrl: url.trim(),
  }
}

/**
 * 下载远程图片到本地
 * @param {string} imageUrl - 远程图片 URL
 * @param {string} savePath - 本地保存路径
 * @returns {Promise<string>} 本地文件路径
 */
export async function downloadImage(imageUrl, savePath) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000) // 10 秒超时

  try {
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.xiaohongshu.com/',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    })

    if (!resp.ok) throw new Error(`下载图片失败: HTTP ${resp.status}`)

    const fs = await import('fs')
    const buffer = Buffer.from(await resp.arrayBuffer())
    fs.writeFileSync(savePath, buffer)
    return savePath
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error('图片下载超时')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}
