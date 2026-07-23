"""
分区独立优化模块（文档规范 五）
- 背景区：统一纯色 + 边缘硬化
- 皮肤区：保边平滑 + 分层量化
- 五官/文字区：边缘增强 + 细节保护
"""
import cv2
import numpy as np
from services.morphology import harden_edges, skin_constrained_smooth


def optimize_background(
    image: np.ndarray,
    background_mask: np.ndarray,
    bg_mode: str = 'auto',
    bg_color_hex: str = '#FFFFFF',
    edge_hardness: int = 70,
) -> np.ndarray:
    """
    背景统一处理（文档规范 5.1）
    - auto: 提取背景主色（占比最高色）→ 统一填充
    - custom: 使用用户指定颜色
    - transparent: 透明背景（返回带 alpha 通道的 RGBA 图像，背景区 alpha=0）
    - keep: 保留原背景不做处理

    edge_hardness: 边缘硬度 0-100（文档规范 8.3），
      数值越高边缘越锐利，越低越柔和。
      控制边缘硬化时的腐蚀/收缩强度。
    """
    if bg_mode == 'keep':
        return image

    result = image.copy()

    # --- 透明背景模式（文档 5.1：支持透明背景选项，导出 PNG 时背景透明） ---
    # 透明模式在量化阶段使用白色填充背景（不干扰 K-Means），
    # 最终生成网格时再将背景像素标记为 None（前端识别为透明）。
    if bg_mode == 'transparent':
        bg_color = np.array([255, 255, 255], dtype=np.uint8)
        result[background_mask > 128] = bg_color

        # 边缘硬化
        erosion_iterations = max(0, min(3, edge_hardness // 30))
        if erosion_iterations > 0:
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            eroded_bg = cv2.erode(
                (background_mask > 128).astype(np.uint8),
                kernel, iterations=erosion_iterations
            )
            result[eroded_bg > 0] = bg_color
        else:
            result = harden_edges(result, background_mask)

        return result

    if bg_mode == 'auto':
        # 提取背景区域主色（占比最高）
        bg_pixels = image[background_mask > 128]
        if len(bg_pixels) > 0:
            # 使用实际均值作为背景色（而非粗量化bin中心，避免白色→灰色偏移）
            bg_color = bg_pixels.astype(np.float64).mean(axis=0).astype(np.uint8)
        else:
            bg_color = np.array([255, 255, 255])
    elif bg_mode == 'custom':
        hex_str = bg_color_hex.lstrip('#')
        bg_color = np.array([
            int(hex_str[0:2], 16),
            int(hex_str[2:4], 16),
            int(hex_str[4:6], 16)
        ], dtype=np.uint8)
    else:
        return result

    # 填充背景为统一纯色（2D索引自动广播到3通道）
    result[background_mask > 128] = bg_color

    # 边缘硬化：消除主体与背景之间的半透明灰边
    # 硬度映射：0→无收缩(柔和), 100→3px收缩(锐利)
    erosion_iterations = max(0, min(3, edge_hardness // 30))
    if erosion_iterations > 0:
        # 对背景掩码做腐蚀（扩大背景区域 = 收缩主体边缘）
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        eroded_bg = cv2.erode(
            (background_mask > 128).astype(np.uint8),
            kernel, iterations=erosion_iterations
        )
        # 扩展后的背景区域也填充纯色
        result[eroded_bg > 0] = bg_color
    else:
        result = harden_edges(result, background_mask)

    return result


def optimize_skin(
    image: np.ndarray,
    skin_mask: np.ndarray,
    smooth_level: str = 'medium'
) -> np.ndarray:
    """
    肤色平滑统一（文档规范 5.2）
    - light: 滤波半径3, eps=0.015（保留轻微皮肤层次）
    - medium: 滤波半径5, eps=0.025（默认，大部分纹理消失，肤色均匀）
    - heavy: 滤波半径8, eps=0.04（完全磨平，极致干净，Q版风格）
    仅在皮肤掩码内执行引导滤波（保边平滑），严格保护五官边缘
    """
    radius_map = {'light': 3, 'medium': 5, 'heavy': 8}
    eps_map = {'light': 0.015, 'medium': 0.025, 'heavy': 0.04}

    radius = radius_map.get(smooth_level, 5)
    eps = eps_map.get(smooth_level, 0.025)
    # 在皮肤掩码内做引导滤波保边平滑
    result = skin_constrained_smooth(image, skin_mask, radius=radius, eps=eps)
    return result


def white_balance(image: np.ndarray, skin_mask: np.ndarray = None) -> np.ndarray:
    """
    自动白平衡矫正（文档5.2第三步）
    使用 Gray World 算法：假设场景平均反射率为灰色
    仅在皮肤掩码内采样（更精准）
    """
    result = image.copy()
    if skin_mask is not None and skin_mask.sum() > 100:
        sample = image[skin_mask > 128]
    else:
        sample = image.reshape(-1, 3)

    # 计算各通道均值
    avg = sample.mean(axis=0)
    # Gray World: 各通道增益使均值相等
    gray = avg.mean()
    gains = np.where(avg > 0, gray / (avg + 1e-6), 1.0)
    # 限制增益范围（避免过度校正）
    gains = np.clip(gains, 0.8, 1.25)

    for ch in range(3):
        result[..., ch] = np.clip(result[..., ch].astype(np.float64) * gains[ch], 0, 255).astype(np.uint8)

    return result


def adjust_skin_tone(
    image: np.ndarray,
    skin_mask: np.ndarray,
    warmth: float = 0.0,    # -1.0(冷) ~ +1.0(暖)
    brightness: float = 0.0  # -1.0(暗) ~ +1.0(亮)
) -> np.ndarray:
    """
    肤色冷暖/深浅微调（文档5.2 用户手动调节）
    在 HSV 空间操作，仅对皮肤区域生效
    """
    if abs(warmth) < 0.01 and abs(brightness) < 0.01:
        return image

    result = image.copy()
    hsv = cv2.cvtColor(result, cv2.COLOR_RGB2HSV).astype(np.float64)

    # 冷暖：偏移色相（H通道），正=暖(偏橙)，负=冷(偏粉)
    if abs(warmth) > 0.01:
        hsv[..., 0] = (hsv[..., 0] + warmth * 8) % 180  # ±8°色相偏移

    # 深浅：调整明度（V通道）
    if abs(brightness) > 0.01:
        hsv[..., 2] = np.clip(hsv[..., 2] * (1.0 + brightness * 0.2), 0, 255)

    adjusted = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

    # 仅对皮肤区域生效
    mask = skin_mask > 128
    result[mask] = adjusted[mask]
    return result


def optimize_features(
    image: np.ndarray,
    feature_mask: np.ndarray
) -> np.ndarray:
    """
    五官/文字区细节增强
    - 边缘锐化（unsharp mask）
    - 对比度拉升（CLAHE）
    仅在特征掩码内执行
    """
    result = image.copy()

    if feature_mask.sum() < 10:
        return result  # 无特征区域，跳过

    # CLAHE 对比度增强（在掩码内）
    lab = cv2.cvtColor(result, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    l_enhanced = clahe.apply(l)
    lab_enhanced = cv2.merge([l_enhanced, a, b])
    enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)

    # 只在特征掩码内应用增强
    mask_3ch = np.stack([feature_mask > 128] * 3, axis=-1)
    result[mask_3ch] = enhanced[mask_3ch]

    # 边缘锐化（unsharp mask）
    blurred = cv2.GaussianBlur(result, (0, 0), 1.0)
    sharpened = cv2.addWeighted(result, 1.5, blurred, -0.5, 0)

    # 只锐化特征区域
    result[mask_3ch] = sharpened[mask_3ch]

    return result


def optimize_other(
    image: np.ndarray,
    region_mask: np.ndarray,
    target_region: int
) -> np.ndarray:
    """
    其他主体区（衣物、头发）保边降噪
    使用双边滤波去除细碎纹理
    """
    result = image.copy()
    mask = (region_mask == target_region)
    mask_3ch = np.stack([mask] * 3, axis=-1)

    # 双边滤波保边降噪
    smoothed = cv2.bilateralFilter(result, d=5, sigmaColor=40, sigmaSpace=20)
    result[mask_3ch] = smoothed[mask_3ch]

    return result
