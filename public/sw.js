// 豆丁 PWA Service Worker v2 — 离线可用
const CACHE = 'douding-v2'

// 安装：预缓存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/','/favicon.svg','/manifest.json']).catch(() => {})
    )
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

// 网络优先 + 缓存回退（stale-while-revalidate）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) {
    // API 请求：网络优先，失败返回离线提示
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ code: 503, message: '离线模式，数据不可用' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    )
    return
  }
  // 静态资源：缓存优先，后台更新
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone())
          return res
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
  )
})
