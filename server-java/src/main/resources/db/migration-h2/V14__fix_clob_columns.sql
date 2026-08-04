-- V14: H2 CLOB→VARCHAR 转换（修复 MyBatis 无法读取大文本的问题）
-- H2 将 LONGTEXT 存储为 CLOB，JDBC driver 需要特殊处理
-- 转换为 VARCHAR 可被 MyBatis 正常读取
ALTER TABLE designs ALTER COLUMN grid_data VARCHAR(5000000);
ALTER TABLE designs ALTER COLUMN thumbnail VARCHAR(100000);
ALTER TABLE designs ALTER COLUMN description VARCHAR(10000);
