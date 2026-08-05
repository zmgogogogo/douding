#!/bin/bash
set -e
echo "=== 豆丁部署脚本 ==="

# 1. 安装 systemd 服务
cp /tmp/douding.service /etc/systemd/system/douding.service
echo "[1/5] 服务文件已安装"

# 2. 重载 systemd
systemctl daemon-reload
echo "[2/5] systemd 已重载"

# 3. 启用并启动
systemctl enable douding
systemctl restart douding
echo "[3/5] 豆丁服务已启动"

# 等待启动
sleep 10

# 4. 检查状态
echo "[4/5] 服务状态："
systemctl status douding --no-pager | head -15

# 5. 停旧服务 + 重载 Nginx
echo "[5/5] 清理旧服务并重载 Nginx..."
kill $(ss -tlnp 'sport = 3456' 2>/dev/null | grep -oP 'pid=\K\d+' | head -1) 2>/dev/null || echo "  旧 Node 服务已停止或不存在"
systemctl reload nginx && echo "  Nginx 已重载"

echo ""
echo "=== 部署完成 ==="
echo "前端: https://douding.online"
echo "API:  https://douding.online/api/"
