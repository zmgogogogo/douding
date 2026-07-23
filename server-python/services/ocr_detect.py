"""
OCR 文字检测与增强（文档规范 4.3）
- PaddleOCR/DBNet 文字区域定位
- 回退方案：OpenCV MSER + Canny + 连通域分析
"""
import cv2
import numpy as np

_PADDLEOCR_AVAILABLE = False
_ocr = None
_ocr_init_attempted = False


def _init_paddleocr():
    """延迟初始化 PaddleOCR（避免启动时长时间阻塞）"""
    global _PADDLEOCR_AVAILABLE, _ocr, _ocr_init_attempted
    if _ocr_init_attempted:
        return
    _ocr_init_attempted = True
    try:
        import os
        os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
        from paddleocr import PaddleOCR
        # PaddleOCR 新版(>=2.7) 移除了 show_log 参数
        try:
            _ocr = PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
        except Exception:
            _ocr = PaddleOCR(use_angle_cls=True, lang='ch')
        _PADDLEOCR_AVAILABLE = True
        print("[OCR] PaddleOCR 已加载")
    except ImportError:
        print("[OCR] PaddleOCR 未安装，使用 OpenCV MSER 回退方案")
    except Exception as e:
        print(f"[OCR] PaddleOCR 加载失败: {e}，使用 OpenCV MSER 回退方案")


def detect_text_regions(image: np.ndarray) -> list[dict]:
    """检测图片中的文字区域"""
    _init_paddleocr()  # 延迟初始化
    if _PADDLEOCR_AVAILABLE:
        return _detect_paddleocr(image)
    return _detect_opencv_mser(image)


def _detect_paddleocr(image: np.ndarray) -> list[dict]:
    results = _ocr.ocr(image, cls=True)
    regions = []
    if results and results[0]:
        for line in results[0]:
            bbox = line[0]
            text, conf = line[1][0], line[1][1]
            xs, ys = [p[0] for p in bbox], [p[1] for p in bbox]
            x, y = int(min(xs)), int(min(ys))
            w, h = int(max(xs) - x), int(max(ys) - y)
            regions.append({'bbox': (x, y, w, h), 'text': text, 'confidence': conf})
    return regions


def _detect_opencv_mser(image: np.ndarray) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape[:2]
    mser = cv2.MSER_create(_delta=5, _min_area=30, _max_area=min(w * h // 4, 10000))
    regions_mser, _ = mser.detectRegions(gray)
    regions = []
    for pts in regions_mser:
        if len(pts) < 4:
            continue
        rx, ry, rw, rh = cv2.boundingRect(pts)
        if rw < 8 or rh < 8 or rw > w * 0.8 or rh > h * 0.5:
            continue
        aspect = max(rw, rh) / max(min(rw, rh), 1)
        if aspect > 15:
            continue
        regions.append({'bbox': (rx, ry, rw, rh), 'text': '', 'confidence': 0.5})
    return _merge_overlapping(regions)


def _merge_overlapping(regions: list[dict], iou_threshold: float = 0.3) -> list[dict]:
    if len(regions) < 2:
        return regions
    merged, used = [], set()
    for i, r1 in enumerate(regions):
        if i in used:
            continue
        x1, y1, w1, h1 = r1['bbox']
        best = r1
        for j, r2 in enumerate(regions):
            if i == j or j in used:
                continue
            x2, y2, w2, h2 = r2['bbox']
            ix1, iy1 = max(x1, x2), max(y1, y2)
            ix2, iy2 = min(x1 + w1, x2 + w2), min(y1 + h1, y2 + h2)
            inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
            area1, area2 = w1 * h1, w2 * h2
            iou = inter / min(area1, area2) if min(area1, area2) > 0 else 0
            if iou > iou_threshold:
                used.add(j)
                nx, ny = min(x1, x2), min(y1, y2)
                nw = max(x1 + w1, x2 + w2) - nx
                nh = max(y1 + h1, y2 + h2) - ny
                best = {'bbox': (nx, ny, nw, nh), 'text': '', 'confidence': max(r1.get('confidence', 0), r2.get('confidence', 0))}
        merged.append(best)
        used.add(i)
    return merged


def generate_text_mask(image: np.ndarray, text_regions: list[dict]) -> np.ndarray:
    h, w = image.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for region in text_regions:
        x, y, rw, rh = region['bbox']
        x1, y1 = max(0, x - 2), max(0, y - 2)
        x2, y2 = min(w, x + rw + 2), min(h, y + rh + 2)
        mask[y1:y2, x1:x2] = 255
    return mask


def enhance_text_edges(image: np.ndarray, text_mask: np.ndarray) -> np.ndarray:
    result = image.copy()
    mask_3ch = np.stack([text_mask > 128] * 3, axis=-1)
    if not mask_3ch.any():
        return result
    lab = cv2.cvtColor(result, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
    l_enhanced = clahe.apply(l)
    lab_enhanced = cv2.merge([l_enhanced, a, b])
    enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)
    result[mask_3ch] = enhanced[mask_3ch]
    gray = cv2.cvtColor(result, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    kernel = np.ones((2, 2), np.uint8)
    edges_dilated = cv2.dilate(edges, kernel, iterations=1)
    edge_mask = np.stack([(edges_dilated > 0) & (text_mask > 128)] * 3, axis=-1)
    result[edge_mask] = np.clip(result[edge_mask].astype(np.int32) * 1.2, 0, 255).astype(np.uint8)
    return result
