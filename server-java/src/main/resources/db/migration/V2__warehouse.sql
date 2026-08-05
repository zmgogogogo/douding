-- ============================================
--  V2: 仓库管理表（库存日志/采购清单/消耗追踪）
--  对应 server/db/migrations.js v2
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    balance_after INT NOT NULL,
    source_type VARCHAR(50),
    source_id BIGINT,
    source_name VARCHAR(200),
    note TEXT,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE,
    INDEX idx_inv_logs_user (user_id),
    INDEX idx_inv_logs_color (color_id),
    INDEX idx_inv_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_lists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    notes TEXT,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    list_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    need_quantity INT NOT NULL DEFAULT 0,
    purchased_quantity INT DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (list_id) REFERENCES purchase_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS design_bead_usage (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    color_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    FOREIGN KEY (color_id) REFERENCES bead_colors(id) ON DELETE CASCADE,
    INDEX idx_usage_design (design_id),
    INDEX idx_usage_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
