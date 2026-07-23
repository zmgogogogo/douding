import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')
import numpy as np
from utils.color_space import rgb_to_lab, rgb_to_oklab, delta_e_2000, oklab_dist
from services.color_match import load_bead_colors, find_best_match_ciede2000, find_best_match_oklab, match_centers_to_beads
from db.connection import get_db

db = get_db()
beads = load_bead_colors(db)
db.close()
print(f"加载 {len(beads)} 种珠子颜色")

# 测试颜色：常见拼豆场景中的颜色
test_colors = [
    ("纯白", [255, 255, 255]),
    ("纯黑", [0, 0, 0]),
    ("纯红", [255, 0, 0]),
    ("纯绿", [0, 255, 0]),
    ("纯蓝", [0, 0, 255]),
    ("肤色", [255, 200, 150]),
    ("金发", [255, 220, 100]),
    ("天蓝", [135, 206, 235]),
    ("粉色", [255, 150, 180]),
    ("紫色", [150, 50, 200]),
    ("荧光绿", [0, 255, 128]),  # 拼豆色板中可能没有
    ("深棕", [80, 50, 30]),
    ("灰色", [128, 128, 128]),
    ("橙色", [255, 165, 0]),
    ("青色", [0, 255, 255]),
]

print("\n" + "=" * 70)
print("颜色匹配精度测试 (CIEDE2000)")
print("=" * 70)
print(f"{'颜色':<8} {'RGB':<18} {'匹配色号':<10} {'匹配名':<12} {'ΔE':<8} {'评估'}")
print("-" * 70)

for name, rgb in test_colors:
    lab = rgb_to_lab(np.array(rgb))
    best = find_best_match_ciede2000(lab, beads)
    de = delta_e_2000(lab, best['lab'])

    if de < 3:
        status = "✅ 优秀"
    elif de < 6:
        status = "✅ 合格"
    elif de < 10:
        status = "⚠️ 偏差"
    else:
        status = "❌ 过大"

    print(f"{name:<8} ({rgb[0]:3d},{rgb[1]:3d},{rgb[2]:3d})    {best['hex']:<10} {best['name']:<12} ΔE={de:5.2f}  {status}")

# 检查色板覆盖率
print("\n" + "=" * 70)
print("色板覆盖率分析")
print("=" * 70)
bad_matches = 0
for name, rgb in test_colors:
    lab = rgb_to_lab(np.array(rgb))
    best = find_best_match_ciede2000(lab, beads)
    de = delta_e_2000(lab, best['lab'])
    if de > 10:
        bad_matches += 1
        print(f"  ❌ {name}: ΔE={de:.2f} — 无接近色号，最近匹配={best['name']}({best['hex']})")

if bad_matches == 0:
    print("  ✅ 所有测试颜色都有合格匹配 (ΔE<10)")

# 测试 K-Means 中心映射
print("\n" + "=" * 70)
print("K-Means 中心映射测试")
print("=" * 70)
test_centers = np.array([
    [255, 200, 150],  # 肤色中心
    [30, 30, 30],     # 暗色中心
    [200, 50, 50],    # 红色中心
    [50, 150, 200],   # 蓝色中心
])
results = match_centers_to_beads(test_centers, beads)
for i, (center, result) in enumerate(zip(test_centers, results)):
    print(f"  中心{i+1} RGB({center[0]:.0f},{center[1]:.0f},{center[2]:.0f}) → {result['name']} ({result['hex']})")

print("\n完成！分析：")
print("1. 哪些颜色找不到合格匹配？")
print("2. ΔE>10 的颜色应该如何处理？")
print("3. 色板是否缺少某些关键色系？")
