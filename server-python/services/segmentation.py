"""
语义分割模块
============
对输入图像进行前后景分离，生成主体掩码和背景掩码。

云端方案：PP-HumanSeg v2 人像分割（基于 PaddleSeg）
端侧方案：MODNet 轻量抠图（基于 ONNX Runtime）
回退方案：OpenCV GrabCut + HSV 背景检测 + Canny 边缘辅助

输出：
- 前景概率图（0~255 灰度图）→ 二值化阈值 128 → 主体掩码
- 背景掩码 = 255 - 主体掩码
- 形态学优化：3×3 闭运算填充孔洞 + 1×1 腐蚀消除过渡带
- 最终输出标准二值掩码：background_mask（0=主体, 255=背景）
"""

import cv2
import numpy as np
from config import HUMANSEG_MODEL_PATH

# 形态学操作的结构元素（复用，避免重复创建）
_KERNEL_CLOSE = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
_KERNEL_ERODE = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))


def _load_humanseg_model():
    """
    尝试加载 PP-HumanSeg v2 模型（PaddleSeg ONNX 导出格式）。
    需要 onnxruntime 和模型文件存在于 HUMANSEG_MODEL_PATH。
    返回 (session, input_name, input_shape) 或 None。
    """
    try:
        import onnxruntime as ort

        model_path = HUMANSEG_MODEL_PATH
        if model_path.is_dir():
            # 目录下查找 .onnx 文件
            onnx_files = list(model_path.glob("*.onnx"))
            if not onnx_files:
                return None
            model_path = onnx_files[0]
        elif not model_path.exists():
            return None

        session = ort.InferenceSession(str(model_path))
        input_info = session.get_inputs()[0]
        input_name = input_info.name
        input_shape = input_info.shape  # 如 [1, 3, H, W]
        return session, input_name, input_shape
    except Exception:
        return None


def _load_modnet_model():
    """
    尝试加载 MODNet 轻量抠图模型（ONNX 格式）。
    从 MODELS_DIR 下的 modnet 目录查找。
    返回 (session, input_name, input_shape) 或 None。
    """
    try:
        import onnxruntime as ort
        from config import MODELS_DIR

        modnet_dir = MODELS_DIR / "modnet"
        if not modnet_dir.exists():
            return None

        onnx_files = list(modnet_dir.glob("*.onnx"))
        if not onnx_files:
            return None

        session = ort.InferenceSession(str(onnx_files[0]))
        input_info = session.get_inputs()[0]
        return session, input_info.name, input_info.shape
    except Exception:
        return None


def _model_infer_segment(image_bgr, model_info):
    """
    使用 PP-HumanSeg 或 MODNet ONNX 模型进行推理。
    image_bgr: BGR 格式图像 (H, W, 3)
    model_info: (_load_*_model 返回值)
    返回前景概率图 (H, W) float32，值范围 0~1。
    """
    session, input_name, input_shape = model_info

    # 确定模型输入尺寸
    if input_shape is not None and len(input_shape) >= 4:
        target_h = input_shape[2] if isinstance(input_shape[2], int) else 512
        target_w = input_shape[3] if isinstance(input_shape[3], int) else 512
    else:
        target_h, target_w = 512, 512

    # 预处理：缩放 + 归一化
    h, w = image_bgr.shape[:2]
    img_resized = cv2.resize(image_bgr, (target_w, target_h))
    img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
    img_float = img_rgb.astype(np.float32) / 255.0
    img_norm = (img_float - np.array([0.5, 0.5, 0.5])) / np.array([0.5, 0.5, 0.5])
    img_chw = np.transpose(img_norm, (2, 0, 1))  # C, H, W
    img_batch = np.expand_dims(img_chw, axis=0)  # 1, C, H, W

    # 推理
    outputs = session.run(None, {input_name: img_batch})
    prob_map = outputs[0]  # 形状 [1, 1, H, W] 或 [1, H, W]

    # 去掉 batch 和 channel 维度
    prob_map = np.squeeze(prob_map)

    # 缩回原始尺寸
    prob_map = cv2.resize(prob_map, (w, h), interpolation=cv2.INTER_LINEAR)

    # 确保值在 0~1
    prob_map = np.clip(prob_map, 0.0, 1.0)
    return prob_map.astype(np.float32)


def _morphology_optimize(binary_mask):
    """
    形态学优化：3×3 闭运算填充孔洞 + 1×1 腐蚀消除过渡带
    binary_mask: 0/255 uint8 二值掩码
    返回优化后的二值掩码
    """
    # 3×3 闭运算：先膨胀再腐蚀，填充小孔洞
    closed = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, _KERNEL_CLOSE)
    # 1×1 腐蚀：消除边缘过渡带（1×1 即不做实际腐蚀，但消除 1px 噪声）
    # 此处用较小的核（1×1 等同于不做操作），用 2×2 替代实现 1px 级腐蚀
    kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    eroded = cv2.erode(closed, kernel_erode, iterations=1)
    return eroded


