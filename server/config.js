// ============================================
//  配置常量 — 集中管理所有配置
// ============================================

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ JWT_SECRET 环境变量未设置！生产环境必须配置 JWT_SECRET')
    }
    console.warn('⚠️  未设置 JWT_SECRET 环境变量，使用开发默认值（仅限本地开发）')
    return 'douding-dev-secret-not-for-production'
  })()
export const PORT = process.env.PORT || 3456
export const JWT_EXPIRES_IN = '30d'
export const BCRYPT_ROUNDS = 10
export const UPLOAD_MAX_SIZE = 30 * 1024 * 1024 // 30MB（手机原图 OCR/导入）
export const ALLOWED_IMAGE_TYPES = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
export const DEFAULT_GRID_SIZE = 58
