// ============================================
//  数据看板服务 — KPI 计算和数据聚合
// ============================================

/**
 * 获取核心统计指标
 * @param {import('better-sqlite3').Database} dbConn
 */
export function getDashboardStats(dbConn) {
  // 总用户数
  const totalUsers = dbConn.prepare('SELECT COUNT(*) as c FROM users').get().c

  // 今日新增用户
  const todayNewUsers = dbConn.prepare(
    "SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')"
  ).get().c

  // 昨日新增用户（用于环比）
  const yesterdayNewUsers = dbConn.prepare(
    "SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now', '-1 day')"
  ).get().c

  // 总作品数
  const totalDesigns = dbConn.prepare('SELECT COUNT(*) as c FROM designs').get().c

  // 公开作品数
  const publicDesigns = dbConn.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get().c

  // 今日新增作品
  const todayNewDesigns = dbConn.prepare(
    "SELECT COUNT(*) as c FROM designs WHERE date(created_at) = date('now')"
  ).get().c

  // 昨日新增作品
  const yesterdayNewDesigns = dbConn.prepare(
    "SELECT COUNT(*) as c FROM designs WHERE date(created_at) = date('now', '-1 day')"
  ).get().c

  // 今日活跃用户（有操作设计的用户）
  const todayActiveUsers = dbConn.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM designs WHERE date(updated_at) = date('now')"
  ).get().c

  // 7日活跃用户
  const weekActiveUsers = dbConn.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM designs WHERE updated_at >= datetime('now', '-7 days')"
  ).get().c

  // 珠子品牌数
  const brandCount = dbConn.prepare('SELECT COUNT(*) as c FROM bead_brands').get().c

  // 珠子颜色总数
  const colorCount = dbConn.prepare('SELECT COUNT(*) as c FROM bead_colors').get().c

  // Banner 数
  const bannerCount = dbConn.prepare('SELECT COUNT(*) as c FROM banners').get().c

  // 管理员数
  const adminCount = dbConn.prepare('SELECT COUNT(*) as c FROM sys_admins').get().c

  // VIP 用户数
  const vipUsers = dbConn.prepare('SELECT COUNT(*) as c FROM users WHERE is_vip = 1').get().c

  // 制作模式统计
  const totalMakeSessions = dbConn.prepare('SELECT COUNT(*) as c FROM make_sessions').get().c
  const completedMakes = dbConn.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE status = 'completed'").get().c
  const inProgressMakes = dbConn.prepare("SELECT COUNT(*) as c FROM make_sessions WHERE status = 'in_progress'").get().c
  const avgDuration = dbConn.prepare(
    "SELECT COALESCE(AVG(total_duration), 0) as a FROM make_sessions WHERE status = 'completed' AND total_duration > 0"
  ).get().a

  const makeCompletionRate = totalMakeSessions > 0
    ? Math.round((completedMakes / totalMakeSessions) * 100)
    : 0

  // 今日制作
  const todayMakes = dbConn.prepare(
    "SELECT COUNT(*) as c FROM make_sessions WHERE date(updated_at) = date('now') AND status = 'completed'"
  ).get().c

  return {
    totalUsers,
    todayNewUsers,
    yesterdayNewUsers,
    totalDesigns,
    publicDesigns,
    todayNewDesigns,
    yesterdayNewDesigns,
    todayActiveUsers,
    weekActiveUsers,
    brandCount,
    colorCount,
    bannerCount,
    adminCount,
    vipUsers,
    // 制作统计
    totalMakeSessions,
    completedMakes,
    inProgressMakes,
    avgDuration: Math.round(avgDuration),
    makeCompletionRate,
    todayMakes,
  }
}

/**
 * 获取趋势数据（近 N 天）
 * @param {import('better-sqlite3').Database} dbConn
 * @param {number} days - 天数（默认 30）
 */
