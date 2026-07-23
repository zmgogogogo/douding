"""
分区约束纯色量化 — scikit-learn MiniBatchKMeans + CIEDE2000 硬映射
======================================================================
文档规范（第六章）：
  - 各区域独立 K-Means 聚类（使用 sklearn MiniBatchKMeans）
  - 聚类中心通过 CIEDE2000 色差映射到拼豆色板
  - 全程零误差扩散抖动，纯色硬分配
  - 背景强制 K=1 纯色

三条铁则：
  1. 强制关闭所有抖动（Floyd-Steinberg / 有序抖动等）
  2. 各区域独立 K 值（不一刀切）
  3. 聚类后强制映射真实拼豆色板
"""

import numpy as np
from sklearn.cluster import MiniBatchKMeans
from services.color_match import match_centers_to_beads

# ============================================================
# 区域类型常量
# ============================================================
REGION_TYPES = {
    'BACKGROUND': 0,      # 背景区 K=1 强制纯色
    'OUTLINE': 1,         # 轮廓区 K=3 黑/深灰/中灰层次
    'SKIN': 2,            # 皮肤区 K=3 高光+主色+阴影
    'MAIN_COLOR': 3,      # 主色块区 K=5 大面积纯色
    'DETAIL': 4,          # 细节区 K=5 小型关键色块
    'FACIAL_FEATURE': 5,  # 五官区 K=5 眼睛/眉毛/嘴巴
    'HAIR': 6,            # 头发区 K=3 主发色+高光+暗部
    'TEXT': 7             # 文字区 K=2 文字色+背景色（文档规范 6.2）
}

# ============================================================
# 文档规范默认 K 值
# ============================================================
DEFAULT_K = {
    0: 1,   # 背景区：强制纯色，不允许多色
    1: 3,   # 轮廓区：黑/深灰/中灰
    2: 3,   # 皮肤区：高光+主色+阴影（可切换 2/3/4 层）
    3: 5,   # 主色块区：4~6 色范围
    4: 5,   # 细节区：4~6 色范围
    5: 5,   # 五官区：保留细节色
    6: 3,   # 头发区：主发色+高光+暗部
    7: 2    # 文字区：文字色+背景色（文档规范 6.2，保证清晰）
}

# 纯色区域方差阈值：标准差均值 < 此值视为纯色，跳过 K-Means
_PURE_REGION_STD_THRESHOLD = 8.0


def _is_pure_region(pixels: np.ndarray) -> bool:
    """判断区域是否为纯色（方差极低），纯色区域跳过 K-Means 直接取平均色。"""
    if len(pixels) < 10:
        return True
    std = pixels.astype(np.float64).std(axis=0)
    return float(std.mean()) < _PURE_REGION_STD_THRESHOLD


def _kmeans_cluster(pixels: np.ndarray, k: int) -> np.ndarray:
    """
    对区域像素执行 MiniBatchKMeans 聚类（文档规范：scikit-learn，比自写 Lloyd 快 10×）。

    Args:
        pixels: (N, 3) float64 像素数组
        k: 聚类数

    Returns:
        (k, 3) 聚类中心 RGB 数组
    """
    n = len(pixels)

    if k >= n:
        # 像素数不足 K，返回所有唯一点
        return np.unique(pixels.astype(int), axis=0).astype(np.float64)

    if k == 1:
        # 单聚类 → 直接取平均色
        return pixels.mean(axis=0, keepdims=True)

    kmeans = MiniBatchKMeans(
        n_clusters=k,
        random_state=42,
        batch_size=min(1024, n),
        n_init=3
    )
    kmeans.fit(pixels)
    return kmeans.cluster_centers_


def _assign_to_centers(pixels: np.ndarray, centers: np.ndarray) -> np.ndarray:
    """
    将像素分配给最近聚类中心（向量化距离计算）。

    Args:
        pixels: (N, 3) float64
        centers: (K, 3) float64

    Returns:
        (N,) int — 每个像素的聚类中心索引
    """
    # 广播距离: (N, 1, 3) - (1, K, 3) → (N, K, 3) → sum over last axis → (N, K)
    diff = pixels[:, None, :] - centers[None, :, :]
    dists = np.sum(diff.astype(np.float64) ** 2, axis=-1)
    return np.argmin(dists, axis=1)


def _centers_to_rgb_colors(centers: np.ndarray, center_beads: list) -> np.ndarray:
    """
    将聚类中心对应的珠子颜色转换为 RGB 数组。

    Args:
        centers: (K, 3) 聚类中心
        center_beads: list[dict] 每个中心对应的珠子颜色

    Returns:
        (K, 3) uint8 RGB 数组
    """
    colors = np.zeros((len(center_beads), 3), dtype=np.uint8)
    for i, bead in enumerate(center_beads):
        hex_str = bead['hex'].lstrip('#')
        colors[i] = [int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)]
    return colors


