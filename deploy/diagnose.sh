#!/bin/bash
# 1. 停服务
sudo systemctl stop douding 2>/dev/null

# 2. 手动运行迁移看哪里失败
echo "=== 手动测试所有迁移 ==="
for f in /home/admin/server-java/src/main/resources/db/migration/V*.sql; do
  echo "--- 测试: $(basename $f) ---"
  mysql -u root douding < "$f" 2>&1
  if [ $? -ne 0 ]; then
    echo "FAILED at $f"
    break
  fi
  echo "OK"
done

# 3. 如果全部通过，显示表列表
echo "=== 数据库表 ==="
mysql -u root douding -e "SHOW TABLES;"

# 4. 查看 JAR 启动日志错误
echo "=== 启动日志最后错误 ==="
tail -200 /home/admin/server-java/logs/stdout.log | grep -E "Caused by|Error" | tail -10
