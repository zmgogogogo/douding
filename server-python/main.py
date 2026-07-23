"""
豆丁 Douding — Python 智能转图后端
FastAPI + OpenCV + scikit-learn
"""
import sys
from pathlib import Path

# 添加当前目录到路径
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db.connection import init_db
from routes.convert import router as convert_router
from routes.image import router as image_router
from routes.beads import router as beads_router
import config

# --- 初始化 ---
init_db()

app = FastAPI(
    title="豆丁智能转图",
    description="拼豆图片转像素图 — Python 后端",
    version="3.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# 路由注册
app.include_router(convert_router, prefix="/api")
app.include_router(image_router, prefix="/api")
app.include_router(beads_router, prefix="/api")

# 静态文件
uploads_dir = str(config.UPLOADS_DIR)
if Path(uploads_dir).exists():
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "3.0.0", "engine": "Python+OpenCV"}


# --- 启动 ---
if __name__ == "__main__":
    import uvicorn
    print(f"🧩 豆丁 Python 后端启动 → http://localhost:{config.PORT}")
    print(f"   API 端点: http://localhost:{config.PORT}/api")
    print(f"   健康检查: http://localhost:{config.PORT}/api/health")
    uvicorn.run(app, host=config.HOST, port=config.PORT)
