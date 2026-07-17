// 强制重新导入色卡数据（部署后色卡未更新时使用）
import { reseedBeads } from '../db/seed.js'

const before = import('../db/connection.js').then(({ default: db }) => ({
  brands: db.prepare('SELECT COUNT(*) c FROM bead_brands').get().c,
  colors: db.prepare('SELECT COUNT(*) c FROM bead_colors').get().c,
}))

const prev = await before
console.log(`导入前：${prev.brands} 品牌，${prev.colors} 色`)

reseedBeads()

const db = (await import('../db/connection.js')).default
const after = {
  brands: db.prepare('SELECT COUNT(*) c FROM bead_brands').get().c,
  colors: db.prepare('SELECT COUNT(*) c FROM bead_colors').get().c,
}
console.log(`导入后：${after.brands} 品牌，${after.colors} 色`)
console.log('✅ 色卡数据已更新')
