"""
人脸检测与区域拆分模块
======================
对人脸进行检测并拆分为皮肤区域和五官区域。

主方案：
- 人脸检测：MTCNN / RetinaFace → bounding box + 人脸区域掩码
- 68 点人脸关键点 → 眼睛/眉毛/嘴巴/鼻子 → 五官掩码
- 皮肤区提取：人脸区域内扣除五官掩码 + HSV 肤色二次校验
- 输出 face_skin_mask + facial_feature_mask
- 区域互斥校验：皮肤/五官/背景两两互斥
- 多人脸自动检测 + 统一优化

回退方案（模型不可用时）：
- OpenCV Haar Cascade 人脸检测
- 启发式五官定位（人脸框内上 1/3 深色区 = 眼睛，下 1/3 红色区 = 嘴巴）
- HSV 肤色范围过滤
"""

import cv2
import numpy as np
from config import RETINAFACE_MODEL_PATH, MODELS_DIR

# ---- 常量定义 ----

# 68 点人脸关键点语义分组（dlib / FaceMesh 通用索引）
# 下颌线: 0~16, 右眉: 17~21, 左眉: 22~26, 鼻梁: 27~30, 鼻底: 31~35
# 右眼: 36~41, 左眼: 42~47, 外唇: 48~59, 内唇: 60~67
FACIAL_FEATURE_GROUPS = {
    "right_eyebrow": list(range(17, 22)),
    "left_eyebrow": list(range(22, 27)),
    "right_eye": list(range(36, 42)),
    "left_eye": list(range(42, 48)),
    "nose_bridge": list(range(27, 31)),
    "nose_tip": list(range(31, 36)),
    "mouth_outer": list(range(48, 60)),
    "mouth_inner": list(range(60, 68)),
}

# HSV 肤色范围（H: 5°~25° 在 OpenCV 中为 5~25，因为 OpenCV 的 H 是 0~179）
_SKIN_H_MIN = 5
_SKIN_H_MAX = 25
_SKIN_S_MIN = 20
_SKIN_S_MAX = 180
_SKIN_V_MIN = 120
_SKIN_V_MAX = 255

# 形态学核（复用）
_KERNEL_CLOSE_5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
_KERNEL_CLOSE_3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
_KERNEL_ERODE_3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))


# ============================================================
# 模型加载（带 try/except 回退）
# ============================================================

def _load_retinaface():
    """尝试加载 RetinaFace 模型（ONNX 格式）。"""
    try:
        import onnxruntime as ort

        model_path = RETINAFACE_MODEL_PATH
        if model_path.is_dir():
            onnx_files = list(model_path.glob("*.onnx"))
            if not onnx_files:
                return None
            model_path = onnx_files[0]
        elif not model_path.exists():
            return None

        session = ort.InferenceSession(str(model_path))
        input_info = session.get_inputs()[0]
        return session, input_info.name, input_info.shape
    except Exception:
        return None


def _load_mtcnn():
    """尝试加载 MTCNN（通过 facenet-pytorch 或 mtcnn 包）。"""
    try:
        from mtcnn import MTCNN as MTCNNModule
        return MTCNNModule()
    except ImportError:
        pass

    try:
        from facenet_pytorch import MTCNN as MTCNNModule
        detector = MTCNNModule(keep_all=True)
        return detector
    except ImportError:
        pass

    return None


def _load_landmark_predictor():
    """尝试加载 68 点关键点预测器（dlib / OpenCV facemark）。"""
    try:
        # 尝试 dlib
        import dlib
        predictor_path = MODELS_DIR / "shape_predictor_68_face_landmarks.dat"
        if predictor_path.exists():
            detector = dlib.get_frontal_face_detector()
            predictor = dlib.shape_predictor(str(predictor_path))
            return ("dlib", detector, predictor)
        else:
            # 仅检测器可用，无关键点预测
            detector = dlib.get_frontal_face_detector()
            return ("dlib_detect_only", detector, None)
    except ImportError:
        pass
    except Exception:
        pass

    return None


def _load_haar_cascade():
    """加载 OpenCV Haar Cascade 人脸检测器（始终可用的回退方案）。"""
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    if not cv2.CascadeClassifier(cascade_path).empty():
        return cv2.CascadeClassifier(cascade_path)
    return None


