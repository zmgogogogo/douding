# ============================================
#  豆丁 (Douding) Docker 镜像
#  多阶段构建：Node.js 前端 + Express 后端 + Python 图片引擎
# ============================================

# ---- Stage 1: 前端构建 ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN npm run build

# ---- Stage 2: Node.js 后端 + Python 引擎 ----
FROM node:20-slim

# 安装 Python 3 + OpenCV 依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Node.js 层 ----
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 复制构建产物
COPY --from=frontend-builder /app/dist ./dist

# 复制后端源码
COPY server/ ./server/
COPY public/ ./public/

# ---- Python 层 ----
COPY server-python/requirements.txt ./server-python/
RUN python3 -m venv /app/server-python/.venv && \
    /app/server-python/.venv/bin/pip install --no-cache-dir -r server-python/requirements.txt

COPY server-python/ ./server-python/

# ---- 运行 ----
ENV NODE_ENV=production
ENV PORT=3456
ENV PYTHON_PORT=3457

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3456/api/health', (r) => {process.exit(r.statusCode===200?0:1)})"

EXPOSE 3456
CMD ["node", "server/index.js"]
