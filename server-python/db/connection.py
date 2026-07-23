"""
数据库连接 — SQLite（与 Node.js 版本共享 douding.db）
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "douding.db"


def get_db() -> sqlite3.Connection:
    """获取数据库连接（自动创建）"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """初始化数据库表（如果不存在）"""
    conn = get_db()
    conn.executescript(SCHEMA_SQL)
    # 检查是否需要导入种子数据
    count = conn.execute("SELECT COUNT(*) FROM bead_brands").fetchone()[0]
    if count == 0:
        from .seed import seed_beads
        seed_beads(conn)
    conn.commit()
    conn.close()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    is_vip INTEGER DEFAULT 0,
    vip_expire_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    folder_id INTEGER,
    title TEXT DEFAULT '未命名',
    description TEXT DEFAULT '',
    grid_width INTEGER DEFAULT 0,
    grid_height INTEGER DEFAULT 0,
    grid_data TEXT DEFAULT '[]',
    thumbnail TEXT DEFAULT '',
    is_public INTEGER DEFAULT 0,
    bead_count INTEGER DEFAULT 0,
    color_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    brand TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (folder_id) REFERENCES folders(id)
);

CREATE TABLE IF NOT EXISTS design_likes (
    user_id INTEGER NOT NULL,
    design_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, design_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (design_id) REFERENCES designs(id)
);

CREATE TABLE IF NOT EXISTS bead_brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bead_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES bead_brands(id)
);

CREATE TABLE IF NOT EXISTS bead_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    hex TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    lab_l REAL DEFAULT 0,
    lab_a REAL DEFAULT 0,
    lab_b REAL DEFAULT 0,
    FOREIGN KEY (series_id) REFERENCES bead_series(id)
);

CREATE TABLE IF NOT EXISTS user_bead_inventory (
    user_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, color_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (color_id) REFERENCES bead_colors(id)
);
"""
