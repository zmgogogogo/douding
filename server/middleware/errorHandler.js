// ============================================
//  统一错误处理中间件
//  捕获 AppError 和未预期的异常，统一格式化 JSON 响应
// ============================================
import multer from 'multer'
import { AppError } from '../utils/AppError.js'

/**
 * 全局错误处理中间件
 * 必须在所有路由之后注册
 */
export function errorHandler(err, req, res, _next) {
  // Multer 上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ code: 413, message: '图片过大，请压缩后重试（最大 30MB）' })
    }
    return res.status(400).json({ code: 400, message: err.message || '上传失败' })
  }

  // 业务异常
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({ code: err.code, message: err.message })
  }

  // API 请求的未预期错误
  if (req.path.startsWith('/api/')) {
    console.error('[API错误]', req.method, req.path, err)
    return res.status(500).json({ code: 500, message: err.message || '服务器内部错误' })
  }

  // 非 API 错误交给 Express 默认处理
  _next(err)
}