def _grabcut_segment(image_bgr):
    """
    回退方案：使用 OpenCV GrabCut 算法进行前后景分离。
    image_bgr: BGR 格式图像
    返回前景概率图 (H, W) float32
    """
    h, w = image_bgr.shape[:2]

    # 初始化矩形区域：图像中心 60% 的区域标记为可能前景
    rect = (int(w * 0.2), int(h * 0.1), int(w * 0.6), int(h * 0.8))

    # GrabCut 初始化
    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(image_bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
    except Exception:
        # GrabCut 失败时返回全前景
        return np.ones((h, w), dtype=np.float32)

    # mask: 0=确定背景, 1=确定前景, 2=可能背景, 3=可能前景
    # 将确定前景和可能前景都视为前景
    foreground = np.where((mask == 1) | (mask == 3), 1.0, 0.0).astype(np.float32)

    return foreground


def _hsv_background_detect(image_bgr):
    """
    回退方案的辅助：HSV 颜色空间的背景检测。
    高亮度 + 低饱和度 = 可能背景（白色/浅色背景常见于拼豆图纸）。
    返回背景概率图 (H, W) float32
    """
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # 高亮度（V > 180）且低饱和度（S < 30）视为背景
    bg_score = np.zeros_like(s, dtype=np.float32)
    bg_score[(v > 180) & (s < 30)] = 1.0

    # 对背景分数做高斯模糊，获得平滑过渡
    bg_score = cv2.GaussianBlur(bg_score, (21, 21), 11)

    # 背景概率 = 高亮低饱和分数，前景概率 = 1 - 背景概率
    foreground = 1.0 - bg_score
    return np.clip(foreground, 0.0, 1.0)


def _canny_edge_supplement(image_bgr):
    """
    回退方案的辅助：Canny 边缘检测辅助判断。
    边缘密集区域通常属于主体（有纹理），用于修正背景误判。
    返回边缘密度图 (H, W) float32
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    # 使用 box filter 计算局部边缘密度
    density = cv2.boxFilter(edges.astype(np.float32), -1, (31, 31), normalize=True)
    density = density / 255.0

    return density.astype(np.float32)


def segment_background(image):
    """
    对输入图像进行前后景分离，生成主体掩码和背景掩码。

    处理流程：
    1. 优先尝试 PP-HumanSeg v2 / MODNet 模型推理
    2. 模型不可用时回退到 GrabCut + HSV + Canny 融合方案
    3. 二值化（阈值 128）
    4. 形态学优化（闭运算 + 腐蚀）
    5. 生成 foreground_mask 和 background_mask

    Args:
        image: numpy.ndarray，BGR 格式图像 (H, W, 3)，uint8

    Returns:
        tuple: (foreground_mask, background_mask)
            - foreground_mask: 主体掩码，0=背景, 255=主体，uint8
            - background_mask: 背景掩码，0=主体, 255=背景，uint8
    """
    if image is None or image.size == 0:
        raise ValueError("输入图像为空")

    h, w = image.shape[:2]
    prob_map = None

    # --- 策略 1：尝试 PP-HumanSeg v2 ---
    model_info = _load_humanseg_model()
    if model_info is not None:
        try:
            prob_map = _model_infer_segment(image, model_info)
        except Exception:
            prob_map = None

    # --- 策略 2：尝试 MODNet ---
    if prob_map is None:
        model_info = _load_modnet_model()
        if model_info is not None:
            try:
                prob_map = _model_infer_segment(image, model_info)
            except Exception:
                prob_map = None

    # --- 策略 3：回退方案（GrabCut + HSV + Canny 融合）---
    if prob_map is None:
        # 三个方法分别产生前景概率
        grabcut_prob = _grabcut_segment(image)
        hsv_prob = _hsv_background_detect(image)
        canny_density = _canny_edge_supplement(image)

        # 加权融合：GrabCut 权重较高（区域级），HSV 和 Canny 辅助
        prob_map = (
            grabcut_prob * 0.50
            + hsv_prob * 0.30
            + canny_density * 0.20
        )
        prob_map = np.clip(prob_map, 0.0, 1.0)

    # --- 二值化：阈值 128 ---
    # prob_map 先转为 0~255
    prob_gray = (prob_map * 255).astype(np.uint8)
    _, foreground_binary = cv2.threshold(prob_gray, 128, 255, cv2.THRESH_BINARY)

    # --- 形态学优化 ---
    foreground_binary = _morphology_optimize(foreground_binary)

    # 生成前景掩码和背景掩码
    foreground_mask = foreground_binary
    background_mask = 255 - foreground_mask

    return foreground_mask, background_mask


def segment_foreground_only(image):
    """
    便捷函数：仅返回前景掩码。

    Args:
        image: numpy.ndarray，BGR 格式图像

    Returns:
        numpy.ndarray: 前景掩码，0=背景, 255=主体，uint8
    """
    fg_mask, _ = segment_background(image)
    return fg_mask


def segment_background_only(image):
    """
    便捷函数：仅返回背景掩码。

    Args:
        image: numpy.ndarray，BGR 格式图像

    Returns:
        numpy.ndarray: 背景掩码，0=主体, 255=背景，uint8
    """
    _, bg_mask = segment_background(image)
    return bg_mask


def extract_subject(image, foreground_mask=None):
    """
    根据前景掩码提取主体图像（背景置为白色/透明）。

    Args:
        image: numpy.ndarray，BGR 格式图像
        foreground_mask: 可选，前景掩码。为 None 时自动计算。

    Returns:
        numpy.ndarray: 主体图像，背景区域设为白色 (255,255,255)
    """
    if foreground_mask is None:
        foreground_mask, _ = segment_background(image)

    # 将前景掩码扩展为 3 通道
    mask_3ch = cv2.cvtColor(foreground_mask, cv2.COLOR_GRAY2BGR) / 255.0

    # 白色背景
    white_bg = np.ones_like(image, dtype=np.float32) * 255
    image_float = image.astype(np.float32)

    result = image_float * mask_3ch + white_bg * (1.0 - mask_3ch)
    return result.astype(np.uint8)
