// ============================================
//  数据库 Schema — 建表语句
//  仓库优化版：新增库存日志/采购清单/消耗追踪
// ============================================
import db from './connection.js'

/** 初始化数据库表结构 */
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      bio TEXT,
      is_vip INTEGER DEFAULT 0,
      vip_expire_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS designs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      grid_width INTEGER NOT NULL DEFAULT 58,
      grid_height INTEGER NOT NULL DEFAULT 58,
      grid_data TEXT NOT NULL,
      thumbnail TEXT,
      is_public INTEGER DEFAULT 0,
      bead_count INTEGER DEFAULT 0,
      color_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      brand TEXT DEFAULT 'Hama',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS design_likes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, design_id)
    );

    CREATE TABLE IF NOT EXISTS bead_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bead_series (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_id INTEGER NOT NULL REFERENCES bead_brands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bead_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id INTEGER NOT NULL REFERENCES bead_series(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hex TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- 珠子颜色扩展信息（条形码等）
    CREATE TABLE IF NOT EXISTS bead_barcodes (
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      barcode TEXT NOT NULL,
      brand TEXT,
      PRIMARY KEY (color_id, barcode)
    );

    -- ===== 仓库管理表 =====

    -- 用户珠子库存（增强版：预警阈值 + 运输中数量）
    CREATE TABLE IF NOT EXISTS user_bead_inventory (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 0,
      min_threshold INTEGER DEFAULT 0,
      transit_quantity INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, color_id)
    );

    -- 库存操作日志（不可变，完整追溯）
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK(action IN ('inbound','outbound','adjust','transit_in','transit_arrive')),
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      source_type TEXT,
      source_id INTEGER,
      source_name TEXT,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_inv_logs_user ON inventory_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_inv_logs_color ON inventory_logs(color_id);
    CREATE INDEX IF NOT EXISTS idx_inv_logs_created ON inventory_logs(created_at);

    -- 采购清单
    CREATE TABLE IF NOT EXISTS purchase_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','ordered','arrived','cancelled')),
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 采购清单明细
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id INTEGER NOT NULL REFERENCES purchase_lists(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      need_quantity INTEGER NOT NULL DEFAULT 0,
      purchased_quantity INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','purchased','received')),
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 设计消耗追踪
    CREATE TABLE IF NOT EXISTS design_bead_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_design ON design_bead_usage(design_id);
    CREATE INDEX IF NOT EXISTS idx_usage_user ON design_bead_usage(user_id);

    -- 补豆提醒记录
    CREATE TABLE IF NOT EXISTS replenish_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      alert_type TEXT DEFAULT 'low_stock' CHECK(alert_type IN ('low_stock','out_of_stock','threshold')),
      current_qty INTEGER NOT NULL,
      threshold_qty INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 包装规格库（系统预置 + 用户可扩展）
    CREATE TABLE IF NOT EXISTS package_specs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      size REAL NOT NULL,
      package_name TEXT NOT NULL,
      default_count INTEGER,
      default_weight REAL,
      reference_price REAL,
      status INTEGER DEFAULT 1
    );

    -- 多豆仓管理（会员功能）
    CREATE TABLE IF NOT EXISTS warehouse_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      default_spec REAL DEFAULT 5,
      default_brand TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 用户自定义色号
    CREATE TABLE IF NOT EXISTS user_custom_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_name TEXT NOT NULL,
      hex TEXT NOT NULL,
      lab_l REAL, lab_a REAL, lab_b REAL,
      remark TEXT DEFAULT '',
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 心愿单
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      color_id INTEGER REFERENCES bead_colors(id) ON DELETE SET NULL,
      custom_color_id INTEGER REFERENCES user_custom_colors(id) ON DELETE SET NULL,
      priority INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','purchased','cancelled')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 跨品牌同色映射
    CREATE TABLE IF NOT EXISTS cross_brand_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      target_color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
      delta_e REAL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_color_id, target_color_id)
    );
  `)

  // 数据库迁移：为旧表安全添加新列（忽略已存在列的错误）
  const migrations = [
    'ALTER TABLE user_bead_inventory ADD COLUMN min_threshold INTEGER DEFAULT 0',
    'ALTER TABLE user_bead_inventory ADD COLUMN transit_quantity INTEGER DEFAULT 0',
    // 豆仓 V2.0：色板升级 — LAB 色彩空间 + 颜色分类
    'ALTER TABLE bead_colors ADD COLUMN lab_l REAL',
    'ALTER TABLE bead_colors ADD COLUMN lab_a REAL',
    'ALTER TABLE bead_colors ADD COLUMN lab_b REAL',
    'ALTER TABLE bead_colors ADD COLUMN color_type INTEGER DEFAULT 1',
    'ALTER TABLE bead_colors ADD COLUMN is_hot INTEGER DEFAULT 0',
    'ALTER TABLE bead_colors ADD COLUMN is_discontinued INTEGER DEFAULT 0',
    // 豆仓 V2.0：成本核算 + 分装位置
    'ALTER TABLE user_bead_inventory ADD COLUMN unit_cost REAL DEFAULT 0',
    'ALTER TABLE user_bead_inventory ADD COLUMN location TEXT DEFAULT \'\'',
  ]
  for (const sql of migrations) {
    try { db.exec(sql) } catch (e) {
      if (!e.message.includes('duplicate column')) console.warn('迁移跳过:', e.message)
    }
  }
}
