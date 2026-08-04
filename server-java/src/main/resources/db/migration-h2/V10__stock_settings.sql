-- V10: 豆仓系统 V3.0 — 用户库存设置

CREATE TABLE IF NOT EXISTS user_stock_settings (
    user_id BIGINT NOT NULL PRIMARY KEY,
    auto_deduct TINYINT DEFAULT 1,
    default_loss_rate DECIMAL(5,2) DEFAULT 5.0,
    updated_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ;
