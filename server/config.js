// ============================================
//  配置常量 — 集中管理所有配置
// ============================================

export const JWT_SECRET = process.env.JWT_SECRET || 'douding-secret-key-change-in-production'
export const PORT = process.env.PORT || 3456
export const JWT_EXPIRES_IN = '30d'
export const BCRYPT_ROUNDS = 10
export const UPLOAD_MAX_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
export const DEFAULT_GRID_SIZE = 58
