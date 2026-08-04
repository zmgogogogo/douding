-- V12: 导出下载记录表

CREATE TABLE IF NOT EXISTS download_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'png',
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    INDEX idx_dl_user (user_id),
    INDEX idx_dl_design (design_id),
    INDEX idx_dl_created (created_at)
) ;
