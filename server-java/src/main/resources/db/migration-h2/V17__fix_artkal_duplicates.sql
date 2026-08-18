-- ============================================
-- V17: 修复 Artkal 重复数据
-- V13 中 R系列 5mm 软豆 被插入了两次 (id=25 和 id=28)
-- 导致 bead_colors 中也有对应重复
-- ============================================

-- 先删除重复 series_id=28 关联的颜色
DELETE FROM bead_colors WHERE series_id = 28;

-- 再删除重复系列
DELETE FROM bead_series WHERE id = 28;

-- 验证：Artkal 系列数应为 12（原来是 13，删除 1 个重复）
