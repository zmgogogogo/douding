-- V15: 用户手机号绑定
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN phone_verified_at DATETIME;
