"""
豆丁后端配置常量
"""
import os
from pathlib import Path

# --- 路径 ---
BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
UPLOADS_DIR = PROJECT_DIR / "public" / "uploads"
CACHE_DIR = PROJECT_DIR / ".cache" / "convert"

# 确保目录存在
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# --- 服务 ---
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 3457))

# --- 认证 ---
JWT_SECRET = os.getenv("JWT_SECRET", "douding-secret-key-change-in-production")
JWT_EXPIRES_IN = 30 * 24 * 3600  # 30 天
BCRYPT_ROUNDS = 10

# --- 上传 ---
UPLOAD_MAX_SIZE = 30 * 1024 * 1024  # 30MB
ALLOWED_IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

# --- 转图 ---
DEFAULT_GRID_SIZE = 58
LONG_EDGE_TARGET = 1024  # 预处理长边归一化目标

# --- 引导滤波默认参数（文档规范） ---
GUIDED_FILTER_R = 5
GUIDED_FILTER_EPS = 0.025

# --- 缓存 ---
CACHE_TTL = 7 * 24 * 3600  # 7 天

# --- 模型路径（可选，下载后配置） ---
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)
HUMANSEG_MODEL_PATH = MODELS_DIR / "pp_humanseg_v2"
RETINAFACE_MODEL_PATH = MODELS_DIR / "retinaface"
PADDLEOCR_MODEL_PATH = MODELS_DIR / "paddleocr"
