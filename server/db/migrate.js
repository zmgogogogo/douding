// ============================================
//  数据库迁移系统 — 基于版本号的增量迁移
//  替代 schema.js 中的 try-catch ALTER TABLE 模式
// ============================================
import db from './connection.js'

/**
 * 确保迁移元数据表存在
 */
function ensureMigrationTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)
}

/**
 * 获取已应用的迁移版本号列表
 * @returns {Set<number>}
 */
function getAppliedVersions() {
  ensureMigrationTable()
  const rows = db.prepare('SELECT version FROM _migrations ORDER BY version').all()
  return new Set(rows.map((r) => r.version))
}

/**
 * 应用单个迁移
 * @param {{ version: number, name: string, sql: string }} migration
 */
function applyMigration({ version, name, sql }) {
  const applied = getAppliedVersions()
  if (applied.has(version)) {
    return // 已应用，跳过
  }

  console.log(`[迁移] 应用 v${version}: ${name}`)
  db.exec(sql)
  db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(version, name)
  console.log(`[迁移] v${version} 完成`)
}

/**
 * 运行所有待执行的迁移
 * @param {Array<{ version: number, name: string, sql: string }>} migrations
 */
export function runMigrations(migrations) {
  ensureMigrationTable()

  // 按版本号排序
  const sorted = [...migrations].sort((a, b) => a.version - b.version)

  for (const migration of sorted) {
    try {
      applyMigration(migration)
    } catch (err) {
      // 已存在的列/表（从旧系统迁移过来的）不算失败
      if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
        console.log(`[迁移] v${migration.version} 跳过（列/表已存在）`)
        db.prepare('INSERT OR IGNORE INTO _migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        )
        continue
      }
      console.error(`[迁移] v${migration.version} 失败:`, err.message)
      throw err
    }
  }

  console.log('[迁移] 数据库已是最新版本')
}
