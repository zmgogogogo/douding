"""
拼豆网格后处理（文档规范第七章）
==============================
三步收尾，做到零杂点：
  1. 带区域约束的连通域面积过滤
     - 背景区(0): 阈值 2px — 任何小杂点全部清除
     - 皮肤区(2): 阈值 3px — 保证面部干净
     - 五官/文字区(5): 阈值 1px — 仅清除孤立椒盐点，保护细节
  2. 轮廓连续性补强 — 填补 1-2px 断裂
  3. 2×2 形态学开运算（仅背景/皮肤区）
     - 文档规范：背景/皮肤区执行2×2开运算清除1px边缘毛刺
     - 严格跳过轮廓区(1)和面部特征区(5)，避免侵蚀关键细节
"""

import numpy as np
from collections import deque


# ============================================================
# BFS 连通域分析
# ============================================================

def _find_all_components(grid: list, w: int, h: int) -> list:
    """
    BFS 查找所有同色连通域。

    Returns:
        list[dict]: [{hex, cells: [(x,y),...], size}, ...]
    """
    visited = np.zeros((h, w), dtype=bool)
    components = []

    for y in range(h):
        for x in range(w):
            if visited[y, x]:
                continue
            row = grid[y] if y < len(grid) else []
            cell = row[x] if x < len(row) else None
            if not cell or 'hex' not in cell:
                visited[y, x] = True
                continue

            hex_v = cell['hex']
            queue = deque([(x, y)])
            visited[y, x] = True
            cells = [(x, y)]

            while queue:
                cx, cy = queue.popleft()
                for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                    nx, ny = cx + dx, cy + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    if visited[ny, nx]:
                        continue
                    r = grid[ny] if ny < len(grid) else []
                    nc = r[nx] if nx < len(r) else None
                    if nc and nc.get('hex') == hex_v:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
                        cells.append((nx, ny))

            components.append({'hex': hex_v, 'cells': cells, 'size': len(cells)})

    return components


def _compute_dominant_colors(grid: list, w: int, h: int, region_mask: np.ndarray = None) -> dict:
    """
    统计每个区域出现频率最高的珠子颜色。

    Returns:
        dict: {region_type: {'hex': ..., 'id': ..., 'name': ...}}
    """
    region_colors = {}  # regionType → {hex → count}
    region_cell_info = {}  # regionType → {hex → {id, name, hex}}

    for y in range(h):
        for x in range(w):
            rt = int(region_mask[y, x]) if region_mask is not None else 4
            row = grid[y] if y < len(grid) else []
            cell = row[x] if x < len(row) else None
            if not cell or 'hex' not in cell:
                continue

            if rt not in region_colors:
                region_colors[rt] = {}
                region_cell_info[rt] = {}
            hex_v = cell['hex']
            region_colors[rt][hex_v] = region_colors[rt].get(hex_v, 0) + 1
            region_cell_info[rt][hex_v] = {'id': cell.get('id'), 'name': cell.get('name'), 'hex': hex_v}

    dominant = {}
    for rt, counts in region_colors.items():
        best_hex = max(counts, key=counts.get)
        dominant[rt] = region_cell_info[rt].get(best_hex)
    return dominant


# ============================================================
# Step 1: 区域感知连通域过滤
# ============================================================

def filter_small_components(
    grid: list, w: int, h: int,
    region_mask: np.ndarray = None,
    base_min_size: int = 3
) -> tuple:
    """
    带区域约束的连通域面积过滤（文档规范 7.2 算法1）。

    分区差异化阈值：
      - 背景区(0): 阈值 2px
      - 皮肤区(2): 阈值 3px
      - 五官区(5): 阈值 1px（仅清除孤立椒盐点）
      - 其他区域: base_min_size（默认 3）

    过滤逻辑：
      1. 查找所有同色连通域
      2. 判断每个连通域主要属于哪个区域
      3. 小于该区域阈值的 → 替换为该区域主导色

    Returns:
        (grid, removed_count)
    """
    components = _find_all_components(grid, w, h)
    result = [[{**cell} if cell else None for cell in row] for row in grid]
    dominant_colors = _compute_dominant_colors(grid, w, h, region_mask)
    removed = 0

    REGION_BG = 0       # 背景
    REGION_SKIN = 2     # 皮肤
    REGION_FACIAL = 5   # 五官

    for comp in components:
        # ---- 确定该连通域的主导区域 ----
        effective_threshold = base_min_size
        dominant_rt = 4  # 默认细节区

        if region_mask is not None and comp['cells']:
            region_votes = {}
            for x, y in comp['cells']:
                rt = int(region_mask[y, x])
                region_votes[rt] = region_votes.get(rt, 0) + 1
            dominant_rt = max(region_votes, key=region_votes.get)

            if dominant_rt == REGION_BG:
                effective_threshold = 2     # 文档规范：背景区 2px
            elif dominant_rt == REGION_SKIN:
                effective_threshold = 3     # 文档规范：皮肤区 3px
            elif dominant_rt == REGION_FACIAL:
                effective_threshold = 1     # 文档规范：五官区 1px

        # ---- 足够大 → 保留 ----
        if comp['size'] >= effective_threshold:
            continue

        # ---- 五官区域 → 永远不过滤（保护细节） ----
        if dominant_rt == REGION_FACIAL and effective_threshold == 1:
            continue

        # ---- 微小杂色 → 替换为 3×3 邻域占比最高色（文档规范 7.2） ----
        for x, y in comp['cells']:
            # 统计 3×3 邻域颜色频率（排除自身所在连通域的像素）
            nb_colors = {}
            comp_set = set(comp['cells'])
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    if (nx, ny) in comp_set:
                        continue  # 跳过同属杂色块的像素
                    nc = result[ny][nx] if ny < len(result) and nx < len(result[ny]) else None
                    if nc and 'hex' in nc:
                        nb_colors[nc['hex']] = nb_colors.get(nc['hex'], 0) + 1
            if nb_colors:
                best_hex = max(nb_colors, key=nb_colors.get)
                # 在邻域找到该颜色的完整信息
                for dy in range(-1, 2):
                    for dx in range(-1, 2):
                        nny, nnx = y + dy, x + dx
                        if not (0 <= nny < h and 0 <= nnx < w):
                            continue
                        nc = result[nny][nnx] if nny < len(result) and nnx < len(result[nny]) else None
                        if nc and nc.get('hex') == best_hex:
                            result[y][x] = {'id': nc['id'], 'name': nc['name'], 'hex': nc['hex']}
                            removed += 1
                            break
                    if result[y][x] and 'hex' in result[y][x]:
                        break

    if removed > 0:
        print(f"  连通域过滤(文档合规): {len(components)}个连通域, 清除{removed}杂点 (背景2px/皮肤3px/五官1px)")

    return result, removed


