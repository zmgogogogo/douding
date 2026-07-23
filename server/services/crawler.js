// ============================================
//  网页爬虫服务 — 小红书/外部链接图片提取
// ============================================

/**
 * 解析小红书分享链接，提取图片
 * @param {string} url - 小红书分享链接
 * @returns {Promise<{images: Array<string>, title: string, sourceUrl: string}>}
 */
export async function parseXhsLink(url) {
  let cheerio
  try {
    cheerio = (await import('cheerio')).default
  } catch {
    throw new Error('爬虫服务未安装，请运行: npm install cheerio')
  }

  // 验证 URL
  if (!url || (!url.includes('xiaohongshu.com') && !url.includes('xhslink.com'))) {
    throw new Error('请提供有效的小红书分享链接')
  }

  // 模拟移动端 User-Agent
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  }

  let html
  try {
    const resp = await fetch(url, { headers, redirect: 'follow' })
    html = await resp.text()
  } catch (e) {
    throw new Error('无法访问该链接，请检查链接是否正确或尝试手动上传截图')
  }

  const $ = cheerio.load(html)
  const images = []
  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '未命名'

  // 提取 og:image
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) images.push(ogImage)

  // 提取页面中的大图
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (src && (src.includes('xhscdn') || src.includes('sns-img') || src.includes('sns-webpic'))) {
      if (!images.includes(src)) images.push(src)
    }
  })

  if (images.length === 0) {
    throw new Error('未能从页面提取到图片，该内容可能需登录才能访问。请尝试手动截图后上传')
  }

  return { images, title, sourceUrl: url }
}

/**
 * 下载远程图片到本地
 * @param {string} imageUrl - 远程图片 URL
 * @param {string} savePath - 本地保存路径
 * @returns {Promise<string>} 本地文件路径
 */
export async function downloadImage(imageUrl, savePath) {
  const resp = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      Referer: 'https://www.xiaohongshu.com/',
    },
  })

  if (!resp.ok) throw new Error(`下载图片失败: HTTP ${resp.status}`)

  const fs = await import('fs')
  const buffer = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync(savePath, buffer)
  return savePath
}
