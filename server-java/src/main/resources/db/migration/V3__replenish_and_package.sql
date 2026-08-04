-- V3: 补豆提醒 + 包装规格 + 豆仓管理 + 自定义色号

CREATE TABLE IF NOT EXISTS replenish_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    alert_type VARCHAR(20) DEFAULT 'low_stock',
    current_qty INT NOT NULL,
    threshold_qty INT NOT NULL,
    is_read TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_specs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    size DECIMAL(10,2) NOT NULL,
    package_name VARCHAR(200) NOT NULL,
    default_count INT,
    default_weight DECIMAL(10,2),
    reference_price DECIMAL(10,2),
    status INT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_info (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_spec DECIMAL(10,2) DEFAULT 5,
    default_brand VARCHAR(50) DEFAULT '',
    is_default TINYINT DEFAULT 0,
    status INT DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_custom_colors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    hex VARCHAR(7) NOT NULL,
    lab_l DECIMAL(10,4),
    lab_a DECIMAL(10,4),
    lab_b DECIMAL(10,4),
    remark TEXT DEFAULT '',
    is_public TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    color_id BIGINT,
    custom_color_id BIGINT,
    priority INT DEFAULT 0,
    notes TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE SET NULL,
    FOREIGN KEY (custom_color_id) REFERENCES user_custom_colors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cross_brand_mappings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_color_id BIGINT NOT NULL,
    target_color_id BIGINT NOT NULL,
    delta_e DECIMAL(10,4),
    created_at DATETIME DEFAULT NOW(),
    UNIQUE (source_color_id, target_color_id),
    FOREIGN KEY (source_color_id) REFERENCES bead_colors(id) ON DELETE CASCADE,
    FOREIGN KEY (target_color_id) REFERENCES bead_colors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
