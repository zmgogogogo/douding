// ============================================
//  工具函数 — userPublic, formatDesign, countBeads
// ============================================

/** 用户公开信息（脱敏） */
export function userPublic(u) {
  return {
    id: u.id,
    username: u.username,
    nickname: u.nickname || u.username,
    avatar: u.avatar,
    bio: u.bio,
    isVip: !!u.is_vip,
    vipExpireAt: u.vip_expire_at,
    createdAt: u.created_at,
  }
}

/** 格式化设计数据 */
export function formatDesign(d) {
  if (!d) return null
  return {
    id: d.id,
    userId: d.user_id,
    folderId: d.folder_id,
    title: d.title,
    description: d.description || '',
    gridWidth: d.grid_width,
    gridHeight: d.grid_height,
    gridData: safeParseJSON(d.grid_data),
    thumbnail: d.thumbnail,
    isPublic: !!d.is_public,
    status: d.status !== undefined ? d.status : 1,
    publishedAt: d.published_at || null,
    beadCount: d.bead_count || 0,
    colorCount: d.color_count || 0,
    likesCount: d.likes_count || 0,
    favoritesCount: d.favorites_count || 0,
    viewsCount: d.views_count || 0,
    brand: d.brand || 'Hama',
    // v11 新增字段
    copyrightDesc: d.copyright_desc || '',
    isRemix: !!d.is_remix,
    difficulty: d.difficulty || 1,
    costTime: d.cost_time || '',
    realSize: d.real_size || '',
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

/** 安全解析 JSON */
export function safeParseJSON(str) {
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

/** 统计珠子数量和颜色数 */
export function countBeads(gridData) {
  let beadCount = 0
  const colors = new Set()
  try {
    const grid = typeof gridData === 'string' ? JSON.parse(gridData) : gridData
    if (Array.isArray(grid)) {
      for (const row of grid) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          if (cell && cell.hex) {
            beadCount++
            colors.add(cell.hex)
          }
        }
      }
    }
  } catch {}
  return { beadCount, colorCount: colors.size }
}
