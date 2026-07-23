// ============================================
//  AppError — 统一业务异常类
//  所有 service 层抛出 AppError，由错误处理中间件统一捕获
// ============================================

/**
 * 业务异常
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - 用户可读的错误信息
   * @param {number} code - 业务错误码（如 400, 404, 409）
   * @param {number} [httpStatus] - HTTP 状态码（默认与 code 一致）
   */
  constructor(message, code = 400, httpStatus) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus || code
    // 保留原始错误栈
    Error.captureStackTrace?.(this, AppError)
  }

  /** 快捷创建 400 Bad Request */
  static badRequest(message) {
    return new AppError(message, 400)
  }

  /** 快捷创建 401 Unauthorized */
  static unauthorized(message = '请先登录') {
    return new AppError(message, 401)
  }

  /** 快捷创建 403 Forbidden */
  static forbidden(message = '无权限访问') {
    return new AppError(message, 403)
  }

  /** 快捷创建 404 Not Found */
  static notFound(message = '资源不存在') {
    return new AppError(message, 404)
  }

  /** 快捷创建 409 Conflict */
  static conflict(message) {
    return new AppError(message, 409)
  }

  /** 快捷创建 500 Internal Server Error */
  static internal(message = '服务器内部错误') {
    return new AppError(message, 500)
  }
}
