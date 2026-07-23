"""
边缘对齐最近邻像素化（文档规范 七）
cv2.INTER_NEAREST — 唯一不生成过渡色的缩放算法
禁用：双线性/双三次/Lanczos（会产生过渡混色）
"""
import cv2
import numpy as np


def canny_edge_detect(
    image: np.ndarray,
    low: float = 50,
    high: float = 150
) -> np.ndarray:
    """
    Canny 边缘检测
    返回二值边缘图 (0/255)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, low, high)
    return edges


def adaptive_canny_thresholds(image: np.ndarray) -> tuple[float, float]:
    """根据图像亮度自动调整 Canny 阈值"""
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    avg_lum = gray.mean()
    low = max(25, min(60, 25 + (avg_lum / 255.0) * 35))
    high = max(80, min(160, 80 + (avg_lum / 255.0) * 80))
    return low, high


def find_grid_offset(
    edge_map: np.ndarray,
    src_w: int, src_h: int,
    target_w: int, target_h: int
) -> tuple[float, float]:
    """
    寻找最优像素网格偏移量（向量化实现）
    在 2× 中间图上模拟最近邻采样，计算落在边缘上的采样点数量，取最小值
    搜索步长 0.1 像素（子像素精度）

    向量化优化：预计算所有采样坐标，用 numpy 高级索引批量统计，
    将 11×11×58×58=407K 次 Python 迭代减少为 121 次 numpy 向量化操作。
    """
    scale_x = src_w / target_w
    scale_y = src_h / target_h

    # 预计算目标网格每个像素对应的源坐标（取整前的基础坐标）
    ty_grid = np.arange(target_h)  # (target_h,)
    tx_grid = np.arange(target_w)  # (target_w,)
    sy_base = (ty_grid * scale_y).astype(np.int32)  # (target_h,)
    sx_base = (tx_grid * scale_x).astype(np.int32)  # (target_w,)

    # 裁剪到有效范围
    sy_base = np.clip(sy_base, 0, src_h - 1)
    sx_base = np.clip(sx_base, 0, src_w - 1)

    # 构建 2D 坐标网格（用于高级索引）
    sy_grid, sx_grid = np.meshgrid(sy_base, sx_base, indexing='ij')  # (target_h, target_w)

    best_ox, best_oy, best_score = 0.0, 0.0, float('inf')

    # 预计算目标网格的浮点源坐标（不含偏移）
    ty_grid_f = np.arange(target_h) * scale_y  # (target_h,)
    tx_grid_f = np.arange(target_w) * scale_x  # (target_w,)

    for ox in np.arange(-0.5, 0.6, 0.1):
        for oy in np.arange(-0.5, 0.6, 0.1):
            # 直接加浮点偏移量再截断（int()语义），而非 round()
            sy = np.clip((ty_grid_f[:, None] + oy).astype(np.int32), 0, src_h - 1)
            sx = np.clip((tx_grid_f[None, :] + ox).astype(np.int32), 0, src_w - 1)
            # 广播索引：sy广播到(target_h, 1), sx广播到(1, target_w)
            edge_hits = int(np.count_nonzero(edge_map[sy, sx]))
            if edge_hits < best_score:
                best_score = edge_hits
                best_ox, best_oy = ox, oy

    print(f"  边缘对齐: 偏移 ({best_ox:.1f}, {best_oy:.1f}) 边缘命中={best_score}")
    return best_ox, best_oy


def edge_aligned_resize(
    src: np.ndarray,
    target_w: int, target_h: int,
    ox: float = 0.0, oy: float = 0.0
) -> np.ndarray:
    """
    边缘对齐最近邻下采样（向量化实现）
    严格使用 cv2.INTER_NEAREST + 子像素偏移
    """
    src_h, src_w = src.shape[:2]
    scale_x = src_w / target_w
    scale_y = src_h / target_h

    # 计算目标网格对应的源坐标（向量化）
    ty_grid = np.arange(target_h)
    tx_grid = np.arange(target_w)
    sy = np.clip((ty_grid * scale_y + oy).astype(np.int32), 0, src_h - 1)
    sx = np.clip((tx_grid * scale_x + ox).astype(np.int32), 0, src_w - 1)

    # 用 meshgrid 构建 2D 索引，一次性 fancy index 取值
    sy_2d, sx_2d = np.meshgrid(sy, sx, indexing='ij')
    dst = src[sy_2d, sx_2d]  # (target_h, target_w, channels)

    return dst


def edge_aligned_pixelize(
    src: np.ndarray,
    target_w: int, target_h: int
) -> dict:
    """
    完整边缘对齐最近邻像素化管道

    1. 最近邻缩放到 2× 中间尺寸 → Canny 边缘检测
    2. 寻找最优像素网格偏移量
    3. 边缘对齐最近邻下采样到目标尺寸

    禁用双线性/双三次（文档规范）
    """
    src_h, src_w = src.shape[:2]

    # Step 1: 缩放到 2× 目标尺寸（最近邻）
    mid_w, mid_h = target_w * 2, target_h * 2
    mid = cv2.resize(src, (mid_w, mid_h), interpolation=cv2.INTER_NEAREST)

    # Step 2: Canny 边缘检测
    low, high = adaptive_canny_thresholds(mid)
    print(f"  Canny自适应阈值: low={low:.0f} high={high:.0f}")
    edge_map = canny_edge_detect(mid, low, high)

    # Step 3: 寻找最优偏移
    ox, oy = find_grid_offset(edge_map, mid_w, mid_h, target_w, target_h)

    # Step 4: 边缘对齐最近邻下采样
    result = edge_aligned_resize(mid, target_w, target_h, ox, oy)

    return {
        'pixels': result,
        'width': target_w,
        'height': target_h,
        'offset': (ox, oy)
    }


def downsample_grid(
    src_grid: list,
    src_w: int, src_h: int,
    target_w: int, target_h: int,
    region_mask: np.ndarray = None
) -> list:
    """
    网格下采样（区域感知多数投票）
    将中间分辨率的拼豆网格下采样到目标尺寸
    """
    scale_x = src_w / target_w
    scale_y = src_h / target_h

    grid = []
    for ty in range(target_h):
        sy0 = int(ty * scale_y)
        sy1 = min(src_h - 1, int((ty + 1) * scale_y))
        row = []
        for tx in range(target_w):
            sx0 = int(tx * scale_x)
            sx1 = min(src_w - 1, int((tx + 1) * scale_x))

            # 区域感知：确定主导区域
            dominant_region = -1
            if region_mask is not None:
                region_counts = {}
                for sy in range(sy0, sy1 + 1):
                    for sx in range(sx0, sx1 + 1):
                        rt = int(region_mask[sy, sx])
                        region_counts[rt] = region_counts.get(rt, 0) + 1
                if region_counts:
                    dominant_region = max(region_counts, key=region_counts.get)

            # 投票：只统计主导区域像素
            votes = {}
            for sy in range(sy0, sy1 + 1):
                for sx in range(sx0, sx1 + 1):
                    if dominant_region >= 0 and region_mask is not None:
                        if int(region_mask[sy, sx]) != dominant_region:
                            continue
                    cell = src_grid[sy][sx] if sy < len(src_grid) and sx < len(src_grid[sy]) else None
                    if cell and 'hex' in cell:
                        hex_v = cell['hex']
                        if hex_v in votes:
                            votes[hex_v]['count'] += 1
                        else:
                            votes[hex_v] = {'count': 1, 'cell': cell}

            if votes:
                best = max(votes.values(), key=lambda v: v['count'])
                row.append(best['cell'])
            else:
                row.append(None)
        grid.append(row)
    return grid
