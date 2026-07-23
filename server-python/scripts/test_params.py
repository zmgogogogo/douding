"""
逐个测试每个智能优化参数的独立效果。
"""
import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')
import cv2, numpy as np, time
from routes.convert import _image_to_grid


def make_test_img():
    """生成一张包含多种特征区域的400×400测试图"""
    img = np.zeros((400, 400, 3), dtype=np.uint8)
    img[:200] = [200, 220, 240]  # 浅蓝背景
    img[200:] = [100, 160, 80]   # 绿色
    cv2.circle(img, (200, 150), 60, [220, 170, 140], -1)   # 肤色圆
    cv2.circle(img, (200, 150), 12, [30, 30, 30], -1)      # 眼睛
    cv2.rectangle(img, (120, 300), (280, 380), [220, 60, 50], -1)  # 红色块
    return img


img = make_test_img()

# 基准默认选项（与路由默认值一致）
base_opts = {
    'smartOptimize': False, 'bgUnify': False, 'bgMode': 'auto',
    'skinUnify': False, 'skinSmoothLevel': 'medium', 'skinLayerCount': 3,
    'denoiseLevel': 2, 'colorLimit': 16,
    'prefilter': True, 'crisp': False, 'ocrEnhance': False,
}

tests = [
    # (名称, opts)
    ("基准(全关)",  {'smartOptimize': False}),
    ("仅智能优化(无分区)", {'smartOptimize': True, 'bgUnify': False, 'skinUnify': False}),
    ("仅背景统一(auto)", {'smartOptimize': True, 'bgUnify': True, 'bgMode': 'auto', 'skinUnify': False}),
    ("仅背景统一(custom白)", {'smartOptimize': True, 'bgUnify': True, 'bgMode': 'custom', 'bgColor': '#FFFFFF', 'skinUnify': False}),
    ("仅背景统一(transparent)", {'smartOptimize': True, 'bgUnify': True, 'bgMode': 'transparent', 'skinUnify': False}),
    ("仅背景统一(keep)", {'smartOptimize': True, 'bgUnify': True, 'bgMode': 'keep', 'skinUnify': False}),
    ("仅肤色统一(light)", {'smartOptimize': True, 'bgUnify': False, 'skinUnify': True, 'skinSmoothLevel': 'light'}),
    ("仅肤色统一(medium)", {'smartOptimize': True, 'bgUnify': False, 'skinUnify': True, 'skinSmoothLevel': 'medium'}),
    ("仅肤色统一(heavy)", {'smartOptimize': True, 'bgUnify': False, 'skinUnify': True, 'skinSmoothLevel': 'heavy'}),
    ("肤色层数2", {'smartOptimize': True, 'bgUnify': True, 'skinUnify': True, 'skinLayerCount': 2}),
    ("肤色层数4", {'smartOptimize': True, 'bgUnify': True, 'skinUnify': True, 'skinLayerCount': 4}),
    ("无降噪(0)", {'smartOptimize': False, 'denoiseLevel': 0}),
    ("轻降噪(1)", {'smartOptimize': False, 'denoiseLevel': 1}),
    ("中降噪(2)", {'smartOptimize': False, 'denoiseLevel': 2}),
    ("强降噪(3)", {'smartOptimize': False, 'denoiseLevel': 3}),
    ("颜色限制4", {'smartOptimize': False, 'colorLimit': 4}),
    ("颜色限制8", {'smartOptimize': False, 'colorLimit': 8}),
    ("颜色限制16", {'smartOptimize': False, 'colorLimit': 16}),
    ("颜色限制32", {'smartOptimize': False, 'colorLimit': 32}),
    ("颜色限制64", {'smartOptimize': False, 'colorLimit': 64}),
    ("全开(默认)", {'smartOptimize': True, 'bgUnify': True, 'bgMode': 'auto', 'skinUnify': True, 'skinSmoothLevel': 'medium', 'skinLayerCount': 3, 'denoiseLevel': 2, 'colorLimit': 16}),
]

print("=" * 75)
print("参数隔离测试 — 逐个测试每个智能优化参数的独立效果")
print("=" * 75)

results = []

for name, opts_override in tests:
    opts = {**base_opts, **opts_override}

    t0 = time.time()
    try:
        result = _image_to_grid(img.copy(), 58, 58, None, opts)
        elapsed = time.time() - t0
        grid = result['grid']
        colors = set()
        bead_count = 0
        transparent = 0
        for row in grid:
            for cell in row:
                if cell is None:
                    transparent += 1
                elif 'hex' in cell:
                    colors.add(cell['hex'])
                    bead_count += 1

        total = len(grid) * len(grid[0]) if grid else 0
        status = "✅" if len(colors) >= 6 else ("⚠️" if len(colors) >= 3 else "❌")

        # 收集统计信息
        qs = result.get('quantizeStats', {})
        pps = result.get('postProcessStats', {})

        print(f"  {status} {name}: {len(colors)}色, {bead_count}珠"
              f"{', 透明' + str(transparent) if transparent else ''}, {elapsed:.2f}s"
              f"  | 量化:{qs.get('total_colors', '?')}色"
              f"  后处理:{pps.get('removed', 0)}去除/{pps.get('filled', 0)}填充")

        results.append({
            'name': name,
            'colors': len(colors),
            'bead_count': bead_count,
            'transparent': transparent,
            'elapsed': elapsed,
            'quant_colors': qs.get('total_colors', 0),
            'post_removed': pps.get('removed', 0),
            'post_filled': pps.get('filled', 0),
        })
    except Exception as e:
        import traceback
        print(f"  ❌ {name}: 异常 - {e}")
        traceback.print_exc()

print()
print("=" * 75)
print("分析总结")
print("=" * 75)

# 分析1：denoiseLevel 变化
denoise_tests = [r for r in results if '降噪' in r['name'] or r['name'] == '基准(全关)']
print("\n1. denoiseLevel 降噪效果（后处理去除像素数）:")
for r in sorted(denoise_tests, key=lambda x: x['name']):
    print(f"   {r['name']:20s} → 后处理去除{r['post_removed']}像素, 填充{r['post_filled']}像素")

# 分析2：colorLimit 变化
cl_tests = [r for r in results if '颜色限制' in r['name'] or r['name'] == '基准(全关)']
print("\n2. colorLimit 颜色限制效果:")
for r in sorted(cl_tests, key=lambda x: r['name']):
    print(f"   {r['name']:20s} → {r['colors']}色 (量化K值={r['quant_colors']})")

# 分析3：背景统一模式
bg_tests = [r for r in results if '背景统一' in r['name'] or r['name'] == '基准(全关)']
print("\n3. 背景统一模式:")
for r in sorted(bg_tests, key=lambda x: x['name']):
    trans = f", 透明{r['transparent']}像素" if r['transparent'] else ""
    print(f"   {r['name']:30s} → {r['colors']}色{trans}")

# 分析4：肤色统一
skin_tests = [r for r in results if '肤色统一' in r['name'] or r['name'] == '基准(全关)']
print("\n4. 肤色统一强度:")
for r in sorted(skin_tests, key=lambda x: x['name']):
    print(f"   {r['name']:30s} → {r['colors']}色")

print("\n完成！请分析以上各参数的独立效果。")
