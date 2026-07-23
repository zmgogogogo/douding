"""
图片相关路由
"""
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from db.connection import get_db
import config

router = APIRouter()


@router.post("/image/upload")
async def upload_image(file: UploadFile = File(...)):
    """图片上传"""
    import uuid
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'png'
    safe_name = f"{uuid.uuid4()}.{ext}"
    path = config.UPLOADS_DIR / safe_name
    path.write_bytes(await file.read())
    return {'code': 200, 'data': {'url': f'/uploads/{safe_name}', 'filename': safe_name}}
