"""
五官细节修复模块（文档 7.3）
- 左右眼对称性检查
- 嘴巴轮廓断裂修复
- 五官区域后处理保护（防止被连通域过滤清除）
"""
import numpy as np


def check_eye_symmetry(landmarks: np.ndarray, image_w: int, image_h: int) -> dict:
    """
    检查左右眼对称性

    68点关键点索引（文档附录B）：
    - 左眼轮廓：36-41
    - 右眼轮廓：42-47

    Returns:
        symmetry_score: 0~1，1=完全对称
        needs_correction: 评分 < 0.8 认为需要修正
    """
    if landmarks is None or len(landmarks) < 48:
        return {'symmetry_score': 1.0, 'needs_correction': False}

    left_eye = landmarks[36:42].astype(np.float64)
    right_eye = landmarks[42:48].astype(np.float64)

    # 计算眼宽（外眼角到内眼角距离）
    left_width = np.linalg.norm(left_eye[0] - left_eye[3])
    right_width = np.linalg.norm(right_eye[0] - right_eye[3])

    # 计算眼高（上下眼睑最大距离）
    def eye_height(pts):
        top = max(np.linalg.norm(pts[1] - pts[5]), np.linalg.norm(pts[2] - pts[4]))
        bottom = np.linalg.norm(pts[1] - pts[2])
        return max(top, bottom)

    left_height = eye_height(left_eye)
    right_height = eye_height(right_eye)

    # 对称性评分（考虑宽度和高度的比例）
    if max(left_width, right_width) < 0.5:
        return {'symmetry_score': 1.0, 'needs_correction': False}

    width_ratio = min(left_width, right_width) / max(left_width, right_width, 0.1)
    height_ratio = min(left_height, right_height) / max(left_height, right_height, 0.1)
    score = round((width_ratio + height_ratio) / 2.0, 3)

    return {
        'symmetry_score': score,
        'needs_correction': score < 0.8,
        'left_eye_size': round(float(left_width * left_height), 1),
        'right_eye_size': round(float(right_width * right_height), 1),
    }


def repair_eye_symmetry(
    grid: list,
    w: int, h: int,
    landmarks: np.ndarray,
    feature_mask: np.ndarray,
    image_scale: float = 1.0
) -> tuple[list, dict]:
    """
    修正左右眼不对称

    策略：
    - 如果左右眼水平距离 > 图宽30%，判定为侧脸，跳过修正
    - 否则在眼睛区域标记保护，防止后处理过滤掉眼睛像素
    - 不做强制裁剪（避免丢失信息）

    Returns:
        (grid, stats)
    """
    stats = {'corrected': False, 'reason': 'ok'}
    result = [[{**cell} if cell else None for cell in row] for row in grid]

    if landmarks is None or len(landmarks) < 48:
        stats['reason'] = 'no_landmarks'
        return result, stats

    left_center = landmarks[36:42].mean(axis=0) * image_scale
    right_center = landmarks[42:48].mean(axis=0) * image_scale

    lx, ly = int(left_center[0]), int(left_center[1])
    rx, ry = int(right_center[0]), int(right_center[1])

    if not (0 <= lx < w and 0 <= ly < h and 0 <= rx < w and 0 <= ry < h):
        stats['reason'] = 'out_of_bounds'
        return result, stats

    # 侧脸检测
    if abs(lx - rx) > w * 0.3:
        stats['reason'] = 'side_face'
        return result, stats

    # 计算眼睛区域半径
    left_radius = max(2, int(np.linalg.norm(landmarks[36] - landmarks[39]) * image_scale * 0.5))
    right_radius = max(2, int(np.linalg.norm(landmarks[42] - landmarks[45]) * image_scale * 0.5))

    # 检测左右眼区域内的像素数差异
    def count_pixels(cx, cy, radius):
        x0, y0 = max(0, cx - radius), max(0, cy - radius)
        x1, y1 = min(w - 1, cx + radius), min(h - 1, cy + radius)
        count = 0
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    if result[y][x] is not None:
                        count += 1
        return count

    left_count = count_pixels(lx, ly, left_radius)
    right_count = count_pixels(rx, ry, right_radius)

    # 如果小的眼睛像素 < 大的 70%，做轻微膨胀补偿
    if min(left_count, right_count) > 0:
        ratio = min(left_count, right_count) / max(left_count, right_count)
        if ratio < 0.7:
            smaller_eye = (lx, ly) if left_count < right_count else (rx, ry)
            eye_radius = left_radius if left_count < right_count else right_radius
            # 对小眼睛区域做 1px 膨胀（填充缺失像素）
            sx, sy = smaller_eye
            for y in range(max(0, sy - eye_radius), min(h, sy + eye_radius + 1)):
                for x in range(max(0, sx - eye_radius), min(w, sx + eye_radius + 1)):
                    if result[y][x] is not None:
                        continue
                    if (x - sx) ** 2 + (y - sy) ** 2 > eye_radius ** 2:
                        continue
                    # 取3×3邻域最多颜色填充
                    nb = {}
                    for dy in [-1, 0, 1]:
                        for dx in [-1, 0, 1]:
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < h and 0 <= nx < w:
                                nc = result[ny][nx]
                                if nc:
                                    hx = nc['hex']
                                    nb[hx] = nb.get(hx, 0) + 1
                    if nb:
                        best_hex = max(nb, key=nb.get)
                        for dy in [-1, 0, 1]:
                            for dx in [-1, 0, 1]:
                                nc = result[y + dy][x + dx] if 0 <= y + dy < h and 0 <= x + dx < w else None
                                if nc and nc.get('hex') == best_hex:
                                    result[y][x] = {'id': nc['id'], 'name': nc['name'], 'hex': nc['hex']}
                                    break
                            if result[y][x]:
                                break
            stats['corrected'] = True
            stats['reason'] = f'eye_asymmetry_{ratio:.2f}'

    return result, stats


