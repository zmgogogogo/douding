#!/bin/bash
set -e
echo "========== 豆丁部署 v2 =========="

# 0. 建目录
mkdir -p /home/admin/server-java/logs

# 1. 重建数据库
echo "[1/5] 重建数据库..."
mysql -u root -e 'DROP DATABASE IF EXISTS douding; CREATE DATABASE douding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'

# 2. 手动测试所有迁移（发现并报告具体问题）
echo "[2/5] 测试迁移脚本..."
FAILED=""
for f in /home/admin/server-java/src/main/resources/db/migration/V*.sql; do
  echo "  $(basename $f)..."
  if ! mysql -u root douding < "$f" 2>/tmp/migrate-err.txt; then
    FAILED="$f"
    echo "  FAILED: $(cat /tmp/migrate-err.txt)"
    break
  fi
done

if [ -n "$FAILED" ]; then
  echo "ERROR: 迁移失败: $FAILED"
  cat /tmp/migrate-err.txt
  exit 1
fi
echo "  所有迁移通过!"

# 3. 罗列表
echo "[3/5] 数据库表:"
mysql -u root douding -e "SHOW TABLES;"

# 4. 重启服务
echo "[4/5] 重启服务..."
sudo systemctl reset-failed douding 2>/dev/null
sudo systemctl restart douding

# 5. 等待并验证
echo "[5/5] 等待 Spring Boot 启动..."
for i in $(seq 1 60); do
  if ss -tlnp | grep -q :8080; then
    echo "  ✅ 端口 8080 已监听 (${i}s)"
    break
  fi
  if ! sudo systemctl is-active --quiet douding; then
    echo "  ❌ 服务已崩溃，查看日志:"
    tail -20 /home/admin/server-java/logs/stdout.log | grep -E "Caused|Error"
    exit 1
  fi
  sleep 1
done

# 最终状态
echo ""
echo "========== 部署完成 =========="
ss -tlnp | grep -E '8080|3456'
sudo systemctl status douding --no-pager | head -6
echo "=============================="
