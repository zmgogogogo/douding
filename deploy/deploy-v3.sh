#!/bin/bash
set -e
echo "========== 豆丁部署 v3 =========="

# 1. 重建数据库
echo "[1/4] 重建空数据库..."
mysql -u root -e 'DROP DATABASE IF EXISTS douding;'
mysql -u root -e 'CREATE DATABASE douding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
echo "  数据库已清空"

# 2. 验证数据库确实是空的
TABLE_COUNT=$(mysql -u root douding -e "SHOW TABLES;" | wc -l)
echo "  表数量: $TABLE_COUNT (预期 0)"

# 3. 重启服务（让 Flyway 自动运行迁移）
echo "[2/4] 重启服务..."
sudo systemctl reset-failed douding 2>/dev/null
sudo systemctl restart douding

# 4. 等待启动
echo "[3/4] 等待服务启动..."
SUCCESS=0
for i in $(seq 1 90); do
  if ss -tlnp | grep -q :8080; then
    echo "  ✅ 端口 8080 已监听 (${i}s)"
    SUCCESS=1
    break
  fi
  if ! sudo systemctl is-active --quiet douding 2>/dev/null; then
    echo "  ❌ 服务已崩溃"
    echo "=== 启动日志 ==="
    tail -40 /home/admin/server-java/logs/stdout.log | grep -E "Error|Caused|Exception|Started" | tail -10
    exit 1
  fi
  sleep 1
done

if [ $SUCCESS -eq 0 ]; then
  echo "  ❌ 超时 (90s) 未监听到 8080"
  tail -20 /home/admin/server-java/logs/stdout.log
  exit 1
fi

# 5. 最终状态
echo "[4/4] 最终状态:"
ss -tlnp | grep -E '8080|3456'
sudo systemctl status douding --no-pager | head -6
echo "========== 部署完成 =========="
