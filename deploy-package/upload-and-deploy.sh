#!/usr/bin/env bash
# ============================================
#  上传并部署豆丁到新服务器 (本地运行)
#  用法: bash upload-and-deploy.sh
# ============================================
set -euo pipefail

SERVER_IP="47.108.201.48"
SERVER_USER="root"
SERVER_PASS="1661231048Zm@"

SSH_CMD="sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $SERVER_USER@$SERVER_IP"
SCP_CMD="sshpass -p '$SERVER_PASS' scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

GREEN='\033[0;32m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================="
echo "  豆丁 Douding — 上传并部署"
echo "  服务器: $SERVER_IP"
echo "=========================================="
echo ""

# ==================== 1. 打包前端 ====================
log "步骤 1/6: 打包前端文件..."
cd "$PROJECT_DIR"
if [ -d "dist" ]; then
  tar -czf /tmp/deploy-frontend.tar.gz -C dist .
  log "前端打包完成 ($(du -h /tmp/deploy-frontend.tar.gz | cut -f1))"
else
  echo "错误: dist/ 目录不存在，请先运行 npm run build"
  exit 1
fi

# ==================== 2. 检查 Java JAR ====================
log "步骤 2/6: 检查 Java JAR..."
JAR_FILE="$PROJECT_DIR/server-java/target/douding-server-1.0.0-SNAPSHOT.jar"
if [ -f "$JAR_FILE" ]; then
  log "JAR 文件就绪 ($(du -h "$JAR_FILE" | cut -f1))"
else
  echo "错误: JAR 文件不存在，请先构建 Java 后端"
  exit 1
fi

# ==================== 3. 打包 Python 后端 ====================
log "步骤 3/6: 打包 Python 后端..."
PYTHON_DIR="$PROJECT_DIR/server-python"
if [ -d "$PYTHON_DIR" ]; then
  tar -czf /tmp/deploy-python.tar.gz \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='.cache' \
    --exclude='models' \
    --exclude='logs' \
    -C "$PROJECT_DIR" server-python/
  log "Python 后端打包完成 ($(du -h /tmp/deploy-python.tar.gz | cut -f1))"
else
  log "跳过 Python 后端（目录不存在）"
fi

# ==================== 4. 上传脚本 ====================
log "步骤 4/6: 上传部署脚本到服务器..."

$SCP_CMD deploy-package/server-setup.sh $SERVER_USER@$SERVER_IP:/tmp/server-setup.sh
$SCP_CMD deploy-package/deploy-app.sh $SERVER_USER@$SERVER_IP:/tmp/deploy-app.sh
log "脚本上传完成"

# ==================== 5. 上传构建产物 ====================
log "步骤 5/6: 上传构建产物 (可能需要几分钟)..."

$SCP_CMD /tmp/deploy-frontend.tar.gz $SERVER_USER@$SERVER_IP:/tmp/deploy-frontend.tar.gz
$SCP_CMD "$JAR_FILE" $SERVER_USER@$SERVER_IP:/tmp/douding-server.jar

if [ -f /tmp/deploy-python.tar.gz ]; then
  $SCP_CMD /tmp/deploy-python.tar.gz $SERVER_USER@$SERVER_IP:/tmp/deploy-python.tar.gz
fi

log "构建产物上传完成"

# ==================== 6. 执行部署 ====================
log "步骤 6/6: 在服务器上执行部署..."

$SSH_CMD "bash /tmp/server-setup.sh"
$SSH_CMD "bash /tmp/deploy-app.sh"

# ==================== 清理 ====================
rm -f /tmp/deploy-frontend.tar.gz /tmp/deploy-python.tar.gz

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 全部完成！${NC}"
echo "=========================================="
echo ""
echo "⚠️  下一步操作:"
echo "  1. 将域名 douding.online 的 DNS 解析改为 $SERVER_IP"
echo "  2. DNS 生效后，SSH 到服务器运行 certbot 获取 HTTPS 证书:"
echo "     certbot --nginx -d douding.online -d www.douding.online"
echo ""
echo "  测试访问 (HTTP): http://$SERVER_IP"
echo "=========================================="
