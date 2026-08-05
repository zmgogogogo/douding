-- V8: 制作进度系统

CREATE TABLE IF NOT EXISTS make_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    archive_name VARCHAR(100) DEFAULT '默认存档',
    current_step INT DEFAULT 0,
    finished_steps JSON,
    step_mode VARCHAR(20) DEFAULT 'color',
    total_duration INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    INDEX idx_make_user (user_id),
    INDEX idx_make_design (design_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
