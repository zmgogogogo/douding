// ============================================
//  操作日志服务 — 记录管理员所有增删改操作
// ============================================

/**
 * 记录操作日志
 * @param {import('better-sqlite3').Database} dbConn - 数据库连接
 * @param {object} params
 * @param {number} params.adminId - 管理员 ID
 * @param {string} params.adminName - 管理员用户名
 * @param {string} params.module - 操作模块（如 '用户管理'）
 * @param {string} params.action - 操作动作（create/update/delete/login 等）
 * @param {string} [params.targetType] - 目标类型（如 'user', 'design'）
 * @param {number} [params.targetId] - 目标 ID
 * @param {string} [params.detail] - 操作详情（JSON 字符串）
 * @param {string} [params.ip] - 客户端 IP
 * @param {string} [params.userAgent] - 浏览器 UA
 * @param {number} [params.status=1] - 操作结果（1=成功, 0=失败）
 * @param {string} [params.errorMsg] - 错误信息
 * @param {number} [params.durationMs=0] - 耗时（毫秒）
 */
export function logAction(dbConn, {
  adminId,
  adminName,
  module,
  action,
  targetType = null,
  targetId = null,
  detail = '',
  ip = '',
  userAgent = '',
  status = 1,
  errorMsg = '',
  durationMs = 0,
}) {
  try {
    dbConn
      .prepare(
        `INSERT INTO sys_operation_logs (admin_id, admin_name, module, action, target_type, target_id, detail, ip, user_agent, status, error_msg, duration_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(adminId, adminName, module, action, targetType, targetId, detail, ip, userAgent, status, errorMsg, durationMs)
  } catch (err) {
    console.error('[操作日志] 记录失败:', err.message)
  }
}

/**
 * Express 中间件：自动记录请求耗时和异常
 * 用于包裹路由处理函数
 */
export function withOperationLog(module, action, targetType = null) {
  return (req, res, next) => {
    const start = Date.now()
    const originalJson = res.json.bind(res)

    // 劫持 res.json 以便在响应后记录日志
    res.json = function (body) {
      const duration = Date.now() - start
      const isSuccess = body && body.code === 200

      logAction(require('../db/connection.js').default, {
        adminId: req.admin?.id,
        adminName: req.admin?.username,
        module,
        action,
        targetType,
        targetId: req.params?.id ? parseInt(req.params.id) : null,
        detail: req.method !== 'GET' ? JSON.stringify({ method: req.method, path: req.originalUrl }) : '',
        ip: req.ip,
        userAgent: req.headers?.['user-agent'] || '',
        status: isSuccess ? 1 : 0,
        errorMsg: isSuccess ? '' : (body?.message || ''),
        durationMs: duration,
      })
      return originalJson(body)
    }
    next()
  }
}
