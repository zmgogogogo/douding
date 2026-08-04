-- V7: 设计收藏功能

CREATE TABLE IF NOT EXISTS design_favorites (
    user_id BIGINT NOT NULL,
    design_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    PRIMARY KEY (user_id, design_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE
) ;

ALTER TABLE designs ADD COLUMN favorites_count INT DEFAULT 0;
