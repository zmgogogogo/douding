// ============================================
//  统一响应格式 — 所有路由使用统一的成功/失败/分页响应
// ============================================

/**
 * 成功响应
 * @param {*} data - 响应数据
 * @returns {{ code: 200, data: * }}
 */
export function success(data) {
  return { code: 200, data }
}

/**
 * 失败响应（仅创建对象，需调用 res.status().json()）
 * @param {number} code - 错误码
 * @param {string} message - 错误消息
 * @returns {{ code: number, message: string }}
 */
export function fail(code, message) {
  return { code, message }
}

/**
 * 分页响应
 * @param {Array} list - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页条数
 * @returns {{ code: 200, data: { list, total, page, pageSize } }}
 */
export function paginated(list, total, page, pageSize) {
  return {
    code: 200,
    data: { list, total, page, pageSize },
  }
}

/**
 * Express 响应扩展（挂载到 res 对象上的便捷方法）
 * 使用方式：在路由中 app.use() 此中间件后，可直接 res.success(data)
 */
export function responseMiddleware(req, res, next) {
  res.success = (data) => res.json(success(data))
  res.fail = (code, message, httpStatus = 400) => res.status(httpStatus).json(fail(code, message))
  res.paginated = (list, total, page, pageSize) =>
    res.json(paginated(list, total, page, pageSize))
  next()
}
