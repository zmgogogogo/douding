// ============================================
//  数据库迁移定义 — 所有 DDL 变更按版本号管理
//  新增的迁移只需在数组末尾追加，系统自动增量应用
// ============================================

/**
 * 所有迁移（按版本号递增排列）
 * @type {Array<{ version: number, name: string, sql: string }>}
 */
export const MIGRATIONS = [
  // ===== v1: 初始表结构 =====
  {
    version: 1,
    name: '初始表结构',
    sql: `
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

      CREATE TABLE IF NOT EXISTS bead_barcodes (
        color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
        barcode TEXT NOT NULL,
        brand TEXT,
        PRIMARY KEY (color_id, barcode)
      );

      CREATE TABLE IF NOT EXISTS user_bead_inventory (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        min_threshold INTEGER DEFAULT 0,
        transit_quantity INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, color_id)
      );
    `,
  },

  // ===== v2: 仓库管理表 =====
  {
    version: 2,
    name: '仓库管理表（库存日志/采购清单/消耗追踪）',
    sql: `
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

      CREATE TABLE IF NOT EXISTS purchase_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft','ordered','arrived','cancelled')),
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

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
    `,
  },

  // ===== v3: 补豆提醒 + 包装规格 + 豆仓管理 =====
  {
    version: 3,
    name: '补豆提醒 + 包装规格 + 豆仓管理 + 自定义色号',
    sql: `
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

      CREATE TABLE IF NOT EXISTS cross_brand_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
        target_color_id INTEGER NOT NULL REFERENCES bead_colors(id) ON DELETE CASCADE,
        delta_e REAL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(source_color_id, target_color_id)
      );
    `,
  },

  // ===== v4: 色板升级 — LAB 色彩空间 =====
  {
    version: 4,
    name: '色板升级 — LAB 色彩空间 + 颜色分类 + 豆仓 V2.0',
    sql: `
      ALTER TABLE bead_colors ADD COLUMN lab_l REAL;
      ALTER TABLE bead_colors ADD COLUMN lab_a REAL;
      ALTER TABLE bead_colors ADD COLUMN lab_b REAL;
      ALTER TABLE bead_colors ADD COLUMN color_type INTEGER DEFAULT 1;
      ALTER TABLE bead_colors ADD COLUMN is_hot INTEGER DEFAULT 0;
      ALTER TABLE bead_colors ADD COLUMN is_discontinued INTEGER DEFAULT 0;
      ALTER TABLE user_bead_inventory ADD COLUMN unit_cost REAL DEFAULT 0;
      ALTER TABLE user_bead_inventory ADD COLUMN location TEXT DEFAULT '';
    `,
  },

  // ===== v5: 管理后台系统表 =====
  {
    version: 5,
    name: '管理后台系统表（管理员/角色/操作日志/Banner/系统配置）',
    sql: `
      CREATE TABLE IF NOT EXISTS sys_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname TEXT,
        avatar TEXT,
        role_id INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        last_login_at TEXT,
        last_login_ip TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sys_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        permissions TEXT DEFAULT '[]',
        status INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sys_operation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        admin_name TEXT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        detail TEXT DEFAULT '',
        ip TEXT,
        user_agent TEXT,
        status INTEGER DEFAULT 1,
        error_msg TEXT,
        duration_ms INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_oplog_admin ON sys_operation_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_oplog_module ON sys_operation_logs(module);
      CREATE INDEX IF NOT EXISTS idx_oplog_created ON sys_operation_logs(created_at);

      CREATE TABLE IF NOT EXISTS sys_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT,
        description TEXT DEFAULT '',
        updated_by TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT DEFAULT '',
        image_url TEXT,
        bg_color TEXT DEFAULT '#22c55e',
        link_type TEXT DEFAULT 'route',
        link_value TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        start_time TEXT,
        end_time TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- 增强现有 users 表
      ALTER TABLE users ADD COLUMN status INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN banned_at TEXT;

      -- 增强现有 designs 表
      ALTER TABLE designs ADD COLUMN status INTEGER DEFAULT 1;
      ALTER TABLE designs ADD COLUMN is_recommended INTEGER DEFAULT 0;
      ALTER TABLE designs ADD COLUMN weight INTEGER DEFAULT 0;
      ALTER TABLE designs ADD COLUMN review_comment TEXT DEFAULT '';
    `,
  },

  // ===== v6: 作品发布系统 — published_at 字段 =====
  {
    version: 6,
    name: '作品发布系统 — published_at 字段',
    sql: `
      ALTER TABLE designs ADD COLUMN published_at TEXT;
    `,
  },

  // ===== v7: 设计收藏功能 =====
  {
    version: 7,
    name: '设计收藏功能（design_favorites 表）',
    sql: `
      CREATE TABLE IF NOT EXISTS design_favorites (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, design_id)
      );

      ALTER TABLE designs ADD COLUMN favorites_count INTEGER DEFAULT 0;
    `,
  },

  // ===== v8: 制作进度系统 =====
  {
    version: 8,
    name: '制作进度系统（make_sessions 表）',
    sql: `
      CREATE TABLE IF NOT EXISTS make_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
        archive_name TEXT DEFAULT '默认存档',
        current_step INTEGER DEFAULT 0,
        finished_steps TEXT DEFAULT '[]',
        step_mode TEXT DEFAULT 'color',
        total_duration INTEGER DEFAULT 0,
        status TEXT DEFAULT 'in_progress',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_make_user ON make_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_make_design ON make_sessions(design_id);
    `,
  },

  // ===== v9: 制作模式增强 — 制作记录 + 用户设置 + 历史快照 =====
  {
    version: 9,
    name: '制作模式增强（make_records + user_make_settings + 进度快照）',
    sql: `
      -- 制作记录表（独立于进度会话）
      CREATE TABLE IF NOT EXISTS make_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        design_id INTEGER NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
        session_id INTEGER REFERENCES make_sessions(id) ON DELETE SET NULL,
        drawing_title TEXT,
        total_beans INTEGER DEFAULT 0,
        color_count INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        step_mode TEXT DEFAULT 'color',
        loss_rate REAL DEFAULT 0.05,
        deduct_stock INTEGER DEFAULT 1,
        finish_time TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_make_records_user ON make_records(user_id);
      CREATE INDEX IF NOT EXISTS idx_make_records_design ON make_records(design_id);
      CREATE INDEX IF NOT EXISTS idx_make_records_finish ON make_records(finish_time);

      -- 用户制作设置表（云端同步）
      CREATE TABLE IF NOT EXISTS user_make_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        display_settings TEXT DEFAULT '{}',
        operation_settings TEXT DEFAULT '{}',
        theme TEXT DEFAULT 'dark',
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id)
      );

      -- 扩展 make_sessions — 多存档排序 + 历史快照
      ALTER TABLE make_sessions ADD COLUMN archive_order INTEGER DEFAULT 0;
      ALTER TABLE make_sessions ADD COLUMN snapshot_history TEXT DEFAULT '[]';

      -- 进度历史快照表
      CREATE TABLE IF NOT EXISTS make_progress_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES make_sessions(id) ON DELETE CASCADE,
        snapshot_data TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_session ON make_progress_snapshots(session_id);
    `,
  },
]
