"""
智能转图路由（文档规范 9.3）
============================
POST /api/convert/smart-submit — 提交异步转图任务
GET  /api/convert/status    — 查询任务状态
POST /api/convert/preview   — 低分辨率快速预览（<1s）
POST /api/image-to-grid     — 同步转图（兼容旧前端）

五阶段管道：预处理 → 语义分割 → 分区优化 → 量化 → 像素化 → 后处理
严格遵循文档规范：零抖动、分区独立K值、CIEDE2000色板映射
"""
import json
import uuid
import time
import threading
import sys
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse

from db.connection import get_db
from services.preprocessing import preprocess
from services.color_match import load_bead_colors, find_best_match_oklab, match_centers_to_beads
from services.quantization import _is_pure_region, _kmeans_cluster, _assign_to_centers, _centers_to_rgb_colors
from services.pixelize import edge_aligned_pixelize
from services.postprocess import postprocess_grid
from services.cache import compute_cache_key_from_bytes, get_cached, set_cached
from services.tasks import submit_convert_task, get_celery_app
from utils.color_space import rgb_to_oklab
import config

router = APIRouter()

# --- 异步任务存储（供 Celery/threading 回退用） ---
task_store: dict = {}

# 启动时尝试连接 Celery
get_celery_app()


def _pixels_to_grid(pixels: np.ndarray, bead_colors: list) -> list:
    """
    将量化后的 RGB 像素数组转换为前端 grid 格式（带颜色匹配缓存）。

    量化后的图只有少量唯一颜色（通常 5~20 种），用 dict 缓存
    RGB→珠子匹配结果，避免对每个像素重复 Oklab 遍历。

    Args:
        pixels: (H, W, 3) uint8 RGB 图像
        bead_colors: 预计算 Lab/Oklab 的珠子颜色列表

    Returns:
        list[list[dict|None]] 前端 grid 格式
    """
    h, w = pixels.shape[:2]
    grid = []
    match_cache = {}  # RGB tuple → bead info dict

    for y in range(h):
        row = []
        for x in range(w):
            rgb_key = (int(pixels[y, x, 0]), int(pixels[y, x, 1]), int(pixels[y, x, 2]))
            if rgb_key not in match_cache:
                oklab = rgb_to_oklab(np.array(list(rgb_key)))
                best = find_best_match_oklab(oklab, bead_colors)
                match_cache[rgb_key] = {
                    'id': best['id'],
                    'name': best['name'],
                    'hex': best['hex'],
                    'brand': best.get('brand', '')
                }
            row.append(match_cache[rgb_key])
        grid.append(row)
    return grid


def _compute_bead_list_from_grid(grid: list) -> list:
    """
    统计材料清单（文档规范 8.5）

    直接从已匹配的 grid 统计珠子数量（避免重复 Oklab 匹配），按数量降序排列。
    包含：色块 + 色号 + 数量 + 占比。

    Args:
        grid: list[list[dict|None]] 已匹配颜色的网格

    Returns:
        list[dict]: [{hex, name, brand, count, ratio}, ...]
    """
    hex_counts = {}
    info_map = {}

    for row in grid:
        for cell in row:
            if not cell or 'hex' not in cell:
                continue
            hex_v = cell['hex']
            hex_counts[hex_v] = hex_counts.get(hex_v, 0) + 1
            if hex_v not in info_map:
                info_map[hex_v] = {
                    'name': cell.get('name', ''),
                    'brand': cell.get('brand', '')
                }

    total = sum(hex_counts.values()) or 1
    bead_list = []
    for hex_v, count in sorted(hex_counts.items(), key=lambda kv: -kv[1]):
        info = info_map.get(hex_v, {})
        bead_list.append({
            'hex': hex_v,
            'name': info.get('name', ''),
            'brand': info.get('brand', ''),
            'count': count,
            'ratio': f"{count / total * 100:.1f}%"
        })
    return bead_list


# ============================================
#  五阶段转图核心（文档规范 二~七章）
# ============================================

