"""深度诊断：K值塌缩问题"""
import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')

import cv2
import numpy as np
import time
from collections import Counter
from routes.convert import _image_to_grid
from services.quantization import region_constrained_quantize, REGION_TYPES, DEFAULT_K


def diagnostic():
    print("=" * 60)
    print("诊断：DEFAULT_K 值")
    print(f"DETAIL K = {DEFAULT_K[REGION_TYPES['DETAIL']]}")
    print(f"MAIN_COLOR K = {DEFAULT_K[REGION_TYPES['MAIN_COLOR']]}")
    print(f"colorLimit 参数当前没有被传入 region_constrained_quantize")

    # 创建测试图
    from scripts.test_quality import create_test_image
    img = create_test_image(512, 512)

    # 测试1：使用更大的 colorLimit —— 但会发现它无效
    print("\n" + "=" * 60)
    print("测试1: smartOptimize=False, colorLimit=50 (期望>5色)")
    print("=" * 60)

    opts = {
        'smartOptimize': False,
        'bgUnify': False, 'bgMode': 'auto', 'bgColor': '#FFFFFF',
        'skinUnify': False, 'skinSmoothLevel': 'medium', 'skinLayerCount': 3,
        'ocrEnhance': False, 'denoiseLevel': 0,
        'colorLimit': 50,  # ← 设置很大，但无效
        'prefilter': True, 'crisp': False,
    }
    r = _image_to_grid(img.copy(), 58, 58, None, opts)
    grid = r['grid']
    hexes = set()
    for row in grid:
        for cell in row:
            if cell and 'hex' in cell:
                hexes.add(cell['hex'])
    print(f"  结果颜色数: {len(hexes)} (DETAIL K=5 限制下永远≤5)")

    # 测试2：直接调用 region_constrained_quantize 传入 custom_k
    print("\n" + "=" * 60)
    print("测试2: 直接调用量化器, custom_k={DETAIL:12}")
    print("=" * 60)
    from services.preprocessing import preprocess
    from db.connection import get_db
    from services.color_match import load_bead_colors

    db = get_db()
    bead_colors = load_bead_colors(db, None)
    db.close()

    image = preprocess(img.copy(), prefilter=True, crisp=False)
    h, w = image.shape[:2]
    region_mask = np.full((h, w), REGION_TYPES['DETAIL'], dtype=np.uint8)

    custom_k = {REGION_TYPES['DETAIL']: 12}
    quantized, stats = region_constrained_quantize(image, region_mask, bead_colors, custom_k)
    print(f"  DETAIL K=12 颜色数: {stats['total_colors']}")

    # 测试3: K=16
    print("\n" + "=" * 60)
    print("测试3: 直接调用量化器, custom_k={DETAIL:16}")
    print("=" * 60)
    custom_k = {REGION_TYPES['DETAIL']: 16}
    quantized, stats = region_constrained_quantize(image, region_mask, bead_colors, custom_k)
    print(f"  DETAIL K=16 颜色数: {stats['total_colors']}")

    # 测试4: K=20
    print("\n" + "=" * 60)
    print("测试4: 直接调用量化器, custom_k={DETAIL:20}")
    print("=" * 60)
    custom_k = {REGION_TYPES['DETAIL']: 20}
    quantized, stats = region_constrained_quantize(image, region_mask, bead_colors, custom_k)
    print(f"  DETAIL K=20 颜色数: {stats['total_colors']}")

    # 测试5: 原始图像到底有多少唯一种颜色
    print("\n" + "=" * 60)
    print("测试5: 原始测试图唯一颜色统计")
    print("=" * 60)
    unique = np.unique(img.reshape(-1, 3), axis=0)
    print(f"  原始图像像素数: {img.shape[0]*img.shape[1]}")
    print(f"  唯一种 RGB 颜色数: {len(unique)}")
    print(f"  前10种: {unique[:10]}")

    # 统计颜色比例
    colors_flat = [tuple(p) for p in img.reshape(-1, 3)]
    color_counts = Counter(colors_flat)
    print(f"\n  Top10 原始颜色分布:")
    for rgb, cnt in color_counts.most_common(10):
        pct = cnt / (img.shape[0] * img.shape[1]) * 100
        print(f"    RGB{rgb}: {cnt}px ({pct:.1f}%)")


if __name__ == '__main__':
    diagnostic()
