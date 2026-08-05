-- V5: 管理后台系统表（管理员/角色/操作日志/Banner/系统配置）

CREATE TABLE IF NOT EXISTS sys_admins (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    role_id INT DEFAULT 0,
    status INT DEFAULT 1,
    last_login_at DATETIME,
    last_login_ip VARCHAR(50),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sys_roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT '',
    permissions JSON,
    status INT DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sys_operation_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT,
    admin_name VARCHAR(50),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id BIGINT,
    detail TEXT,
    ip VARCHAR(50),
    user_agent VARCHAR(500),
    status INT DEFAULT 1,
    error_msg TEXT,
    duration_ms INT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    INDEX idx_oplog_admin (admin_id),
    INDEX idx_oplog_module (module),
    INDEX idx_oplog_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sys_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255) DEFAULT '',
    updated_by VARCHAR(50) DEFAULT '',
    updated_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(200) DEFAULT '',
    image_url VARCHAR(500),
    bg_color VARCHAR(10) DEFAULT '#22c55e',
    link_type VARCHAR(20) DEFAULT 'route',
    link_value VARCHAR(200) DEFAULT '',
    sort_order INT DEFAULT 0,
    status INT DEFAULT 1,
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 增强 users 表
ALTER TABLE users ADD COLUMN status INT DEFAULT 1;
ALTER TABLE users ADD COLUMN ban_reason VARCHAR(500) DEFAULT '';
ALTER TABLE users ADD COLUMN banned_at DATETIME;

-- 增强 designs 表
ALTER TABLE designs ADD COLUMN status INT DEFAULT 1;
ALTER TABLE designs ADD COLUMN is_recommended TINYINT DEFAULT 0;
ALTER TABLE designs ADD COLUMN weight INT DEFAULT 0;
ALTER TABLE designs ADD COLUMN review_comment TEXT;
