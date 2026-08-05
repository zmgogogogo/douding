-- V9: 制作模式增强（制作记录 + 用户设置 + 历史快照）

CREATE TABLE IF NOT EXISTS make_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    session_id BIGINT,
    drawing_title VARCHAR(200),
    total_beans INT DEFAULT 0,
    color_count INT DEFAULT 0,
    duration INT DEFAULT 0,
    step_mode VARCHAR(20) DEFAULT 'color',
    loss_rate DECIMAL(5,4) DEFAULT 0.05,
    deduct_stock TINYINT DEFAULT 1,
    finish_time DATETIME DEFAULT NOW(),
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES make_sessions(id) ON DELETE SET NULL,
    INDEX idx_make_records_user (user_id),
    INDEX idx_make_records_design (design_id),
    INDEX idx_make_records_finish (finish_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_make_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    display_settings JSON,
    operation_settings JSON,
    theme VARCHAR(20) DEFAULT 'dark',
    updated_at DATETIME DEFAULT NOW(),
    UNIQUE (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE make_sessions ADD COLUMN archive_order INT DEFAULT 0;
ALTER TABLE make_sessions ADD COLUMN snapshot_history JSON;

CREATE TABLE IF NOT EXISTS make_progress_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    snapshot_data JSON NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES make_sessions(id) ON DELETE CASCADE,
    INDEX idx_snapshots_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