def region_constrained_quantize(
    pixels: np.ndarray,
    region_mask: np.ndarray,
    bead_colors: list,
    custom_k: dict = None
) -> tuple:
    """
    分区约束纯色量化 — 核心量化引擎（文档规范第六章）。

    流程：
      1. 按区域掩码分离像素
      2. 各区域独立 MiniBatchKMeans（scikit-learn）
      3. 聚类中心 CIEDE2000 硬映射到拼豆色板
      4. 向量化回填各区域，生成量化后的纯色图
      5. 输出 ΔE 警告（>10 时提示用户）

    Args:
        pixels: RGB 图像 (H, W, 3) uint8
        region_mask: 区域掩码 (H, W) int，值为 REGION_TYPES
        bead_colors: 预计算 Lab 的珠子颜色列表 [{id, name, hex, brand, lab, oklab}, ...]
        custom_k: 自定义 K 值，如 {0: 1, 2: 4}

    Returns:
        (quantized_image, stats)
          - quantized_image: (H, W, 3) uint8 RGB 图像
          - stats: dict 包含各区域量化统计
    """
    h, w = pixels.shape[:2]
    total = h * w
    k_values = {**DEFAULT_K, **(custom_k or {})}

    # 结果图像（初始化为白色）
    result = np.full((h, w, 3), 255, dtype=np.uint8)

    # 统计用
    stats = {'regions': {}, 'total_colors': 0, 'total_beads': 0}
    all_hexes = set()  # 收集所有使用的颜色 hex

    # 对每个区域类型独立量化
    for region_type, k in k_values.items():
        mask = region_mask == region_type
        if not mask.any():
            stats['regions'][region_type] = {'k': k, 'pixels': 0, 'centers': 0, 'bead_colors': 0}
            continue

        region_pixels = pixels[mask].astype(np.float64)  # (N, 3)
        n_pixels = len(region_pixels)

        # ---------- 纯色区域保护 ----------
        # 方差极低的区域跳过 K-Means，直接取平均色 → 珠子映射
        if k == 1 or _is_pure_region(region_pixels):
            mean_color = region_pixels.mean(axis=0)
            centers = mean_color.reshape(1, 3)
        else:
            centers = _kmeans_cluster(region_pixels, min(k, n_pixels))

        # 聚类中心 → 珠子颜色（CIEDE2000）
        center_beads = match_centers_to_beads(centers, bead_colors)

        # ---------- 向量化回填 ----------
        if len(centers) == 1:
            # 单中心 → 直接广播赋值（最快路径，适用背景/纯色区域）
            bead = center_beads[0]
            hex_str = bead['hex'].lstrip('#')
            rgb = np.array([int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)], dtype=np.uint8)
            result[mask] = rgb
            all_hexes.add(bead['hex'])
        else:
            # 多中心 → 向量化分配
            centroid_indices = _assign_to_centers(region_pixels, centers)  # (N,) → [0..K-1]
            colors = _centers_to_rgb_colors(centers, center_beads)          # (K, 3) uint8

            # 用聚类索引映射到 RGB 颜色
            assigned_colors = colors[centroid_indices]  # (N, 3)

            # 一次赋值到结果图像
            y_indices, x_indices = np.where(mask)
            result[y_indices, x_indices] = assigned_colors

            for bead in center_beads:
                all_hexes.add(bead['hex'])

        # 统计
        stats['regions'][region_type] = {
            'k': k,
            'pixels': n_pixels,
            'centers': len(centers),
            'bead_colors': len(set(b['hex'] for b in center_beads))
        }

    # 汇总统计
    stats['total_colors'] = len(all_hexes)
    stats['total_beads'] = total  # 量化后所有像素都有颜色
    stats['algorithm'] = 'region-kmeans-hardmap-ciede2000'

    # 日志输出（文档合规）
    region_names = {0: '背景', 1: '轮廓', 2: '皮肤', 3: '主色块', 4: '细节', 5: '五官', 6: '头发', 7: '文字'}
    parts = []
    for t, v in stats['regions'].items():
        if v['pixels'] > 0:
            parts.append(f"{region_names.get(t, t)}K{v['k']}({v['pixels']}px,{v['bead_colors']}色)")
    print(f"分区量化(文档合规): {' '.join(parts)} → {stats['total_colors']}色 {stats['total_beads']}珠")

    return result, stats
