from typing import Optional, Union
"""
转图结果缓存服务 — 文件缓存 7 天
文档规范 9.4：相同图片 + 相同参数的转图结果缓存 7 天，命中直接返回
"""
import hashlib
import json
import time
import os
from pathlib import Path
from config import CACHE_DIR, CACHE_TTL


def compute_cache_key(file_path: Union[str, Path], params: dict) -> str:
    """基于图片文件路径 + 参数计算缓存键"""
    h = hashlib.sha256()

    try:
        with open(file_path, 'rb') as f:
            h.update(f.read())
    except Exception:
        h.update(str(file_path).encode())
        h.update(str(time.time()).encode())

    sorted_items = sorted(params.items())
    params_str = '&'.join(f"{k}={v}" for k, v in sorted_items)
    h.update(params_str.encode())

    return h.hexdigest()


def compute_cache_key_from_bytes(file_bytes: bytes, params: dict) -> str:
    """
    基于图片字节内容 + 参数计算缓存键。
    用于上传文件的缓存匹配（无文件路径）。
    文档规范 9.4：相同图片 + 相同参数的转图结果缓存 7 天。
    """
    h = hashlib.sha256()
    h.update(file_bytes)

    # 只使用影响转图结果的参数（排除 prefilter/crisp 等不变参数）
    key_params = {
        k: v for k, v in sorted(params.items())
        if k in (
            'targetWidth', 'targetHeight', 'brand',
            'smartOptimize', 'bgUnify', 'bgMode', 'bgColor', 'bgEdgeHardness',
            'skinUnify', 'skinSmoothLevel', 'skinLayerCount', 'skinWarmth', 'skinBrightness',
            'ocrEnhance', 'pixelFontReplace', 'denoiseLevel', 'colorLimit'
        )
    }
    params_str = json.dumps(key_params, sort_keys=True, ensure_ascii=False)
    h.update(params_str.encode())

    return h.hexdigest()


def get_cached(cache_key: str) -> Optional[dict]:
    """获取缓存"""
    cache_file = CACHE_DIR / f"{cache_key}.json"
    if not cache_file.exists():
        return None

    mtime = os.path.getmtime(cache_file)
    if time.time() - mtime > CACHE_TTL:
        cache_file.unlink()
        return None

    try:
        data = json.loads(cache_file.read_text())
        age_hours = (time.time() - mtime) / 3600
        print(f"  💾 缓存命中: {cache_key[:12]}... ({age_hours:.1f}小时前)")
        return data
    except Exception:
        return None


def set_cached(cache_key: str, data: dict):
    """保存缓存"""
    try:
        cache_file = CACHE_DIR / f"{cache_key}.json"
        cache_file.write_text(json.dumps(data, ensure_ascii=False))
        print(f"  📦 缓存已保存: {cache_key[:12]}...")
    except Exception as e:
        print(f"缓存保存失败: {e}")


def cleanup_expired():
    """清理过期缓存"""
    if not CACHE_DIR.exists():
        return
    now = time.time()
    cleaned = 0
    for f in CACHE_DIR.iterdir():
        if f.suffix != '.json':
            continue
        try:
            if now - os.path.getmtime(f) > CACHE_TTL:
                f.unlink()
                cleaned += 1
        except Exception:
            pass
    if cleaned:
        print(f"🧹 缓存清理: {cleaned} 个过期文件")