def repair_mouth_contour(
    grid: list,
    w: int, h: int,
    landmarks: np.ndarray,
    image_scale: float = 1.0
) -> tuple[list, dict]:
    """
    修复嘴巴轮廓断裂

    68点关键点：嘴巴外轮廓 48-59

    策略：在嘴巴外轮廓区域检测空像素，用 3×3 邻域最多颜色填充
    """
    stats = {'filled': 0}
    result = [[{**cell} if cell else None for cell in row] for row in grid]

    if landmarks is None or len(landmarks) < 60:
        return result, stats

    mouth_pts = (landmarks[48:60].astype(np.float64) * image_scale).astype(int)
    x0, y0 = mouth_pts[:, 0].min(), mouth_pts[:, 1].min()
    x1, y1 = mouth_pts[:, 0].max(), mouth_pts[:, 1].max()

    # 扩展 2px margin
    x0, y0 = max(0, x0 - 2), max(0, y0 - 2)
    x1, y1 = min(w - 1, x1 + 2), min(h - 1, y1 + 2)

    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if result[y][x] is not None:
                continue
            # 统计 8 邻域颜色
            nb = {}
            for dy in [-1, 0, 1]:
                for dx in [-1, 0, 1]:
                    nx, ny = x + dx, y + dy
                    if not (x0 <= nx <= x1 and y0 <= ny <= y1):
                        continue
                    nc = result[ny][nx]
                    if nc:
                        hx = nc['hex']
                        nb[hx] = nb.get(hx, 0) + 1
            if nb:
                best_hex = max(nb, key=nb.get)
                best_count = nb[best_hex]
                if best_count >= 3:  # 至少3个同色邻居才填充
                    for dy in [-1, 0, 1]:
                        for dx in [-1, 0, 1]:
                            nc = result[y + dy][x + dx] if 0 <= y + dy < h and 0 <= x + dx < w else None
                            if nc and nc.get('hex') == best_hex:
                                result[y][x] = {'id': nc['id'], 'name': nc['name'], 'hex': nc['hex']}
                                stats['filled'] += 1
                                break
                        if result[y][x]:
                            break

    return result, stats


def protect_features_in_postprocess(
    grid: list,
    w: int, h: int,
    feature_mask: np.ndarray,
    min_component_size: int = 1
) -> list:
    """
    五官区域后处理保护
    确保五官区域的微小色块不被连通域过滤清除
    """
    result = [[{**cell} if cell else None for cell in row] for row in grid]
    protected = 0

    for y in range(h):
        for x in range(w):
            if feature_mask[y, x] < 128:
                continue
            # 五官区域的空像素 → 用邻域颜色填充
            if result[y][x] is None:
                nb = {}
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            nc = result[ny][nx]
                            if nc:
                                hx = nc['hex']
                                nb[hx] = nb.get(hx, 0) + 1
                if nb:
                    best_hex = max(nb, key=nb.get)
                    for dy in [-1, 0, 1]:
                        for dx in [-1, 0, 1]:
                            nc = result[y + dy][x + dx] if 0 <= y + dy < h and 0 <= x + dx < w else None
                            if nc and nc.get('hex') == best_hex:
                                result[y][x] = {'id': nc['id'], 'name': nc['name'], 'hex': nc['hex']}
                                protected += 1
                                break

    if protected > 0:
        print(f"  五官保护: {protected}像素")

    return result
