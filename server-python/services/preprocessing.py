"""
图像预处理模块

提供图像预处理流水线，包括尺寸归一化、保边降噪（引导滤波）等功能。
严格遵循文档规范：使用引导滤波做保边降噪，绝对禁用高斯模糊和均值模糊。
"""

import cv2
import numpy as np
from config import LONG_EDGE_TARGET, GUIDED_FILTER_R, GUIDED_FILTER_EPS


def normalize_size(image: np.ndarray, long_edge: int = LONG_EDGE_TARGET) -> np.ndarray:
    """
    尺寸归一化：将图像长边统一缩放到指定大小。

    文档规范：
    - 长边统一缩放到 long_edge（默认 1024px）
    - 超小图（长边 < 500px）先做超分重建（cv2.resize + INTER_CUBIC 做简单 2x 放大）
    - 超大图（长边 > 2000px）先压缩到长边 2000px 再缩放

    Args:
        image: 输入图像，BGR 格式的 numpy 数组
        long_edge: 目标长边像素数，默认来自 config.LONG_EDGE_TARGET

    Returns:
        归一化后的图像
    """
    if image is None or image.size == 0:
        raise ValueError("输入图像不能为空")

    h, w = image.shape[:2]
    current_long = max(h, w)

    # 超大图先压缩到 2000px，避免内存问题
    if current_long > 2000:
        scale = 2000.0 / current_long
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        h, w = image.shape[:2]
        current_long = max(h, w)

    # 超小图先做简单超分重建（2x 放大）
    if current_long < 500:
        image = cv2.resize(image, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
        h, w = image.shape[:2]
        current_long = max(h, w)

    # 长边缩放到目标大小
    if current_long != long_edge:
        scale = long_edge / current_long
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        # 缩小用 INTER_AREA，放大用 INTER_CUBIC
        interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
        image = cv2.resize(image, (new_w, new_h), interpolation=interp)

    return image


def _box_filter(image: np.ndarray, r: int) -> np.ndarray:
    """
    盒式滤波（均值滤波）的简便封装。

    用于引导滤波内部计算，使用 cv2.blur 实现。

    Args:
        image: 输入图像（单通道或多通道 float32）
        r: 滤波半径

    Returns:
        盒式滤波后的图像
    """
    ksize = r * 2 + 1
    return cv2.blur(image, (ksize, ksize))


def guided_filter(
    image: np.ndarray,
    r: int = GUIDED_FILTER_R,
    eps: float = GUIDED_FILTER_EPS,
) -> np.ndarray:
    """
    自实现引导滤波（Guided Filter），用于保边降噪。

    公式推导（使用引导图 = 输入图 I 的自引导模式）：
      1. mean_I  = boxFilter(I, r)
      2. corr_I  = boxFilter(I * I, r)
      3. var_I   = corr_I - mean_I * mean_I
      4. a       = var_I / (var_I + eps)
      5. b       = mean_I - a * mean_I
      6. mean_a  = boxFilter(a, r)
      7. mean_b  = boxFilter(b, r)
      8. q       = mean_a * I + mean_b

    如果 cv2.ximgproc.guidedFilter 可用则优先使用，否则使用上述自实现。

    绝对禁用：高斯模糊、均值模糊 —— 这些会破坏图像边缘信息。

    Args:
        image: 输入图像，BGR 格式 uint8 numpy 数组
        r: 滤波半径，默认来自 config.GUIDED_FILTER_R
        eps: 正则化参数，默认来自 config.GUIDED_FILTER_EPS

    Returns:
        滤波后的图像，uint8 格式
    """
    if image is None or image.size == 0:
        raise ValueError("输入图像不能为空")

    # 优先使用 OpenCV 的 guidedFilter（cv2.ximgproc 扩展模块）
    try:
        guided = cv2.ximgproc.guidedFilter(
            guide=image,
            src=image,
            radius=r,
            eps=eps,
            dDepth=-1,
        )
        return guided
    except (AttributeError, cv2.error):
        pass

    # 自实现引导滤波（float32 域计算以保证精度）
    I = image.astype(np.float32) / 255.0

    if len(I.shape) == 3:
        # 逐通道处理
        channels = cv2.split(I)
        result_channels = []
        for ch in channels:
            mean_I = _box_filter(ch, r)
            corr_I = _box_filter(ch * ch, r)
            var_I = corr_I - mean_I * mean_I
            a = var_I / (var_I + eps)
            b = mean_I - a * mean_I
            mean_a = _box_filter(a, r)
            mean_b = _box_filter(b, r)
            q = mean_a * ch + mean_b
            result_channels.append(q)
        result = cv2.merge(result_channels)
    else:
        mean_I = _box_filter(I, r)
        corr_I = _box_filter(I * I, r)
        var_I = corr_I - mean_I * mean_I
        a = var_I / (var_I + eps)
        b = mean_I - a * mean_I
        mean_a = _box_filter(a, r)
        mean_b = _box_filter(b, r)
        result = mean_a * I + mean_b

    # 转回 uint8
    result = np.clip(result * 255.0, 0, 255).astype(np.uint8)
    return result


def bilateral_smooth(
    image: np.ndarray,
    d: int = 5,
    sigma_color: float = 40.0,
    sigma_space: float = 20.0,
) -> np.ndarray:
    """
    双边滤波 —— 引导滤波不可用时的降级方案。

    双边滤波同时考虑空间距离和颜色差异，具有一定的保边能力。
    仅在引导滤波（cv2.ximgproc.guidedFilter 或自实现）均不可用时使用。

    绝对禁用：高斯模糊、均值模糊。

    Args:
        image: 输入图像，uint8 numpy 数组
        d: 滤波直径，默认 5
        sigma_color: 颜色空间标准差，默认 40
        sigma_space: 坐标空间标准差，默认 20

    Returns:
        滤波后的图像
    """
    if image is None or image.size == 0:
        raise ValueError("输入图像不能为空")
    return cv2.bilateralFilter(image, d, sigma_color, sigma_space)


def _unsharp_mask(image: np.ndarray, amount: float = 0.5, threshold: int = 2) -> np.ndarray:
    """
    Unsharp Mask 锐化 — 补偿引导滤波的柔和效应。

    公式: output = input + amount * (input - blurred)
    仅对差异 > threshold 的像素生效，防止平坦区域引入噪点。

    Args:
        image: 输入图像，uint8 numpy 数组
        amount: 锐化强度 (0-1)，默认 0.5
        threshold: 差异阈值（≤此值不锐化），默认 2

    Returns:
        锐化后的图像
    """
    # 3×3 盒式模糊
    blurred = cv2.blur(image, (3, 3))

    # 计算差异
    diff = image.astype(np.float64) - blurred.astype(np.float64)
    abs_diff = np.abs(diff).sum(axis=2)  # 每个像素 RGB 差异绝对值之和

    # 仅在差异大于阈值的区域锐化
    mask = abs_diff > threshold
    result = image.astype(np.float64).copy()
    for c in range(3):
        result[..., c][mask] += amount * diff[..., c][mask]

    return np.clip(result, 0, 255).astype(np.uint8)


def preprocess(
    image: np.ndarray,
    prefilter: bool = True,
    crisp: bool = False,
) -> np.ndarray:
    """
    图像预处理主入口。

    处理流水线：
      1. 尺寸归一化（长边统一到 LONG_EDGE_TARGET）
      2. 引导滤波保边降噪（prefilter=True，默认启用）
      3. USM 锐化补偿引导滤波的柔和效应（prefilter=True 时默认启用）
      4. 可选：强锐化增强细节（crisp=True）

    Args:
        image: 输入图像，BGR 格式 uint8 numpy 数组
        prefilter: 是否进行保边降噪，默认 True
        crisp: 是否强锐化增强，默认 False

    Returns:
        预处理后的图像
    """
    if image is None or image.size == 0:
        raise ValueError("输入图像不能为空")

    # 1. 尺寸归一化
    image = normalize_size(image)

    # 2. 保边降噪（引导滤波）
    if prefilter:
        try:
            image = guided_filter(image, r=GUIDED_FILTER_R, eps=GUIDED_FILTER_EPS)
        except Exception:
            # 降级方案：双边滤波
            image = bilateral_smooth(image)

        # 3. USM 锐化补偿引导滤波的柔和效应（文档规范：不糊化边缘但补偿柔和度）
        image = _unsharp_mask(image, amount=0.5, threshold=1)

    # 4. 可选强锐化（crisp 模式）
    if crisp:
        # 使用拉普拉斯算子增强边缘
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        laplacian = np.clip(laplacian, -255, 255)
        laplacian_3ch = cv2.merge([laplacian, laplacian, laplacian])
        # 原图减去拉普拉斯响应以增强边缘对比度
        sharpened = image.astype(np.float64) - laplacian_3ch * 0.3
        image = np.clip(sharpened, 0, 255).astype(np.uint8)

    return image
