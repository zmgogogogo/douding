"""测试不同类型的图片在 smartOptimize 开关下的效果差异"""
import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')
import cv2
import numpy as np
import time
from routes.convert import _image_to_grid


def make_photo_like():
    """模拟真实照片：渐变背景+肤色+多种颜色"""
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    # 天空渐变
    for y in range(256):
        img[y, :] = [min(255, 100+y//3), min(255, 150+y//4), 200+y//5]
    # 绿色地面
    img[256:, :] = [80, 140, 60]
    # 肤色椭圆(人脸)
    cv2.ellipse(img, (256, 160), (80, 100), 0, 0, 360, [210, 160, 130], -1)
    # 深色眼睛
    cv2.circle(img, (230, 140), 10, [30, 30, 30], -1)
    cv2.circle(img, (282, 140), 10, [30, 30, 30], -1)
    # 红色嘴巴
    cv2.ellipse(img, (256, 190), (25, 12), 0, 0, 360, [180, 60, 60], -1)
    # 蓝色衣服
    img[300:, 128:384] = [200, 70, 40]
    # 白色文字
    cv2.putText(img, 'HELLO', (176, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.8, [255, 255, 255], 2)
    return img


def make_anime_like():
    """模拟动漫图片：大面积纯色+锐利边缘"""
    img = np.ones((512, 512, 3), dtype=np.uint8) * 255  # 白色背景
    # 粉色头发
    cv2.ellipse(img, (256, 100), (120, 80), 0, 0, 360, [200, 140, 220], -1)
    # 肤色脸
    cv2.ellipse(img, (256, 200), (70, 80), 0, 0, 360, [240, 200, 170], -1)
    # 大眼睛
    cv2.circle(img, (220, 180), 20, [255, 255, 255], -1)  # 眼白
    cv2.circle(img, (290, 180), 20, [255, 255, 255], -1)
    cv2.circle(img, (220, 180), 10, [20, 40, 180], -1)  # 蓝瞳孔
    cv2.circle(img, (290, 180), 10, [20, 40, 180], -1)
    # 嘴巴
    cv2.ellipse(img, (256, 230), (15, 8), 0, 0, 360, [220, 100, 130], -1)
    # 红色蝴蝶结
    pts = np.array([[256, 280], [210, 310], [256, 340], [302, 310]], np.int32).reshape(-1, 1, 2)
    cv2.fillPoly(img, [pts], [50, 50, 220])
    return img


def test_image(name, img, smart):
    """测试单张图片在指定 smartOptimize 设置下的转换效果"""
    opts = {
        'smartOptimize': smart,
        'bgUnify': smart,
        'bgMode': 'auto',
        'bgEdgeHardness': 70,
        'skinUnify': smart,
        'skinSmoothLevel': 'medium',
        'skinLayerCount': 3,
        'denoiseLevel': 2,
        'colorLimit': 16,
        'prefilter': True,
        'crisp': False,
        'ocrEnhance': False,
    }
    t0 = time.time()
    try:
        result = _image_to_grid(img.copy(), 58, 58, None, opts)
        elapsed = time.time() - t0
        grid = result['grid']
        colors = set()
        for row in grid:
            for cell in row:
                if cell and 'hex' in cell:
                    colors.add(cell['hex'])
        print(f"\n  [{name}] smart={smart}: {len(colors)}色, {elapsed:.1f}s, 各阶段={result.get('stageTimes', {})}")
        # 质量指标
        if len(colors) <= 2:
            print(f"    ⚠️ 严重：颜色塌缩为{len(colors)}色！")
        elif len(colors) <= 5:
            print(f"    ⚠️ 颜色偏少：{len(colors)}色")
        else:
            print(f"    ✅ 颜色数正常")
        return len(colors), elapsed
    except Exception as e:
        print(f"\n  [{name}] smart={smart}: ❌ {e}")
        import traceback
        traceback.print_exc()
        return 0, 0


print("=" * 60)
print("图片类型测试：smartOptimize ON vs OFF")
print("=" * 60)

photo = make_photo_like()
anime = make_anime_like()

# 保存测试用的原图，方便人工检查
cv2.imwrite('/Users/h/first-cc/server-python/scripts/test_photo_input.png',
            cv2.cvtColor(photo, cv2.COLOR_RGB2BGR))
cv2.imwrite('/Users/h/first-cc/server-python/scripts/test_anime_input.png',
            cv2.cvtColor(anime, cv2.COLOR_RGB2BGR))
print("\n测试原图已保存到 scripts/ 目录")

results = []
for name, img in [("模拟照片", photo), ("模拟动漫", anime)]:
    for smart in [False, True]:
        c, t = test_image(name, img, smart)
        results.append((name, smart, c, t))

print("\n" + "=" * 60)
print("总结")
print("=" * 60)
for name, smart, c, t in results:
    status = "✅" if c > 5 else "⚠️" if c > 2 else "❌塌缩"
    print(f"  {status} {name} smart={smart}: {c}色 {t:.1f}s")

# 对比分析
print("\n" + "=" * 60)
print("对比分析")
print("=" * 60)

# 按图片类型分组
photo_results = [(s, c, t) for n, s, c, t in results if n == "模拟照片"]
anime_results = [(s, c, t) for n, s, c, t in results if n == "模拟动漫"]

for label, group in [("模拟照片", photo_results), ("模拟动漫", anime_results)]:
    off = next((r for r in group if not r[0]), None)
    on = next((r for r in group if r[0]), None)
    if off and on:
        delta = on[1] - off[1]
        print(f"\n  {label}:")
        print(f"    smart=False: {off[1]}色 {off[2]:.1f}s")
        print(f"    smart=True:  {on[1]}色 {on[2]:.1f}s")
        print(f"    颜色变化: {'+' if delta >= 0 else ''}{delta}色")

print("\n测试完成！")
