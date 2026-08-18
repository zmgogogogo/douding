#!/usr/bin/env bash
# ============================================
#  豆丁 Douding — 阿里云 ECS 一键环境配置脚本
#  适用系统: Alibaba Cloud Linux / CentOS / Anolis
#  用法: bash server-setup.sh
# ============================================
set -euo pipefail

# --- 配置变量 ---
DOMAIN="douding.online"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_ADMIN_SECRET="$(openssl rand -hex 32)"
APP_DIR="/var/www/douding"
LOG_DIR="/var/log/douding"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo "=========================================="
echo "  豆丁 Douding — 服务器环境配置"
echo "  域名: $DOMAIN"
echo "=========================================="
echo ""

# ==================== 1. 基础依赖 ====================
log "步骤 1/7: 安装系统依赖..."

# 检测包管理器
if command -v dnf &>/dev/null; then
  PKG_MGR="dnf"
elif command -v yum &>/dev/null; then
  PKG_MGR="yum"
else
  PKG_MGR="apt-get"
fi

if [ "$PKG_MGR" = "apt-get" ]; then
  apt-get update -y
else
  $PKG_MGR update -y || true
fi

# 安装基础工具
$PKG_MGR install -y git nginx certbot python3-certbot-nginx curl wget unzip tar gzip 2>&1 | tail -3

# ==================== 2. Java 17 ====================
log "步骤 2/7: 安装 Java 17..."

if command -v java &>/dev/null; then
  JAVA_VER=$(java -version 2>&1 | head -1)
  log "Java 已安装: $JAVA_VER"
else
  $PKG_MGR install -y java-17-openjdk java-17-openjdk-devel
  log "Java 17 安装完成"
fi

# 获取 Java 路径
JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
log "JAVA_HOME: $JAVA_HOME"

# ==================== 3. Node.js 20 ====================
log "步骤 3/7: 安装 Node.js 20..."

if command -v node &>/dev/null; then
  log "Node.js 已安装: $(node -v)"
else
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  $PKG_MGR install -y nodejs
  log "Node.js 安装完成: $(node -v)"
fi

# ==================== 4. MySQL ====================
log "步骤 4/7: 安装配置 MySQL..."

if command -v mysql &>/dev/null; then
  log "MySQL 已安装"
else
  $PKG_MGR install -y mysql-server
  systemctl enable mysqld
  systemctl start mysqld
  log "MySQL 安装完成"
fi

# 确保 MySQL 运行
systemctl start mysqld 2>/dev/null || systemctl start mysql 2>/dev/null || true

# 创建数据库
log "创建数据库 douding..."
mysql -u root <<'SQL' 2>/dev/null || mysql -u root -p'' <<'SQL' 2>/dev/null || true
CREATE DATABASE IF NOT EXISTS douding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'douding'@'localhost' IDENTIFIED BY 'douding123';
GRANT ALL PRIVILEGES ON douding.* TO 'douding'@'localhost';
FLUSH PRIVILEGES;
SQL

log "数据库配置完成"

# ==================== 5. Redis ====================
log "步骤 5/7: 安装配置 Redis..."

if command -v redis-server &>/dev/null || command -v redis-cli &>/dev/null; then
  log "Redis 已安装"
else
  $PKG_MGR install -y redis
  systemctl enable redis
  systemctl start redis
  log "Redis 安装完成"
fi

systemctl start redis 2>/dev/null || true

# ==================== 6. Python 环境 ====================
log "步骤 6/7: 配置 Python 环境..."

# 安装 Python 3
$PKG_MGR install -y python3 python3-pip python3-devel 2>&1 | tail -3

# 创建 Python 服务目录
mkdir -p /home/admin/server-python/logs
mkdir -p /var/www/douding/uploads

# ==================== 7. 目录结构 ====================
log "步骤 7/7: 创建目录结构..."

mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p /home/admin/server-java/logs
mkdir -p /var/www/certbot

# 确保 admin 用户存在
id -u admin &>/dev/null || useradd -m admin

# 权限设置
chown -R admin:admin /home/admin/server-java /home/admin/server-python /var/www/douding /var/log/douding 2>/dev/null || true

# ==================== 保存配置 ====================
log "保存密钥配置..."

cat > /home/admin/deploy-env <<EOF
# 豆丁部署环境变量
DOMAIN=$DOMAIN
JWT_SECRET=$JWT_SECRET
JWT_ADMIN_SECRET=$JWT_ADMIN_SECRET
JAVA_HOME=$JAVA_HOME
EOF

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 服务器环境配置完成！${NC}"
echo "=========================================="
echo "  JWT_SECRET: $JWT_SECRET"
echo "  JWT_ADMIN_SECRET: $JWT_ADMIN_SECRET"
echo "  JAVA_HOME: $JAVA_HOME"
echo "  配置已保存到: /home/admin/deploy-env"
echo ""
echo "  接下来运行部署脚本: bash deploy-app.sh"
echo "=========================================="