def _image_to_grid(
    image: np.ndarray,
    target_w: int, target_h: int,
    brand: Optional[str] = None,
    options: dict = None
) -> dict:
    """
    纯算法图片转拼豆网格流水线（无 AI/ML 依赖）。

    阶段：
      一、图像预处理（保边降噪 + 尺寸归一化）
      二、全局 K-Means 纯色量化（无分区，全图统一）
      三、CIEDE2000 色板硬映射
      四、边缘对齐最近邻像素化
      五、后处理（连通域过滤 + 颜色统计）
    """
    opts = options or {}
    stage_times = {}

    # ================================================
    #  一、预处理：尺寸归一化 + 保边降噪
    # ================================================
    t0 = time.time()
    prefilter = opts.get('prefilter', True)

    image = preprocess(image, prefilter=prefilter, crisp=False)
    h, w = image.shape[:2]
    stage_times['预处理'] = round(time.time() - t0, 2)
    print(f"一、预处理完成: {w}×{h} ({stage_times['预处理']}s)")

    # ================================================
    #  二、全局 K-Means 量化 + CIEDE2000 色板映射
    # ================================================
    t0 = time.time()
    db = get_db()
    bead_colors = load_bead_colors(db, brand)
    db.close()

    color_limit = opts.get('colorLimit', 16)
    if color_limit <= 0:
        color_limit = 16

    # 全图统一量化：所有像素作为一个区域，K = colorLimit
    all_pixels = image.reshape(-1, 3).astype(np.float64)
    n_pixels = len(all_pixels)

    # 纯色检测：方差极低则跳过 K-Means
    if _is_pure_region(all_pixels):
        centers = all_pixels.mean(axis=0, keepdims=True)
    else:
        centers = _kmeans_cluster(all_pixels, min(color_limit, n_pixels))

    # 聚类中心 → 珠子颜色（CIEDE2000）
    center_beads = match_centers_to_beads(centers, bead_colors)

    # 向量化像素分配
    if len(centers) == 1:
        bead = center_beads[0]
        hex_str = bead['hex'].lstrip('#')
        rgb = np.array([int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)], dtype=np.uint8)
        quantized = np.full((h, w, 3), rgb, dtype=np.uint8)
        all_hexes = {bead['hex']}
    else:
        centroid_indices = _assign_to_centers(all_pixels, centers)
        colors = _centers_to_rgb_colors(centers, center_beads)
        assigned = colors[centroid_indices]
        quantized = assigned.reshape(h, w, 3).astype(np.uint8)
        all_hexes = {b['hex'] for b in center_beads}

    quant_stats = {
        'total_colors': len(all_hexes),
        'total_beads': n_pixels,
        'algorithm': 'global-kmeans-hardmap-ciede2000',
        'regions': {'all': {'k': color_limit, 'pixels': n_pixels, 'centers': len(centers), 'bead_colors': len(all_hexes)}}
    }
    stage_times['量化'] = round(time.time() - t0, 2)
    print(f"二、全局量化完成: K={color_limit} → {len(all_hexes)}色 ({stage_times['量化']}s)")

    # ================================================
    #  三、边缘对齐最近邻像素化
    # ================================================
    t0 = time.time()
    print(f"三、边缘对齐像素化: {w}×{h} → {target_w}×{target_h}")

    t1 = time.time()
    result = edge_aligned_pixelize(quantized, target_w, target_h)
    final_pixels = result['pixels']
    fw, fh = result['width'], result['height']
    print(f"  3.1 像素化: {time.time()-t1:.2f}s")

    # 像素 → grid 格式（带颜色匹配缓存）
    t1 = time.time()
    final_grid = _pixels_to_grid(final_pixels, bead_colors)
    print(f"  3.2 像素→网格: {time.time()-t1:.2f}s ({fw}×{fh})")

    # ================================================
    #  四、后处理：连通域过滤
    # ================================================
    t1 = time.time()
    denoise_level = opts.get('denoiseLevel', 2)
    denoise_threshold = [1, 2, 3, 5][denoise_level] if 0 <= denoise_level < 4 else 3

    # 后处理：全局连通域过滤（无区域约束，统一阈值）
    final_grid, post_stats = postprocess_grid(final_grid, fw, fh, None, {
        'minComponentSize': denoise_threshold,
        'morphOpen': False  # 关闭形态学开运算避免破坏边界
    })
    print(f"  3.3 后处理: {time.time()-t1:.2f}s")

    # ================================================
    #  4.5 可选后处理：像素字体替换 + 五官修复
    # ================================================
    if opts.get('pixelFontReplace') or opts.get('faceRepair'):
        t_opt = time.time()
        try:
            from services.pixel_font import replace_text_with_pixel_font
            from services.ocr_detect import detect_text_regions
            from services.feature_repair import check_eye_symmetry, repair_mouth_contour

            # 像素字体替换（OCR 检测 → 像素字体渲染）
            if opts.get('pixelFontReplace'):
                text_regions = detect_text_regions(image)
                if text_regions:
                    print(f"  [像素字体] 检测到 {len(text_regions)} 个文字区域")
                    image = replace_text_with_pixel_font(image, text_regions)
                    final_grid = _pixels_to_grid(
                        edge_aligned_pixelize(quantized, target_w, target_h)['pixels'],
                        bead_colors
                    )
                    print(f"  [像素字体] 替换完成")
                else:
                    print(f"  [像素字体] 未检测到文字区域")

            # 五官修复
            if opts.get('faceRepair'):
                from services.face_detection import detect_faces
                faces = detect_faces(image)
                for face in faces:
                    landmarks = face.get('landmarks')
                    if landmarks and len(landmarks) >= 68:
                        sym = check_eye_symmetry(np.array(landmarks))
                        if sym['needs_correction']:
                            print(f"  [五官修复] 左右眼不对称: 评分{sym['symmetry_score']:.2f}")
                        final_grid = repair_mouth_contour(final_grid, fw, fh, np.array(landmarks))
                        print(f"  [五官修复] 完成 ({len(faces)} 张人脸)")
                        break  # 当前只处理第一张脸

            stage_times['像素字体+五官修复'] = round(time.time() - t_opt, 2)
        except Exception as e:
            print(f"  [可选后处理] 跳过: {e}")

    # 颜色统计
    t1 = time.time()
    bead_list = _compute_bead_list_from_grid(final_grid)
    print(f"  3.4 颜色统计: {time.time()-t1:.2f}s")

    stage_times['像素化+后处理'] = round(time.time() - t0, 2)
    total_elapsed = sum(stage_times.values())
    print(f"✅ 转图完成: {target_w}×{target_h} {len(all_hexes)}色 总耗时{total_elapsed:.2f}s")

    return {
        'url': '',
        'grid': final_grid,
        'gridWidth': target_w,
        'gridHeight': target_h,
        'algorithm': 'guided-filter+kmeans-hardmap+ciede2000+edge-aligned-nn+postprocess',
        'colorCount': len(all_hexes),
        'beadCount': sum(1 for row in final_grid for cell in row if cell),
        'beadList': bead_list,
        'quantizeStats': quant_stats,
        'postProcessStats': post_stats,
        'stageTimes': stage_times,
        'elapsed': round(total_elapsed, 2),
    }


