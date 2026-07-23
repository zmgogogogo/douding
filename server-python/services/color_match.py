from typing import Optional
"""
颜色匹配服务 — CIEDE2000 + Oklab 双算法
文档规范：CIEDE2000优先，ΔE＜5合格，ΔE＞10提示
"""
import numpy as np
from utils.color_space import rgb_to_lab, rgb_to_oklab, delta_e_2000, oklab_dist


def load_bead_colors(db, brand: Optional[str] = None) -> list[dict]:
    """加载珠子颜色并预计算 Lab/Oklab 值"""
    if brand and brand != '全部':
        rows = db.execute("""
            SELECT c.id, c.name, c.hex, b.name as brand
            FROM bead_colors c
            JOIN bead_series s ON c.series_id = s.id
            JOIN bead_brands b ON s.brand_id = b.id
            WHERE b.name = ?
            ORDER BY c.id
        """, (brand,)).fetchall()
    else:
        rows = db.execute("""
            SELECT c.id, c.name, c.hex, b.name as brand
            FROM bead_colors c
            JOIN bead_series s ON c.series_id = s.id
            JOIN bead_brands b ON s.brand_id = b.id
            ORDER BY c.id
        """).fetchall()

    colors = []
    for r in rows:
        hex_str = r['hex'].lstrip('#')
        r_ = int(hex_str[0:2], 16)
        g_ = int(hex_str[2:4], 16)
        b_ = int(hex_str[4:6], 16)
        lab = rgb_to_lab(np.array([r_, g_, b_]))
        oklab = rgb_to_oklab(np.array([r_, g_, b_]))
        colors.append({
            'id': r['id'],
            'name': r['name'],
            'hex': r['hex'].upper(),
            'brand': r['brand'],
            'lab': lab,
            'oklab': oklab
        })
    return colors


def find_best_match_ciede2000(pixel_lab: np.ndarray, bead_colors: list[dict]) -> dict:
    """CIEDE2000 最近邻匹配（文档推荐主算法）"""
    best, best_dist = None, float('inf')
    for c in bead_colors:
        d = delta_e_2000(pixel_lab, c['lab'])
        if d < best_dist:
            best_dist = d
            best = c
    return best


def find_best_match_oklab(pixel_oklab: np.ndarray, bead_colors: list[dict]) -> dict:
    """Oklab 最近邻匹配（快速预览）"""
    best, best_dist = None, float('inf')
    for c in bead_colors:
        d = oklab_dist(pixel_oklab, c['oklab'])
        if d < best_dist:
            best_dist = d
            best = c
    return best


def match_centers_to_beads(
    centers_rgb: np.ndarray, bead_colors: list[dict]
) -> list[dict]:
    """
    将 K-Means 聚类中心（RGB）映射到珠子颜色（CIEDE2000）
    返回与centers一一对应的bead color列表
    """
    results = []
    for center in centers_rgb:
        lab = rgb_to_lab(center)
        best, best_dist = None, float('inf')
        for bc in bead_colors:
            d = delta_e_2000(lab, bc['lab'])
            if d < best_dist:
                best_dist = d
                best = bc
        if best_dist > 10:
            print(f"  ⚠️ 聚类中心 RGB({center[0]:.0f},{center[1]:.0f},{center[2]:.0f}) ΔE={best_dist:.2f}>10，无完美匹配色号")
        results.append({
            'id': best['id'],
            'name': best['name'],
            'hex': best['hex'],
            'brand': best['brand']
        })
    return results
