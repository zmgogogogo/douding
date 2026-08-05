#!/bin/bash
# 重建数据库并重启服务
mysql -u root -e 'DROP DATABASE IF EXISTS douding;'
mysql -u root -e 'CREATE DATABASE douding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
echo "数据库已重建"

systemctl reset-failed douding 2>/dev/null
systemctl restart douding
echo "服务已重启，等待30秒..."
sleep 30

echo "=== 端口检查 ==="
ss -tlnp | grep 8080

echo "=== 服务状态 ==="
systemctl status douding --no-pager | head -8
