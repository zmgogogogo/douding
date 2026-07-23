// ============================================
//  请求日志中间件 — 记录 API 请求耗时和状态
// ============================================

/**
 * API 请求日志中间件
 * 记录每个 /api/ 请求的：方法、路径、状态码、耗时
 */
export function requestLogger(req, res, next) {
  // 仅记录 API 请求
  if (!req.path.startsWith('/api/')) {
    return next()
  }

  const start = Date.now()

  // 在响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode

    // 根据状态码选择日志级别
    if (status >= 500) {
      console.error(`[API] ${req.method} ${req.path} → ${status} (${duration}ms) ❌`)
    } else if (status >= 400) {
      console.warn(`[API] ${req.method} ${req.path} → ${status} (${duration}ms) ⚠️`)
    } else {
      console.log(`[API] ${req.method} ${req.path} → ${status} (${duration}ms)`)
    }
  })

  next()
}