# ============================================
#  POST /api/convert/smart-submit（异步）
# ============================================
@router.post("/convert/smart-submit")
async def smart_submit(
    file: UploadFile = File(...),
    targetWidth: int = Form(58),
    targetHeight: int = Form(0),
    brand: str = Form("全部"),
    denoiseLevel: int = Form(2),
    colorLimit: int = Form(16),
    pixelFontReplace: bool = Form(False),
    faceRepair: bool = Form(False),
):
    """转图提交（异步）— 返回 task_id"""
    file_bytes = await file.read()

    params = {
        'targetWidth': targetWidth, 'targetHeight': targetHeight,
        'brand': brand,
        'denoiseLevel': denoiseLevel,
        'colorLimit': colorLimit,
        'prefilter': True,
        'pixelFontReplace': pixelFontReplace,
        'faceRepair': faceRepair,
    }

    task_id = submit_convert_task(file_bytes, params)

    return {
        'code': 200,
        'data': {
            'task_id': task_id,
            'status': 'pending',
            'message': '任务已提交，请轮询 /api/convert/status 获取结果'
        }
    }


# ============================================
#  GET /api/convert/status（查询任务状态）
#  文档规范：返回 pending/processing/success/fail + 进度
# ============================================
@router.get("/convert/status")
def convert_status(task_id: str = Query(...)):
    """查询转图任务状态"""
    task = task_store.get(task_id)
    if not task:
        return JSONResponse({'code': 404, 'message': '任务不存在或已过期'}, status_code=404)

    return {
        'code': 200,
        'data': {
            'task_id': task_id,
            'status': task.get('status', 'unknown'),
            'progress': task.get('progress', 0),
            'result': task.get('result'),
            'error': task.get('error')
        }
    }


# ============================================
#  POST /api/convert/preview（低分辨率快速预览）
#  文档规范：响应时间＜1s，用于参数调节时实时刷新
# ============================================
@router.post("/convert/preview")
async def convert_preview(
    file: UploadFile = File(...),
    targetWidth: int = Form(40),
    targetHeight: int = Form(0),
    brand: str = Form("全部"),
):
    """
    低分辨率快速预览。
    最近邻缩放 + Oklab 快速匹配。目标响应时间 < 1s。
    """
    file_bytes = await file.read()
    img_array = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse({'code': 400, 'message': '无法解析图片'}, status_code=400)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    h, w = image.shape[:2]
    if targetHeight <= 0:
        targetHeight = int(targetWidth * h / w)

    # 缩放到 2× 目标尺寸（最近邻，不产生过渡色）
    preview = cv2.resize(
        image, (targetWidth * 2, targetHeight * 2),
        interpolation=cv2.INTER_NEAREST
    )

    # 加载珠子颜色
    db = get_db()
    bead_colors = load_bead_colors(db, brand if brand != '全部' else None)
    db.close()

    # 下采样到目标尺寸 + Oklab 匹配
    grid = []
    hexes = set()
    for y in range(0, preview.shape[0], 2):
        row = []
        for x in range(0, preview.shape[1], 2):
            r, g, b = map(int, preview[y, x])
            oklab = rgb_to_oklab(np.array([r, g, b]))
            best = find_best_match_oklab(oklab, bead_colors)
            row.append({'id': best['id'], 'name': best['name'], 'hex': best['hex']})
            hexes.add(best['hex'])
        grid.append(row)

    return {
        'code': 200,
        'data': {
            'grid': grid,
            'gridWidth': targetWidth,
            'gridHeight': targetHeight,
            'colorCount': len(hexes),
            'beadCount': targetWidth * targetHeight,
            'preview': True
        }
    }