export function getTrendData(dbConn, days = 30) {
  const users = []
  const designs = []

  for (let i = days - 1; i >= 0; i--) {
    const date = `date('now', '-${i} day')`

    const userCount = dbConn.prepare(
      `SELECT COUNT(*) as c FROM users WHERE date(created_at) = ${date}`
    ).get().c

    const designCount = dbConn.prepare(
      `SELECT COUNT(*) as c FROM designs WHERE date(created_at) = ${date}`
    ).get().c

    const row = dbConn.prepare(`SELECT ${date} as d`).get()
    const label = row.d

    users.push({ date: label, count: userCount })
    designs.push({ date: label, count: designCount })
  }

  return { users, designs }
}

/**
 * 获取热门设计排行（按点赞数）
 * @param {import('better-sqlite3').Database} dbConn
 * @param {number} limit - 数量（默认 10）
 */
export function getTopDesigns(dbConn, limit = 10) {
  return dbConn.prepare(
    `SELECT id, title, likes_count, views_count, bead_count, color_count, thumbnail
     FROM designs WHERE is_public = 1
     ORDER BY likes_count DESC LIMIT ?`
  ).all(limit)
}

/**
 * 获取品牌分布数据
 * @param {import('better-sqlite3').Database} dbConn
 */
export function getBrandDistribution(dbConn) {
  return dbConn.prepare(
    `SELECT brand, COUNT(*) as count FROM designs
     WHERE brand IS NOT NULL AND brand != ''
     GROUP BY brand ORDER BY count DESC`
  ).all()
}

/**
 * 获取最新操作日志
 * @param {import('better-sqlite3').Database} dbConn
 * @param {number} limit - 数量（默认 10）
 */
export function getRecentLogs(dbConn, limit = 10) {
  return dbConn.prepare(
    `SELECT * FROM sys_operation_logs ORDER BY created_at DESC LIMIT ?`
  ).all(limit)
}

/**
 * 获取内容状态分布
 */
export function getContentStatusDistribution(dbConn) {
  const published = dbConn.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 1').get().c
  const private_count = dbConn.prepare('SELECT COUNT(*) as c FROM designs WHERE is_public = 0').get().c
  return { published, private: private_count }
}

/**
 * 获取图纸制作排行（被制作次数最多的图纸 Top N）
 */
export function getMakeRanking(dbConn, limit = 20) {
  return dbConn.prepare(
    `SELECT d.id, d.title, d.grid_width, d.grid_height, d.thumbnail,
      COUNT(ms.id) as make_count,
      COUNT(DISTINCT ms.user_id) as maker_count
     FROM designs d
     LEFT JOIN make_sessions ms ON d.id = ms.design_id AND ms.status = 'completed'
     GROUP BY d.id
     HAVING make_count > 0
     ORDER BY make_count DESC
     LIMIT ?`
  ).all(limit)
}

/**
 * 获取制作记录管理列表（按用户/图纸筛选）
 */
export function getMakeRecordList(dbConn, { page = 1, limit = 20, userId, designId, startDate, endDate } = {}) {
  const conditions = []
  const params = []

  if (userId) { conditions.push('ms.user_id = ?'); params.push(userId) }
  if (designId) { conditions.push('ms.design_id = ?'); params.push(designId) }
  if (startDate) { conditions.push('date(ms.updated_at) >= ?'); params.push(startDate) }
  if (endDate) { conditions.push('date(ms.updated_at) <= ?'); params.push(endDate) }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  const offset = (Math.max(1, page) - 1) * limit

  const rows = dbConn.prepare(
    `SELECT ms.*, d.title as design_title, u.username, u.nickname
     FROM make_sessions ms
     JOIN designs d ON ms.design_id = d.id
     JOIN users u ON ms.user_id = u.id
     ${where}
     ORDER BY ms.updated_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset)

  const total = dbConn.prepare(
    `SELECT COUNT(*) as c FROM make_sessions ms
     JOIN designs d ON ms.design_id = d.id
     JOIN users u ON ms.user_id = u.id
     ${where}`
  ).get(...params)

  const list = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    nickname: r.nickname,
    designId: r.design_id,
    designTitle: r.design_title,
    archiveName: r.archive_name,
    currentStep: r.current_step,
    stepMode: r.step_mode,
    totalDuration: r.total_duration,
    status: r.status,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
  }))

  return { list, total: total?.c || 0 }
}