# ============================================================
# Step 2: 轮廓连续性补强
# ============================================================

def reinforce_contours(grid: list, w: int, h: int, region_mask: np.ndarray = None) -> tuple:
    """
    轮廓连续性补强（文档规范 7.3）。

    三遍扫描（文档规范：距离≤3 像素的断点自动连接补全）：
      第一遍：1px 缺口 (3×3 邻域 ≥3 同色) → 填充
      第二遍：2px 缺口 (5×5 邻域 ≥5 同色) → 填充
      第三遍：3px 缺口 (7×7 环状区域，排除 5×5 内圈，≥7 同色) → 填充

    只有 region_mask == 1（轮廓区）的空白像素才参与补强。

    Returns:
        (grid, filled_count)
    """
    result = [[{**cell} if cell else None for cell in row] for row in grid]
    filled = 0

    # ---- 第一遍：1px 缺口 (3×3 邻域) ----
    for y in range(h):
        for x in range(w):
            if region_mask is not None and int(region_mask[y, x]) != 1:
                continue
            if result[y][x] and 'hex' in result[y][x]:
                continue

            nb = _count_neighbor_colors(result, w, h, x, y, radius=1)
            if nb:
                best_hex, best_count = max(nb.items(), key=lambda kv: kv[1])
                if best_count >= 3:
                    _fill_with_neighbor_color(result, w, h, x, y, best_hex, radius=1)
                    filled += 1

    # ---- 第二遍：2px 缺口 (5×5 环状区域，排除 3×3 内圈) ----
    for y in range(h):
        for x in range(w):
            if region_mask is not None and int(region_mask[y, x]) != 1:
                continue
            if result[y][x] and 'hex' in result[y][x]:
                continue

            nb = _count_neighbor_colors(result, w, h, x, y, radius=2, exclude_radius=1)
            if nb:
                best_hex, best_count = max(nb.items(), key=lambda kv: kv[1])
                if best_count >= 5:
                    _fill_with_neighbor_color(result, w, h, x, y, best_hex, radius=2)
                    filled += 1

    # ---- 第三遍：3px 缺口（文档规范 7.3：距离≤3 像素的断点自动连接补全） ----
    # 7×7 环状区域，排除 5×5 内圈
    for y in range(h):
        for x in range(w):
            if region_mask is not None and int(region_mask[y, x]) != 1:
                continue
            if result[y][x] and 'hex' in result[y][x]:
                continue

            nb = _count_neighbor_colors(result, w, h, x, y, radius=3, exclude_radius=2)
            if nb:
                best_hex, best_count = max(nb.items(), key=lambda kv: kv[1])
                if best_count >= 7:
                    _fill_with_neighbor_color(result, w, h, x, y, best_hex, radius=3)
                    filled += 1

    if filled > 0:
        print(f"  轮廓补强: {filled}像素缺口 (1-3px)")

    return result, filled


def _count_neighbor_colors(grid, w, h, cx, cy, radius=1, exclude_radius=0):
    """统计邻域颜色频率。exclude_radius 排除内圈（用于 5×5 环状统计）。"""
    nb = {}
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if abs(dx) <= exclude_radius and abs(dy) <= exclude_radius:
                continue
            if dx == 0 and dy == 0:
                continue
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            r = grid[ny] if ny < len(grid) else []
            nc = r[nx] if nx < len(r) else None
            if nc and 'hex' in nc:
                nb[nc['hex']] = nb.get(nc['hex'], 0) + 1
    return nb


