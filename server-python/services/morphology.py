"""
形态学操作模块

提供基于 OpenCV 的形态学操作工具函数，用于掩码的后处理优化。
包括膨胀、腐蚀、开运算、闭运算，以及针对拼豆识别的专用操作。
"""

import cv2
import numpy as np


def dilate(mask: np.ndarray, kernel_size: int = 3, iterations: int = 1) -> np.ndarray:
    """
    膨胀操作：扩大前景区域（白色区域）。

    Args:
        mask: 输入二值掩码，numpy 数组（0/1 或 0/255）
        kernel_size: 结构元素尺寸，默认 3
        iterations: 膨胀迭代次数，默认 1

    Returns:
        膨胀后的掩码，与输入同类型
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.dilate(mask, kernel, iterations=iterations)


def erode(mask: np.ndarray, kernel_size: int = 3, iterations: int = 1) -> np.ndarray:
    """
    腐蚀操作：缩小前景区域（白色区域）。

    Args:
        mask: 输入二值掩码，numpy 数组（0/1 或 0/255）
        kernel_size: 结构元素尺寸，默认 3
        iterations: 腐蚀迭代次数，默认 1

    Returns:
        腐蚀后的掩码，与输入同类型
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.erode(mask, kernel, iterations=iterations)


def closing(mask: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """
    闭运算：先膨胀后腐蚀。

    用于填充前景区域内部的小孔洞、连接相邻区域。

    Args:
        mask: 输入二值掩码
        kernel_size: 结构元素尺寸，默认 3

    Returns:
        闭运算后的掩码
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)


def opening(mask: np.ndarray, kernel_size: int = 2) -> np.ndarray:
    """
    开运算：先腐蚀后膨胀。

    用于去除前景区域中的孤立噪点、断开细连接。

    Args:
        mask: 输入二值掩码
        kernel_size: 结构元素尺寸，默认 2

    Returns:
        开运算后的掩码
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)


def optimize_background_mask(bg_mask: np.ndarray) -> np.ndarray:
    """
    优化背景掩码（文档规范：3x3 闭运算 + 1x1 腐蚀）。

    闭运算填充背景区域中的小孔洞，腐蚀操作消除边缘毛刺。

    Args:
        bg_mask: 输入背景掩码，numpy 数组

    Returns:
        优化后的背景掩码
    """
    # 3x3 闭运算
    result = closing(bg_mask, kernel_size=3)
    # 1x1 腐蚀（实际上 kernel_size=1 的腐蚀是恒等变换，使用 1 次 3x3 腐蚀代替）
    # 文档规范写的是 1x1 腐蚀，逻辑上等同于轻量收边
    result = erode(result, kernel_size=3, iterations=1)
    return result


def shrink_subject_edge(subject_mask: np.ndarray) -> np.ndarray:
    """
    收缩主体边缘：对主体掩码做 1 像素腐蚀，消除白边。

    用于消除主体与背景交接处的过渡白边，使主体边缘更干净。

    Args:
        subject_mask: 输入主体掩码，numpy 数组

    Returns:
        收缩后的主体掩码
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    return cv2.erode(subject_mask, kernel, iterations=1)


def harden_edges(
    pixels: np.ndarray,
    region_mask: np.ndarray,
) -> np.ndarray:
    """
    硬化主体边缘：将主体边缘像素替换为紧邻的内部像素颜色。

    识别主体掩码的边缘像素（掩码边界处），将这些像素的颜色替换为其
    最近内部（非边缘）像素的颜色，消除边缘过渡色。

    Args:
        pixels: 原始像素图像，BGR 格式 uint8 numpy 数组
        region_mask: 主体区域掩码，布尔型或 0/255 numpy 数组

    Returns:
        边缘硬化后的图像
    """
    h, w = pixels.shape[:2]

    # 统一掩码为 uint8
    mask_u8 = (region_mask > 0).astype(np.uint8)

    # 腐蚀得到内部区域（减去一层边缘像素）
    kernel = np.ones((3, 3), np.uint8)
    interior = cv2.erode(mask_u8, kernel, iterations=1)

    # 边缘像素：在掩码中但不在内部
    edge_mask = (mask_u8 > 0) & (interior == 0)

    if not np.any(edge_mask):
        return pixels.copy()

    result = pixels.copy()
    edge_y, edge_x = np.where(edge_mask)

    # 对每个边缘像素，在 4 邻域中寻找最近的内部像素并取其颜色
    for y, x in zip(edge_y, edge_x):
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and interior[ny, nx] > 0:
                result[y, x] = pixels[ny, nx]
                break

    return result


def skin_constrained_smooth(
    pixels: np.ndarray,
    skin_mask: np.ndarray,
    radius: int = 5,
    eps: float = 0.025,
) -> np.ndarray:
    """
    皮肤约束平滑：仅在皮肤掩码区域内做保边平滑（引导滤波）。

    文档规范（第五章 5.2）：
      轻度：r=3, eps=0.015 — 保留轻微皮肤层次
      中度（默认）：r=5, eps=0.025 — 大部分纹理消失，肤色均匀
      重度：r=8, eps=0.04 — 完全磨平，极致干净

    以皮肤掩码为约束，仅在皮肤区域内做平滑处理，
    严格保护五官边缘（非皮肤区域保持原始像素不变）。

    Args:
        pixels: 原始像素图像，RGB 格式 uint8 numpy 数组
        skin_mask: 皮肤区域掩码，布尔型或 0/255 numpy 数组
        radius: 引导滤波半径，默认 5
        eps: 引导滤波正则化系数，默认 0.025

    Returns:
        皮肤区域平滑后的图像
    """
    if not np.any(skin_mask):
        return pixels.copy()

    # 导入引导滤波（避免循环依赖）
    from services.preprocessing import guided_filter

    # 全图引导滤波（保边平滑，不会糊化五官边缘）
    smoothed = guided_filter(pixels, r=radius, eps=eps)

    # 仅将平滑结果应用于皮肤掩码区域
    # 非皮肤区域（包括五官、头发、背景等）保持原始像素不变
    result = pixels.copy()
    skin_bool = skin_mask.astype(bool)
    result[skin_bool] = smoothed[skin_bool]

    return result
