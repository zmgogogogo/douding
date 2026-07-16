#!/usr/bin/env bash
# 从本机同步代码到阿里云服务器（适合本地有未推送改动时使用）
# 用法：bash deploy/sync-from-local.sh admin@YOUR_SERVER_IP
set -euo pipefail

TARGET="${1:-admin@47.109.29.158}"

APP_DIR="/var/www/douding"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 同步代码到 $TARGET:$APP_DIR ..."
ssh "$TARGET" "mkdir -p $APP_DIR"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'douding.db*' \
  --exclude 'diagnose_output' \
  --exclude '.claude' \
  "$ROOT_DIR/" "$TARGET:$APP_DIR/"

echo "==> 在服务器上安装依赖、构建并重启..."
ssh "$TARGET" bash -s <<'REMOTE'
set -euo pipefail
cd /var/www/douding
npm ci
npm run build
pm2 restart douding || pm2 start deploy/ecosystem.config.cjs
pm2 save
REMOTE

echo "✅ 同步完成"