# ============================================
#  POST /api/image-to-grid（同步兼容接口）
# ============================================
@router.post("/image-to-grid")
async def image_to_grid(
    file: UploadFile = File(...),
    targetWidth: int = Form(58),
    targetHeight: int = Form(0),
    brand: str = Form("全部"),
    cropX: int = Form(0),
    cropY: int = Form(0),
    cropW: int = Form(0),
    cropH: int = Form(0),
    denoiseLevel: int = Form(2),
    colorLimit: int = Form(16),
    pixelFontReplace: bool = Form(False),
    faceRepair: bool = Form(False),
):
    """
    图片转拼豆网格（纯算法，可选 AI 增强）。

    参数：
      - targetWidth/targetHeight: 目标尺寸
      - brand: 色板品牌
      - cropX/Y/W/H: 裁剪区域
      - denoiseLevel: 杂点去除 0=关 1=轻 2=中 3=强
      - colorLimit: 颜色数量上限
    """
    file_bytes = await file.read()
    img_array = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse({'code': 400, 'message': '无法解析图片'}, status_code=400)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # ---- 裁剪处理 ----
    if cropW > 0 and cropH > 0:
        h_img, w_img = image.shape[:2]
        x1 = max(0, min(cropX, w_img - 1))
        y1 = max(0, min(cropY, h_img - 1))
        x2 = max(x1 + 1, min(cropX + cropW, w_img))
        y2 = max(y1 + 1, min(cropY + cropH, h_img))
        if x2 - x1 > 10 and y2 - y1 > 10:
            image = image[y1:y2, x1:x2]
            print(f"  裁剪: ({x1},{y1}) → ({x2},{y2}) {x2-x1}×{y2-y1}")

    if targetHeight <= 0:
        h, w = image.shape[:2]
        targetHeight = int(targetWidth * h / w)

    # ---- 缓存检查 ----
    cache_params = {
        'targetWidth': targetWidth, 'targetHeight': targetHeight,
        'brand': brand, 'denoiseLevel': denoiseLevel, 'colorLimit': colorLimit,
        'cropX': cropX, 'cropY': cropY, 'cropW': cropW, 'cropH': cropH,
    }
    cache_key = compute_cache_key_from_bytes(file_bytes, cache_params)
    cached_result = get_cached(cache_key)
    if cached_result is not None:
        return {'code': 200, 'data': {**cached_result, 'cached': True}}

    try:
        result = _image_to_grid(image, targetWidth, targetHeight,
                                brand if brand != '全部' else None, {
            'denoiseLevel': denoiseLevel,
            'colorLimit': colorLimit,
            'prefilter': True,
            'pixelFontReplace': pixelFontReplace,
            'faceRepair': faceRepair,
        })
        set_cached(cache_key, result)
        return {'code': 200, 'data': result}
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(tb)
        return JSONResponse(
            {'code': 500, 'message': f'图片处理失败: {e}'},
            status_code=500
        )


# ============================================
#  POST /api/convert/detect-faces — 人脸检测（用于前端框选 UI）
# ============================================
@router.post("/convert/detect-faces")
async def detect_faces_endpoint(file: UploadFile = File(...)):
    """
    检测图片中的人脸，返回所有人脸的位置和编号。

    用于前端展示人脸选择 UI，支持用户手动框选/调参。
    """
    try:
        file_bytes = await file.read()
        img_array = np.frombuffer(file_bytes, np.uint8)
        image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if image is None:
            return JSONResponse({'code': 400, 'message': '无法解析图片'}, status_code=400)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # 缩放到 512px 以内提速
        h, w = image.shape[:2]
        scale = min(1.0, 512 / max(h, w))
        if scale < 1.0:
            image = cv2.resize(image, (int(w * scale), int(h * scale)))

        from services.face_detection import detect_faces
        faces = detect_faces(image)

        return {
            'code': 200,
            'data': {
                'faces': [
                    {
                        'index': i,
                        'bbox': f['bbox'],
                        'landmarks': f.get('landmarks', []),
                        'confidence': f.get('confidence', 0),
                    }
                    for i, f in enumerate(faces)
                ],
                'image_scale': scale,
                'total': len(faces),
            },
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            {'code': 500, 'message': f'人脸检测失败: {e}'},
            status_code=500
        )
