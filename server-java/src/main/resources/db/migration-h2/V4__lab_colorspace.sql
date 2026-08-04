-- V4: 色板升级 — LAB 色彩空间 + 颜色分类 + 豆仓 V2.0

ALTER TABLE bead_colors ADD COLUMN lab_l DECIMAL(10,4);
ALTER TABLE bead_colors ADD COLUMN lab_a DECIMAL(10,4);
ALTER TABLE bead_colors ADD COLUMN lab_b DECIMAL(10,4);
ALTER TABLE bead_colors ADD COLUMN color_type INT DEFAULT 1;
ALTER TABLE bead_colors ADD COLUMN is_hot TINYINT DEFAULT 0;
ALTER TABLE bead_colors ADD COLUMN is_discontinued TINYINT DEFAULT 0;

ALTER TABLE user_bead_inventory ADD COLUMN unit_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE user_bead_inventory ADD COLUMN location VARCHAR(255) DEFAULT '';
