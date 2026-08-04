-- ============================================
--  V1: 初始表结构（MySQL 版本）
--  对应 server/db/migrations.js v1
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    bio VARCHAR(200),
    is_vip TINYINT DEFAULT 0,
    vip_expire_at DATETIME,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
) ;

CREATE TABLE IF NOT EXISTS folders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ;

CREATE TABLE IF NOT EXISTS designs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    folder_id BIGINT,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    grid_width INT NOT NULL DEFAULT 58,
    grid_height INT NOT NULL DEFAULT 58,
    grid_data LONGTEXT NOT NULL,
    thumbnail TEXT,
    is_public TINYINT DEFAULT 0,
    bead_count INT DEFAULT 0,
    color_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    views_count INT DEFAULT 0,
    brand VARCHAR(50) DEFAULT 'Hama',
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ;

CREATE TABLE IF NOT EXISTS design_likes (
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    PRIMARY KEY (user_id, design_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ;

CREATE TABLE IF NOT EXISTS bead_brands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE
) ;

CREATE TABLE IF NOT EXISTS bead_series (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES bead_brands(id) ON DELETE CASCADE
) ;

CREATE TABLE IF NOT EXISTS bead_colors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    series_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    hex VARCHAR(7) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (series_id) REFERENCES bead_series(id) ON DELETE CASCADE
) ;

CREATE TABLE IF NOT EXISTS bead_barcodes (
    color_id BIGINT NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    brand VARCHAR(50),
    PRIMARY KEY (color_id, barcode),
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE
) ;

CREATE TABLE IF NOT EXISTS user_bead_inventory (
    user_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    quantity INT DEFAULT 0,
    min_threshold INT DEFAULT 0,
    transit_quantity INT DEFAULT 0,
    updated_at DATETIME DEFAULT NOW(),
    PRIMARY KEY (user_id, color_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE
) ;