# ============================================================
# 人脸检测
# ============================================================

def _detect_retinaface(image_bgr, model_info):
    """
    使用 RetinaFace ONNX 模型检测人脸。
    返回 list[dict]，每项含 bbox, landmarks, confidence。
    """
    session, input_name, _ = model_info
    h, w = image_bgr.shape[:2]

    # 预处理
    if isinstance(960, int):
        scale = min(960 / h, 960 / w)
        new_h, new_w = int(h * scale), int(w * scale)
        img = cv2.resize(image_bgr, (new_w, new_h))
    else:
        img = image_bgr
        new_h, new_w = h, w

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_float = img_rgb.astype(np.float32)
    img_norm = (img_float - 127.5) / 128.0
    img_chw = np.transpose(img_norm, (2, 0, 1))
    img_batch = np.expand_dims(img_chw, axis=0)

    outputs = session.run(None, {input_name: img_batch})
    # 简化输出解析 — 实际输出格式依赖具体 ONNX 模型
    faces = []

    # RetinaFace 典型输出：bboxes, landmarks, scores
    if len(outputs) >= 3:
        bboxes = outputs[0]  # [N, 4]
        landmarks = outputs[1]  # [N, 10]
        scores = outputs[2]  # [N, 1]

        scale_x = w / new_w if new_w != w else 1.0
        scale_y = h / new_h if new_h != h else 1.0

        for i in range(len(scores)):
            score = float(scores[i]) if np.isscalar(scores[i]) else float(scores[i][0])
            if score < 0.5:
                continue

            x1 = int(bboxes[i][0] * scale_x)
            y1 = int(bboxes[i][1] * scale_y)
            x2 = int(bboxes[i][2] * scale_x)
            y2 = int(bboxes[i][3] * scale_y)

            # 关键点：[x1,y1, x2,y2, x3,y3, x4,y4, x5,y5]
            lmk_list = []
            for j in range(0, min(10, len(landmarks[i])), 2):
                lx = int(landmarks[i][j] * scale_x)
                ly = int(landmarks[i][j + 1] * scale_y)
                lmk_list.append((lx, ly))

            faces.append({
                "bbox": (x1, y1, x2 - x1, y2 - y1),
                "landmarks": lmk_list,
                "confidence": score,
            })

    return faces


def _detect_haar(image_bgr):
    """
    回退方案：OpenCV Haar Cascade 人脸检测。
    返回 list[dict]，每项含 bbox。
    """
    cascade = _load_haar_cascade()
    if cascade is None:
        return []

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # 多尺度检测
    rects = cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )

    faces = []
    for (x, y, w_box, h_box) in rects:
        faces.append({
            "bbox": (int(x), int(y), int(w_box), int(h_box)),
            "landmarks": [],
            "confidence": 0.0,
        })

    return faces


# ============================================================
# 启发式五官定位（回退方案）
# ============================================================