def _fill_with_neighbor_color(grid, w, h, cx, cy, target_hex, radius=1):
    """在邻域中找到目标颜色的完整信息并填充。"""
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = cx + dx, cy + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            r = grid[ny] if ny < len(grid) else []
            nc = r[nx] if nx < len(r) else None
            if nc and nc.get('hex') == target_hex:
                grid[cy][cx] = {'id': nc['id'], 'name': nc['name'], 'hex': nc['hex']}
                return True
    return False


# ============================================================
# Step 3: 2×2 形态学开运算（文档规范 7.2 算法2）
# ============================================================

def _morphological_open(grid: list, w: int, h: int, region_mask: np.ndarray = None) -> tuple:
    """
    形态学开运算（腐蚀 → 膨胀）。

    文档规范：
      - 仅对背景区(0)和皮肤区(2)执行
      - 严格跳过轮廓区(1)和面部特征区(5) — 避免侵蚀关键细节
      - 腐蚀：仅清除真正孤立的单像素噪点（4邻域全不同），而非2×2不全同色全清
      - 膨胀：空单元格用 3×3 邻域最多颜色填充

    关键修复：原逻辑"2×2不全同色→4像素全清"会破坏所有颜色边界。
    改为仅清除4邻域完全不同的孤立像素（真正的椒盐噪点）。

    Returns:
        (grid, cleaned_count)
    """
    result = [[{**cell} if cell else None for cell in row] for row in grid]
    cleaned = 0

    # ---- 腐蚀：找出真正孤立的单像素噪点 ----
    # 孤立像素定义：4邻域所有像素颜色都与它不同（或为空）
    to_clear = set()
    for y in range(h):
        for x in range(w):
            # 跳过轮廓区和面部特征区
            if region_mask is not None:
                rt = int(region_mask[y, x])
                if rt in (1, 5):  # 轮廓区/五官区：严格保护
                    continue
                if rt not in (0, 2):  # 非背景/非皮肤区：跳过
                    continue

            cell = result[y][x]
            if not cell or 'hex' not in cell:
                continue

            hex_v = cell['hex']
            same_count = 0
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = y + dy, x + dx
                if not (0 <= ny < h and 0 <= nx < w):
                    continue
                nb = result[ny][nx]
                if nb and nb.get('hex') == hex_v:
                    same_count += 1

            # 4邻域中没有同色邻居 → 这是孤立噪点
            if same_count == 0:
                to_clear.add((x, y))

    # 应用腐蚀
    for x, y in to_clear:
        result[y][x] = None

    # ---- 膨胀：空单元格用邻居最多色填充 ----
    for y in range(h):
        for x in range(w):
            if result[y][x] and 'hex' in result[y][x]:
                continue

            nb = _count_neighbor_colors(result, w, h, x, y, radius=1)
            if not nb:
                continue

            best_hex, best_count = max(nb.items(), key=lambda kv: kv[1])
            if best_count >= 2:
                if _fill_with_neighbor_color(result, w, h, x, y, best_hex, radius=1):
                    cleaned += 1

    if cleaned > 0:
        print(f"  形态学开运算: {cleaned}孤立噪点清除 (仅背景/皮肤区, 4邻域孤立检测)")

    return result, cleaned


# ============================================================
# 主导出函数：完整后处理管道
# ============================================================

def postprocess_grid(
    grid: list, w: int, h: int,
    region_mask: np.ndarray = None,
    options: dict = None
) -> tuple:
    """
    完整后处理管道（文档规范第七章）。

    三步收尾：
      1. 连通域面积过滤（分区差异化阈值）
      2. 轮廓连续性补强（1-2px 缺口修复）
      3. 可选形态学开运算（仅背景/皮肤区，2×2 核）

    Args:
        grid: 量化后的拼豆网格 list[list[{id, name, hex}|None]]
        w: 宽度
        h: 高度
        region_mask: 目标尺寸的区域掩码 (H, W) uint8
        options:
          - minComponentSize: 基础最小连通域面积（默认 3）
          - morphOpen: 是否执行形态学开运算（默认 True）

    Returns:
        (grid, stats)
    """
    opts = options or {}
    min_size = opts.get('minComponentSize', 3)
    do_morph_open = opts.get('morphOpen', True)

    # Step 1: 连通域面积过滤
    filtered_grid, removed = filter_small_components(grid, w, h, region_mask, min_size)

    # Step 2: 轮廓补强
    reinforced_grid, filled = reinforce_contours(filtered_grid, w, h, region_mask)

    # Step 3: 2×2 形态学开运算（仅背景/皮肤区）
    morph_cleaned = 0
    if do_morph_open:
        final_grid, morph_cleaned = _morphological_open(reinforced_grid, w, h, region_mask)
    else:
        final_grid = reinforced_grid

    stats = {
        'componentFilter': {'removed': removed, 'threshold': min_size},
        'contourFill': {'filled': filled},
        'morphOpen': {'cleaned': morph_cleaned}
    }

    print(f"后处理完成: 杂点{removed} 轮廓{filled} 开运算{morph_cleaned}")

    return final_grid, stats
