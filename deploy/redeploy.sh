#!/usr/bin/env bash
# 在服务器上从 Git 拉取最新代码并重新部署
# 用法：bash deploy/redeploy.sh
set -euo pipefail

APP_DIR="/var/www/douding"
REPO_URL="${REPO_URL:-https://github.com/zmgogogogo/douding.git}"

cd "$APP_DIR"

echo "==> 拉取最新代码..."
if [ -d .git ]; then
  git fetch origin
  git reset --hard origin/main
else
  echo "错误：$APP_DIR 不是 Git 仓库，请先执行 git clone"
  exit 1
fi

echo "==> 当前版本: $(git rev-parse --short HEAD) $(git log -1 --format='%s')"

echo "==> 安装依赖并构建..."
npm ci
npm run build

echo "==> 重启应用..."
set -a
[ -f .env ] && . ./.env
set +a
pm2 restart douding || pm2 start deploy/ecosystem.config.cjs
pm2 save

echo "==> 验证服务..."
sleep 2
curl -s -o /dev/null -w "status:%{http_code}\n" http://127.0.0.1:3456/
curl -s http://127.0.0.1:3456/api/public/app/version
echo
echo "✅ 重新部署完成"
