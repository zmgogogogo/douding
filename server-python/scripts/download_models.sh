#!/usr/bin/env bash
# ============================================================
#  豆丁智能转图 — ML 模型下载脚本（文档规范 9.2）
# ============================================================
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODELS_DIR="$(dirname "$SCRIPT_DIR")/models"
mkdir -p "$MODELS_DIR"
echo "=== 豆丁 ML 模型下载 ==="
echo "目标: $MODELS_DIR"

echo "[1/3] PP-HumanSeg v2 人像分割..."
HUMANSEG_DIR="$MODELS_DIR/pp_humanseg_v2"
mkdir -p "$HUMANSEG_DIR"
HUMANSEG_URL="https://paddleseg.bj.bcebos.com/dygraph/humanseg/pp_humanseg_v2/pp_humanseg_v2_lite_192x192.onnx"
if [ ! -f "$HUMANSEG_DIR/pp_humanseg_v2_lite_192x192.onnx" ]; then
    curl -L --retry 3 -o "$HUMANSEG_DIR/pp_humanseg_v2_lite_192x192.onnx" "$HUMANSEG_URL" || echo "下载失败，将使用回退方案"
else
    echo "已存在"
fi

echo "[2/3] RetinaFace 人脸检测..."
RETINAFACE_DIR="$MODELS_DIR/retinaface"
mkdir -p "$RETINAFACE_DIR"
echo "推荐: pip install insightface (自动下载 68点关键点模型)"
echo "无模型时将回退到 Haar Cascade"

echo "[3/3] PaddleOCR 文字检测..."
python3 -c "from paddleocr import PaddleOCR" 2>/dev/null && echo "已安装" || echo "未安装: pip install paddleocr (将回退到 MSER)"

echo "=== 完成 ==="
