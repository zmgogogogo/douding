#!/usr/bin/env bash
# ============================================
#  豆丁 Douding — 应用部署脚本
#  在服务器上运行: bash /tmp/deploy-app.sh
#  阶段1: HTTP 模式（先部署，等服务跑通）
#  阶段2: 运行 enable-https.sh 开启 HTTPS
# ============================================
set -euo pipefail

source /home/admin/deploy-env

APP_DIR="/var/www/douding"
JAVA_DIR="/home/admin/server-java"
PYTHON_DIR="/home/admin/server-python"
DOMAIN="douding.online"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }

echo "=========================================="
echo "  豆丁 Douding — 应用部署 (阶段1: HTTP)"
echo "=========================================="

# ==================== 1. 部署前端 ====================
log "步骤 1/6: 部署前端静态文件..."

if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR 2>/dev/null)" ]; then
  cp -r "$APP_DIR" "${APP_DIR}.bak.$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
fi

rm -rf "${APP_DIR:?}"/*
tar -xzf /tmp/deploy-frontend.tar.gz -C "$APP_DIR/"
chown -R admin:admin "$APP_DIR"
log "前端部署完成"

# ==================== 2. 部署 Java 后端 ====================
log "步骤 2/6: 部署 Java 后端..."

mkdir -p "$JAVA_DIR/target" "$JAVA_DIR/logs"
cp /tmp/douding-server.jar "$JAVA_DIR/target/douding-server-1.0.0-SNAPSHOT.jar"
chown -R admin:admin "$JAVA_DIR"
log "Java 后端部署完成 ($(du -h /tmp/douding-server.jar | cut -f1))"

# ==================== 3. 部署 Python 后端 ====================
log "步骤 3/6: 部署 Python 后端..."

if [ -f /tmp/deploy-python.tar.gz ]; then
  mkdir -p "$PYTHON_DIR"
  tar -xzf /tmp/deploy-python.tar.gz -C "$PYTHON_DIR/"

  cd "$PYTHON_DIR"
  python3 -m venv venv
  source venv/bin/activate
  pip install --upgrade pip -q
  pip install -r requirements.txt -q 2>&1 | tail -5
  deactivate

  mkdir -p "$PYTHON_DIR/logs"
  mkdir -p /var/www/douding/uploads
  chown -R admin:admin "$PYTHON_DIR"
  log "Python 后端部署完成"
else
  log "跳过 Python 后端（未提供部署包）"
fi

# ==================== 4. 配置 systemd ====================
log "步骤 4/6: 配置 systemd 服务..."

# Java 后端服务
cat > /etc/systemd/system/douding.service <<SERVICE_EOF
[Unit]
Description=豆丁 Douding Spring Boot 后端服务
After=network.target mysqld.service redis.service
Wants=mysqld.service redis.service

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/server-java

Environment=SPRING_PROFILES_ACTIVE=prod
Environment=DB_URL=jdbc:mysql://localhost:3306/douding?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
Environment=DB_USERNAME=douding
Environment=DB_PASSWORD=douding123
Environment=REDIS_HOST=localhost
Environment=REDIS_PORT=6379
Environment=REDIS_PASSWORD=
Environment=JWT_SECRET=$JWT_SECRET
Environment=JWT_ADMIN_SECRET=$JWT_ADMIN_SECRET
Environment=PORT=8080

ExecStart=$JAVA_HOME/bin/java -jar /home/admin/server-java/target/douding-server-1.0.0-SNAPSHOT.jar
ExecStop=/bin/kill -15 \$MAINPID

Restart=always
RestartSec=10

StandardOutput=append:/home/admin/server-java/logs/stdout.log
StandardError=append:/home/admin/server-java/logs/stderr.log

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Python 后端服务
cat > /etc/systemd/system/douding-python.service <<SERVICE_PY_EOF
[Unit]
Description=豆丁 Douding Python 图片转像素图引擎
After=network.target douding.service
Wants=douding.service

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/server-python

Environment=PORT=3457
Environment=NODE_ENV=production
Environment=JWT_SECRET=$JWT_SECRET

ExecStart=/home/admin/server-python/venv/bin/python main.py
ExecStop=/bin/kill -15 \$MAINPID

Restart=always
RestartSec=5

StandardOutput=append:/home/admin/server-python/logs/stdout.log
StandardError=append:/home/admin/server-python/logs/stderr.log

[Install]
WantedBy=multi-user.target
SERVICE_PY_EOF

systemctl daemon-reload
log "systemd 服务配置完成"

# ==================== 5. 配置 Nginx (HTTP 模式) ====================
log "步骤 5/6: 配置 Nginx (HTTP 模式)..."

cat > /etc/nginx/conf.d/douding.conf <<'NGINX_EOF'
# ==================== 豆丁 Douding Nginx (HTTP 模式) ====================
# 获取 SSL 证书后，运行 enable-https.sh 切换到 HTTPS

upstream douding_backend {
    server 127.0.0.1:8080;
    keepalive 32;
}

upstream douding_python {
    server 127.0.0.1:3457;
    keepalive 32;
}

server {
    listen 80;
    server_name douding.online www.douding.online 47.108.201.48;

    # Certbot 验证目录
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    client_max_body_size 50M;
    root /var/www/douding;
    index index.html;

    # API 请求 → Java 后端
    location /api/ {
        proxy_pass http://douding_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://douding_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件
    location /uploads/ {
        alias /var/www/douding/uploads/;
    }

    # 前端 SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

rm -f /etc/nginx/conf.d/default.conf /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx
log "Nginx HTTP 模式配置完成"

# ==================== 6. 启动服务 ====================
log "步骤 6/6: 启动所有服务..."

# 确保基础服务运行
systemctl start mysqld 2>/dev/null || systemctl start mysql 2>/dev/null || true
systemctl start redis 2>/dev/null || true

# 启用自启动
systemctl enable douding 2>/dev/null || true
systemctl enable douding-python 2>/dev/null || true
systemctl enable nginx 2>/dev/null || true
systemctl enable mysqld 2>/dev/null || systemctl enable mysql 2>/dev/null || true
systemctl enable redis 2>/dev/null || true

# 启动/重启应用服务
systemctl restart douding-python 2>/dev/null || systemctl start douding-python 2>/dev/null || warn "Python 服务启动失败"
systemctl restart douding 2>/dev/null || systemctl start douding 2>/dev/null || warn "Java 服务启动失败"

# 等待 Java 服务就绪
log "等待 Java 服务启动 (最多 90s)..."
SUCCESS=0
for i in $(seq 1 90); do
  if ss -tlnp | grep -q :8080; then
    log "端口 8080 已监听 (${i}s)"
    SUCCESS=1
    break
  fi
  if ! systemctl is-active --quiet douding 2>/dev/null; then
    echo ""
    echo "❌ Java 服务已崩溃，查看启动日志:"
    tail -40 /home/admin/server-java/logs/stdout.log 2>/dev/null | grep -E "Error|Caused|Exception|Started" | tail -15
    break
  fi
  sleep 1
done

if [ $SUCCESS -eq 0 ] && systemctl is-active --quiet douding 2>/dev/null; then
  warn "Java 服务运行中但 8080 端口未就绪，可能在执行数据库迁移..."
  sleep 10
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 阶段1 部署完成！${NC}"
echo "=========================================="
echo "  端口监听:"
ss -tlnp | grep -E '8080|3457|80' || echo "  (端口信息获取失败)"
echo ""
echo "  服务状态:"
systemctl is-active douding 2>/dev/null && echo "  douding: ✅ 运行中" || echo "  douding: ❌ 未运行"
systemctl is-active douding-python 2>/dev/null && echo "  douding-python: ✅ 运行中" || echo "  douding-python: ❌ 未运行"
systemctl is-active nginx 2>/dev/null && echo "  nginx: ✅ 运行中" || echo "  nginx: ❌ 未运行"
echo ""
echo "  测试: http://$SERVER_IP"
echo "  API:  http://$SERVER_IP/api/health"
echo ""
echo -e "${YELLOW}⚠️  下一步:${NC}"
echo "  1. 将 douding.online DNS 解析改为 $SERVER_IP"
echo "  2. DNS 生效后，运行: bash /tmp/enable-https.sh"
echo "=========================================="
