"""图片转像素图质量测试套件"""
import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')

import cv2
import numpy as np
import time
from collections import Counter
from routes.convert import _image_to_grid
from db.connection import get_db
from services.color_match import load_bead_colors


def create_test_image(w=512, h=512):
    """创建一个测试图像，包含多种颜色区域模拟真实场景"""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    # 蓝色天空背景
    img[:h//2, :] = [135, 206, 235]  # 浅蓝 (RGB)
    # 绿色地面
    img[h//2:, :] = [144, 238, 144]  # 浅绿 (RGB)
    # 红色矩形（模拟人物衣物）
    img[h//4:3*h//4, w//4:3*w//4] = [255, 80, 80]  # RGB
    # 肤色椭圆（模拟人脸）
    cv2.ellipse(img, (w//2, h//3), (w//8, h//6), 0, 0, 360, [255, 200, 150], -1)  # RGB
    # 深色小矩形（模拟眼睛/五官）
    img[h//3-10:h//3, w//2-20:w//2-5] = [30, 30, 30]
    img[h//3-10:h//3, w//2+5:w//2+20] = [30, 30, 30]
    # 白色文字区域
    cv2.putText(img, 'TEST', (w//2-40, h-20), cv2.FONT_HERSHEY_SIMPLEX, 0.8, [255, 255, 255], 2)
    return img


def analyze_grid(grid, label=""):
    """分析网格颜色分布"""
    colors = set()
    hex_counts = Counter()
    total = 0
    none_count = 0

    for row in grid:
        for cell in row:
            if cell and 'hex' in cell:
                colors.add(cell['hex'])
                hex_counts[cell['hex']] += 1
                total += 1
            elif cell is None:
                none_count += 1

    top_colors = hex_counts.most_common(5)
    return {
        'label': label,
        'unique_colors': len(colors),
        'total_beads': total,
        'none_count': none_count,
        'top5': top_colors,
        'max_single_ratio': top_colors[0][1] / max(total, 1) * 100 if top_colors else 0,
    }


def test_all_combinations():
    """测试不同参数组合"""
    img = create_test_image(512, 512)

    # 保存测试原图
    cv2.imwrite('/Users/h/first-cc/server-python/scripts/test_input.png',
                cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    print("测试原图已保存到 scripts/test_input.png")

    test_cases = [
        {"name": "基准(无智能优化)", "smartOptimize": False},
        {"name": "智能优化全开", "smartOptimize": True, "bgUnify": True, "skinUnify": True, "bgMode": "auto"},
        {"name": "仅背景统一", "smartOptimize": True, "bgUnify": True, "skinUnify": False},
        {"name": "仅肤色统一", "smartOptimize": True, "bgUnify": False, "skinUnify": True},
        {"name": "透明背景", "smartOptimize": True, "bgUnify": True, "bgMode": "transparent"},
        {"name": "自定义背景白", "smartOptimize": True, "bgUnify": True, "bgMode": "custom", "bgColor": "#FFFFFF"},
        {"name": "无降噪(denoise=0)", "smartOptimize": False, "denoiseLevel": 0},
        {"name": "强降噪(denoise=3)", "smartOptimize": False, "denoiseLevel": 3},
        {"name": "智能关+纯色背景指定", "smartOptimize": False, "bgUnify": False, "bgMode": "transparent"},
    ]

    results = []

    for tc in test_cases:
        opts = {
            'smartOptimize': tc.get('smartOptimize', False),
            'bgUnify': tc.get('bgUnify', False),
            'bgMode': tc.get('bgMode', 'auto'),
            'bgColor': tc.get('bgColor', '#FFFFFF'),
            'skinUnify': tc.get('skinUnify', False),
            'skinSmoothLevel': tc.get('skinSmoothLevel', 'medium'),
            'skinLayerCount': 3,
            'ocrEnhance': False,
            'denoiseLevel': tc.get('denoiseLevel', 2),
            'colorLimit': 16,
            'prefilter': True,
            'crisp': False,
        }

        t0 = time.time()
        try:
            print(f"\n{'='*60}")
            print(f">>> 开始测试: {tc['name']}")

            result = _image_to_grid(img.copy(), 58, 58, None, opts)
            elapsed = time.time() - t0

            # 分析结果质量
            grid = result['grid']
            analysis = analyze_grid(grid, tc['name'])

            print(f"\n--- 结果分析 ---")
            print(f"耗时: {elapsed:.2f}s (各阶段: {result.get('stageTimes', {})})")
            print(f"颜色数: {analysis['unique_colors']} (共{analysis['total_beads']}珠, 透明{analysis['none_count']})")
            print(f"Top5颜色: {[(h, c) for h, c in analysis['top5']]}")

            # 质量检查
            if analysis['unique_colors'] <= 2:
                print(f"  ⚠️⚠️ 严重问题: 只有{analysis['unique_colors']}种颜色！整图塌缩！")
            elif analysis['unique_colors'] <= 5:
                print(f"  ⚠️ 颜色较少: {analysis['unique_colors']}种")
            else:
                print(f"  ✅ 颜色数量正常 ({analysis['unique_colors']}种)")

            if analysis['max_single_ratio'] > 80 and analysis['unique_colors'] <= 5:
                print(f"  ⚠️ 单一颜色占比过高: {analysis['max_single_ratio']:.1f}%")

            results.append({
                'name': tc['name'],
                'elapsed': elapsed,
                'analysis': analysis,
                'stage_times': result.get('stageTimes', {}),
                'success': True,
            })

        except Exception as e:
            print(f"\n❌ 失败: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                'name': tc['name'],
                'elapsed': time.time() - t0,
                'analysis': None,
                'stage_times': {},
                'success': False,
                'error': str(e),
            })

    # ==========================================
    # 汇总报告
    # ==========================================
    print(f"\n\n{'='*60}")
    print(f"{'='*60}")
    print(f"  汇总报告")
    print(f"{'='*60}")
    print(f"{'='*60}")

    print(f"\n{'测试名称':<24} {'成功':<6} {'耗时':>8} {'颜色数':>6} {'单一比例':>8} {'评估'}")
    print("-" * 80)

    for r in results:
        name = r['name'][:22]
        success = "✅" if r['success'] else "❌"
        elapsed = f"{r['elapsed']:.2f}s"
        if r['analysis']:
            n_colors = r['analysis']['unique_colors']
            ratio = f"{r['analysis']['max_single_ratio']:.1f}%"
            if n_colors <= 2:
                grade = "🔴 塌缩"
            elif n_colors <= 5:
                grade = "🟡 偏少"
            else:
                grade = "🟢 正常"
        else:
            n_colors = "-"
            ratio = "-"
            grade = "💥 异常"
        print(f"{name:<24} {success:<6} {elapsed:>8} {str(n_colors):>6} {ratio:>8} {grade}")

    # 找颜色塌缩的组合
    collapsed = [r for r in results if r['analysis'] and r['analysis']['unique_colors'] <= 3]
    if collapsed:
        print(f"\n⚠️ 颜色塌缩（≤3色）的情况: {len(collapsed)}个")
        for r in collapsed:
            print(f"  - {r['name']}: {r['analysis']['unique_colors']}色")

    print("\n测试完成！")


if __name__ == '__main__':
    test_all_combinations()
