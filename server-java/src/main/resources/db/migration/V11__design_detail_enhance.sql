-- V11: 作品详情页增强（版权/难度/评论/关注）

ALTER TABLE designs ADD COLUMN copyright_desc VARCHAR(500) DEFAULT '';
ALTER TABLE designs ADD COLUMN is_remix TINYINT DEFAULT 0;
ALTER TABLE designs ADD COLUMN difficulty INT DEFAULT 1;
ALTER TABLE designs ADD COLUMN cost_time VARCHAR(50) DEFAULT '';
ALTER TABLE designs ADD COLUMN real_size VARCHAR(50) DEFAULT '';

CREATE TABLE IF NOT EXISTS design_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    design_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_id INT DEFAULT 0,
    reply_to_uid INT DEFAULT 0,
    content TEXT NOT NULL,
    like_num INT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    deleted TINYINT DEFAULT 0,
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comment_design (design_id),
    INDEX idx_comment_parent (parent_id),
    INDEX idx_comment_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_likes (
    user_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    PRIMARY KEY (user_id, comment_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES design_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_follow (
    follower_id BIGINT NOT NULL,
    following_id BIGINT NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follow_follower (follower_id),
    INDEX idx_follow_following (following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
