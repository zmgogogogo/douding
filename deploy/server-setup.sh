#!/usr/bin/env bash
# 豆丁 Douding — 阿里云 ECS 一键部署脚本
# 用法（在服务器上以 root 运行）：
#   curl -fsSL <脚本地址> | bash
#   或：bash server-setup.sh YOUR_DOMAIN JWT_SECRET
set -euo pipefail

DOMAIN="${1:-}"
JWT_SECRET="${2:-$(openssl rand -hex 32)}"
APP_DIR="/var/www/douding"
LOG_DIR="/var/log/douding"
REPO_URL="${REPO_URL:-git@github.com:zmgogogogo/douding.git}"

if [[ -z "$DOMAIN" ]]; then
  echo "用法: bash server-setup.sh <域名> [JWT_SECRET]"
  echo "示例: bash server-setup.sh douding.example.com"
  exit 1
fi

echo "==> 检测操作系统..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_ID="${ID:-unknown}"
else
  OS_ID="unknown"
fi

install_node() {
  if command -v node >/dev/null 2>&1; then
    echo "Node.js 已安装: $(node -v)"
    return
  fi
  echo "==> 安装 Node.js 20..."
  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs build-essential python3
  elif [[ "$OS_ID" == "centos" || "$OS_ID" == "alinux" || "$OS_ID" == "anolis" ]]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs gcc-c++ make python3
  else
    echo "未识别的系统 ($OS_ID)，请手动安装 Node.js 20+ 后重试"
    exit 1
  fi
}

install_packages() {
  echo "==> 安装系统依赖..."
  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    apt-get update -y
    apt-get install -y git nginx certbot python3-certbot-nginx
  else
    yum install -y git nginx certbot python3-certbot-nginx || yum install -y git nginx
  fi
}

install_pm2() {
  if command -v pm2 >/dev/null 2>&1; then
    echo "PM2 已安装"
    return
  fi
  echo "==> 安装 PM2..."
  npm install -g pm2
}

deploy_app() {
  echo "==> 部署应用代码..."
  mkdir -p "$APP_DIR" "$LOG_DIR"
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR" && git pull
  else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  fi

  echo "==> 安装依赖并构建..."
  npm ci
  npm run build

  echo "==> 写入环境变量..."
  cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3456
JWT_SECRET=$JWT_SECRET
EOF

  echo "==> 启动 PM2..."
  export JWT_SECRET
  pm2 delete douding 2>/dev/null || true
  pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup
}

setup_nginx() {
  echo "==> 配置 Nginx..."
  sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" > /etc/nginx/conf.d/douding.conf
  nginx -t
  systemctl enable nginx
  systemctl restart nginx

  echo "==> 申请 HTTPS 证书..."
  mkdir -p /var/www/certbot
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
    echo "Certbot 失败，请确认域名已解析到本机 IP，然后手动运行:"
    echo "  certbot --nginx -d $DOMAIN"
  }
}

install_node
install_packages
install_pm2
deploy_app
setup_nginx

echo ""
echo "✅ 部署完成！"
echo "   访问地址: https://$DOMAIN"
echo "   JWT_SECRET 已保存到 $APP_DIR/.env"
echo "   查看日志: pm2 logs douding"