def _heuristic_landmarks(image_bgr, face_rect):
    """
    回退方案：基于启发式规则的五官区域估算。
    face_rect: (x, y, w, h)
    返回 dict，含各级别五官区域掩码。
    """
    x, y, w_box, h_box = face_rect
    face_roi = image_bgr[y:y + h_box, x:x + w_box]
    gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)

    # 人脸框内上 1/3 找深色区域 = 眼睛
    eye_region = gray[:h_box // 3, :]
    _, eye_thresh = cv2.threshold(eye_region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # 人脸框内下 1/3 找红色区域 = 嘴巴
    mouth_region_hsv = hsv[2 * h_box // 3:, :]
    # 红色在 HSV 中有两个区间：0~10 和 160~179
    red_mask1 = cv2.inRange(mouth_region_hsv, (0, 30, 30), (10, 255, 255))
    red_mask2 = cv2.inRange(mouth_region_hsv, (160, 30, 30), (179, 255, 255))
    mouth_red = cv2.bitwise_or(red_mask1, red_mask2)

    # 中间区域 = 鼻子（肤色区域内的暗区）
    nose_region = gray[h_box // 3:2 * h_box // 3, w_box // 4:3 * w_box // 4]
    _, nose_thresh = cv2.threshold(nose_region, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # 将子区域掩码映射回人脸框内坐标
    eye_mask = np.zeros((h_box, w_box), dtype=np.uint8)
    eye_mask[:h_box // 3, :] = eye_thresh

    mouth_mask = np.zeros((h_box, w_box), dtype=np.uint8)
    mouth_mask[2 * h_box // 3:, :] = mouth_red

    nose_mask_full = np.zeros((h_box, w_box), dtype=np.uint8)
    nose_mask_full[h_box // 3:2 * h_box // 3, w_box // 4:3 * w_box // 4] = nose_thresh

    return {
        "eye_mask": eye_mask,
        "mouth_mask": mouth_mask,
        "nose_mask": nose_mask_full,
    }


# ============================================================
# 肤色掩码提取
# ============================================================

def _hsv_skin_filter(image_bgr):
    """
    HSV 肤色二次校验：H: 5~25°, S: 20~180, V: 120~255。
    返回肤色二值掩码。
    """
    # 注意 OpenCV 的 H 范围是 0~179（半值域）
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)

    # 第一区间：H 5~25
    skin_mask = cv2.inRange(hsv, (_SKIN_H_MIN, _SKIN_S_MIN, _SKIN_V_MIN),
                            (_SKIN_H_MAX, _SKIN_S_MAX, _SKIN_V_MAX))

    return skin_mask


# ============================================================
# 公共接口
# ============================================================

def detect_faces(image):
    """
    检测图像中所有人脸。

    尝试顺序：
    1. RetinaFace ONNX 模型
    2. MTCNN 模型
    3. dlib HOG 检测器
    4. OpenCV Haar Cascade（始终可用回退）

    Args:
        image: numpy.ndarray，BGR 格式图像 (H, W, 3)，uint8

    Returns:
        list[dict]: 人脸信息列表，每项包含：
            - bbox: (x, y, w, h) 边界框
            - landmarks: list[(x, y)] 关键点列表（可能为空）
            - confidence: float 置信度
            - face_mask: np.ndarray 人脸区域掩码（可选）
    """
    if image is None or image.size == 0:
        return []

    faces = []

    # 策略 1：RetinaFace
    retina_info = _load_retinaface()
    if retina_info is not None:
        try:
            faces = _detect_retinaface(image, retina_info)
            if faces:
                return faces
        except Exception:
            pass

    # 策略 2：MTCNN
    mtcnn = _load_mtcnn()
    if mtcnn is not None and not faces:
        try:
            img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = mtcnn.detect_faces(img_rgb)
            if results:
                for r in results:
                    bbox = r.get("box", [])
                    if len(bbox) == 4:
                        faces.append({
                            "bbox": (int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])),
                            "landmarks": r.get("keypoints", {}),
                            "confidence": r.get("confidence", 0.0),
                        })
                if faces:
                    return faces
        except Exception:
            pass

    # 策略 3：dlib HOG
    landmark_info = _load_landmark_predictor()
    if landmark_info is not None and not faces:
        try:
            lib_type, detector, predictor = landmark_info
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            dets = detector(gray, 1)
            for det in dets:
                face_info = {
                    "bbox": (det.left(), det.top(), det.right() - det.left(), det.bottom() - det.top()),
                    "landmarks": [],
                    "confidence": 1.0,
                }

                # 如果有 68 点预测器，提取关键点
                if predictor is not None:
                    shape = predictor(gray, det)
                    lmk_68 = [(shape.part(i).x, shape.part(i).y) for i in range(68)]
                    face_info["landmarks"] = lmk_68

                faces.append(face_info)

            if faces:
                return faces
        except Exception:
            pass

    # 策略 4：Haar Cascade（回退）
    if not faces:
        faces = _detect_haar(image)

    return faces


def extract_facial_features(image, face_rects):
    """
    根据人脸边界框提取五官掩码。

    如果有关键点，使用关键点构建精确五官掩码；
    否则使用启发式方法估算。

    Args:
        image: numpy.ndarray，BGR 格式图像 (H, W, 3)
        face_rects: list[dict]，detect_faces() 的返回值

    Returns:
        numpy.ndarray: 五官掩码，0=非五官区域, 255=五官区域，uint8
    """
    h, w = image.shape[:2]
    feature_mask = np.zeros((h, w), dtype=np.uint8)

    for face in face_rects:
        bx, by, bw, bh = face["bbox"]
        landmarks = face.get("landmarks", [])

        # 确保边界框在图像范围内
        bx = max(0, bx)
        by = max(0, by)
        bw = min(bw, w - bx)
        bh = min(bh, h - by)

        if bw <= 0 or bh <= 0:
            continue

        if landmarks and len(landmarks) >= 68:
            # ---- 使用 68 点关键点构建五官掩码 ----
            # 注意：landmarks 中的点坐标是图像绝对坐标

            for group_name, indices in FACIAL_FEATURE_GROUPS.items():
                # 获取当前组的关键点
                points = []
                for idx in indices:
                    if idx < len(landmarks):
                        pt = landmarks[idx]
                        if isinstance(pt, (tuple, list)) and len(pt) == 2:
                            points.append((int(pt[0]), int(pt[1])))
                        elif hasattr(pt, "x") and hasattr(pt, "y"):
                            points.append((int(pt.x), int(pt.y)))

                if len(points) < 3:
                    continue

                pts_array = np.array(points, dtype=np.int32)

                if "eye" in group_name or "mouth" in group_name:
                    # 眼睛/嘴巴用凸包填充
                    hull = cv2.convexHull(pts_array)
                    cv2.fillConvexPoly(feature_mask, hull, 255)
                elif "eyebrow" in group_name:
                    # 眉毛用粗线绘制
                    cv2.polylines(feature_mask, [pts_array], False, 255, thickness=6)
                elif "nose" in group_name:
                    # 鼻子：桥 + 尖端
                    cv2.polylines(feature_mask, [pts_array], False, 255, thickness=4)
        else:
            # ---- 回退：启发式五官定位 ----
            heu = _heuristic_landmarks(image, face["bbox"])

            bx_int, by_int = int(bx), int(by)
            bh_int, bw_int = int(bh), int(bw)

            for key in ["eye_mask", "mouth_mask", "nose_mask"]:
                m = heu[key]
                # 缩放到人脸框实际尺寸
                m_resized = cv2.resize(m, (bw_int, bh_int))
                m_binary = (m_resized > 30).astype(np.uint8) * 255

                # 写入全局掩码（OR 操作，支持多人脸）
                roi = feature_mask[by_int:by_int + bh_int, bx_int:bx_int + bw_int]
                feature_mask[by_int:by_int + bh_int, bx_int:bx_int + bw_int] = np.maximum(roi, m_binary)

    # 形态学优化
    feature_mask = cv2.morphologyEx(feature_mask, cv2.MORPH_CLOSE, _KERNEL_CLOSE_3)

    return feature_mask


def extract_skin_mask(image, face_rects):
    """
    提取皮肤掩码：人脸区域内扣除五官掩码 + HSV 肤色二次校验。

    处理流程：
    1. 为每个人脸生成椭圆近似掩码
    2. 从人脸掩码中扣除五官区域
    3. 用 HSV 肤色范围进行二次校验
    4. 形态学优化

    Args:
        image: numpy.ndarray，BGR 格式图像 (H, W, 3)
        face_rects: list[dict]，detect_faces() 的返回值

    Returns:
        numpy.ndarray: 皮肤掩码，0=非皮肤, 255=皮肤，uint8
    """
    h, w = image.shape[:2]

    if not face_rects:
        # 无人脸时，用全图 HSV 肤色检测
        return _hsv_skin_filter(image)

    # 第 1 步：生成人脸椭圆掩码
    face_mask = np.zeros((h, w), dtype=np.uint8)
    for face in face_rects:
        bx, by, bw_box, bh_box = face["bbox"]
        bx = max(0, int(bx))
        by = max(0, int(by))
        bw_box = min(int(bw_box), w - bx)
        bh_box = min(int(bh_box), h - by)

        if bw_box <= 0 or bh_box <= 0:
            continue

        # 用人脸框内切椭圆近似人脸掩码
        center = (bx + bw_box // 2, by + bh_box // 2)
        axes = (bw_box // 2, int(bh_box * 0.45))  # 椭圆略扁，因为人脸上部比下部宽
        cv2.ellipse(face_mask, center, axes, 0, 0, 360, 255, -1)

    # 第 2 步：获取五官掩码并扣除
    feature_mask = extract_facial_features(image, face_rects)

    # 从人脸掩码中减去五官
    skin_raw = cv2.subtract(face_mask, feature_mask)

    # 第 3 步：HSV 肤色二次校验
    hsv_skin = _hsv_skin_filter(image)

    # 取交集：在人脸区域且满足 HSV 肤色条件
    skin_mask = cv2.bitwise_and(skin_raw, hsv_skin)

    # 第 4 步：形态学优化 — 闭运算填充孔洞
    skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, _KERNEL_CLOSE_5)
    # 轻微腐蚀消除过渡带
    skin_mask = cv2.erode(skin_mask, _KERNEL_ERODE_3, iterations=1)

    return skin_mask


def validate_region_exclusivity(*masks):
    """
    区域互斥校验与合并。

    确保传入的所有掩码两两互斥，如有重叠则按优先级处理：
    - 最后出现的掩码优先级最高（后面的覆盖前面的）
    - 优先级：feature > skin > background > other

    Args:
        *masks: 可变数量的掩码数组，每个都是 (H, W) uint8 格式
                按优先级升序排列（越靠后优先级越高）

    Returns:
        numpy.ndarray: 合并后的标签图，不同区域用不同值标记
            0  = 未分配
            1~N = 对应输入的掩码索引 + 1
    """
    if not masks:
        raise ValueError("至少需要一个掩码")

    # 验证所有掩码尺寸一致
    h, w = masks[0].shape[:2]
    for i, m in enumerate(masks):
        if m.shape[:2] != (h, w):
            raise ValueError(f"掩码 {i} 尺寸 {m.shape[:2]} 与第一个掩码 ({h}, {w}) 不一致")

    # 创建标签图
    label_map = np.zeros((h, w), dtype=np.uint8)

    for idx, mask in enumerate(masks):
        # 二值化当前掩码
        binary = (mask >= 128).astype(np.uint8)
        # 高优先级覆盖低优先级
        label_map[binary > 0] = idx + 1

    # 验证互斥性：统计每个像素被多少个掩码覆盖
    overlap_count = np.zeros((h, w), dtype=np.uint8)
    for mask in masks:
        overlap_count += (mask >= 128).astype(np.uint8)

    # 检查是否有像素同时属于多个掩码（同时 > 128）
    conflict_mask = overlap_count > 1
    if np.any(conflict_mask):
        conflict_count = np.sum(conflict_mask)
        total_pixels = h * w
        conflict_ratio = conflict_count / total_pixels
        if conflict_ratio > 0.05:  # 超过 5% 冲突记录警告
            print(f"[区域互斥校验] 警告：{conflict_count} 个像素存在重叠 ({conflict_ratio:.2%})，已按优先级解决")
        else:
            print(f"[区域互斥校验] {conflict_count} 个像素存在重叠 ({conflict_ratio:.4%})，已按优先级解决")

    return label_map


def extract_face_regions(image):
    """
    完整的人脸区域拆分流水线。
    一站式处理：人脸检测 → 皮肤掩码 → 五官掩码 → 区域互斥。

    Args:
        image: numpy.ndarray，BGR 格式图像 (H, W, 3)

    Returns:
        dict:
            - faces: list[dict] 人脸检测结果
            - skin_mask: np.ndarray 皮肤掩码
            - feature_mask: np.ndarray 五官掩码
            - exclusive_labels: np.ndarray 互斥标签图（0=背景, 1=皮肤, 2=五官）
    """
    faces = detect_faces(image)
    skin_mask = extract_skin_mask(image, faces)
    feature_mask = extract_facial_features(image, faces)

    # 生成背景掩码：非皮肤且非五官
    h, w = image.shape[:2]
    background_mask = np.full((h, w), 255, dtype=np.uint8)
    background_mask = cv2.subtract(background_mask, skin_mask)
    background_mask = cv2.subtract(background_mask, feature_mask)

    exclusive_labels = validate_region_exclusivity(
        background_mask,   # 优先级最低: 标签 1
        skin_mask,         # 中等优先级: 标签 2
        feature_mask,      # 最高优先级: 标签 3
    )

    return {
        "faces": faces,
        "skin_mask": skin_mask,
        "feature_mask": feature_mask,
        "exclusive_labels": exclusive_labels,
    }
