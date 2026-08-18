#!/usr/bin/env bash
# ============================================
#  豆丁 Douding — 启用 HTTPS (阶段2)
#  前提: DNS 已解析 douding.online 到本机 IP
#  在服务器上运行: bash /tmp/enable-https.sh
# ============================================
set -euo pipefail

DOMAIN="douding.online"
SERVER_IP="47.108.201.48"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*"; }

echo "=========================================="
echo "  豆丁 Douding — 启用 HTTPS"
echo "=========================================="

# 检查 DNS
echo "检查 DNS 解析..."
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1 || host "$DOMAIN" 2>/dev/null | awk '/has address/ {print $NF}' | head -1 || echo "")
if [ -z "$RESOLVED_IP" ]; then
  warn "无法解析 $DOMAIN，请确认 DNS 已设置"
  echo "  请将 douding.online A 记录指向: $SERVER_IP"
  read -p "  确认 DNS 已生效？按回车继续..."
else
  log "$DOMAIN 解析到: $RESOLVED_IP"
fi

# 申请 SSL 证书
log "申请 Let's Encrypt SSL 证书..."
mkdir -p /var/www/certbot

certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "admin@$DOMAIN" \
  --redirect 2>&1 || {
  warn "自动 certbot 失败，尝试交互式..."
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN"
}

# 验证证书
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  log "SSL 证书申请成功!"
else
  err "SSL 证书申请失败，请手动运行: certbot --nginx -d $DOMAIN"
fi

# 生成带 HTTPS 的 Nginx 配置
log "更新 Nginx 配置为 HTTPS 模式..."
cat > /etc/nginx/conf.d/douding.conf <<NGINX_EOF
upstream douding_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

# ==================== HTTPS 服务 ====================
server {
    listen 443 ssl;
    http2 on;
    server_name douding.online www.douding.online $SERVER_IP;

    ssl_certificate /etc/letsencrypt/live/douding.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/douding.online/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf 2>/dev/null || true;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;
    root /var/www/douding;
    index index.html;

    # API 请求 → Java 后端
    location /api/ {
        proxy_pass http://douding_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://douding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 上传文件
    location /uploads/ {
        alias /var/www/douding/uploads/;
    }

    # 前端 SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# ==================== HTTP 重定向 ====================
server {
    listen 80;
    server_name douding.online www.douding.online $SERVER_IP;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX_EOF

nginx -t && systemctl reload nginx
log "Nginx HTTPS 配置完成"

# 设置证书自动续期
log "配置证书自动续期..."
(crontab -l 2>/dev/null | grep -v certbot || true; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo ""
echo "=========================================="
echo -e "${GREEN}✅ HTTPS 已启用！${NC}"
echo "=========================================="
echo "  访问: https://$DOMAIN"
echo "=========================================="
