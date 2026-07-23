// ============================================
//  数据库 Schema — 基于版本化迁移系统
//  所有 DDL 变更在 db/migrations.js 中按版本管理
//  runMigrations 自动跳过已应用的版本，增量执行
// ============================================
import { runMigrations } from './migrate.js'
import { MIGRATIONS } from './migrations.js'

/** 初始化数据库表结构（幂等，仅应用未执行的迁移） */
export function initDB() {
  runMigrations(MIGRATIONS)
}
