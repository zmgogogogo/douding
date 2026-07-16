// 豆丁 PWA Service Worker — 离线缓存核心资源
const CACHE = 'douding-v1'
const ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
]

// 安装：预缓存核心资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 请求：缓存优先，网络回退
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  // API 请求不缓存
  if (e.request.url.includes('/api/')) return
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok && (e.request.url.includes('/assets/') || e.request.url.endsWith('.js') || e.request.url.endsWith('.css'))) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => cached)
    )
  )
})
