import sys
sys.path.insert(0, '/Users/h/first-cc/server-python')
import cv2, numpy as np
from services.segmentation import segment_background

def make_centered_subject(w=400, h=400):
    """居中主体：白色背景 + 中心彩色圆"""
    img = np.ones((h, w, 3), dtype=np.uint8) * 240  # 浅灰背景
    cv2.circle(img, (w//2, h//2), 80, [220, 170, 140], -1)  # 肤色圆(主体)
    return img

def make_off_center(w=400, h=400):
    """偏左主体：白色背景 + 左侧彩色圆"""
    img = np.ones((h, w, 3), dtype=np.uint8) * 240
    cv2.circle(img, (80, h//2), 80, [220, 170, 140], -1)
    return img

def make_colorful(w=400, h=400):
    """彩色图像：多种颜色，没有明显单一背景"""
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[:200] = [200, 100, 100]  # 红色上半
    img[200:] = [100, 200, 100]  # 绿色下半
    cv2.circle(img, (w//2, h//2), 60, [100, 100, 200], -1)  # 蓝色圆
    return img

def make_white_subject(w=400, h=400):
    """白色主体：白色背景 + 白色矩形（难以区分）"""
    img = np.ones((h, w, 3), dtype=np.uint8) * 250  # 近白背景
    cv2.rectangle(img, (w//4, h//4), (3*w//4, 3*h//4), [240, 238, 235], -1)  # 白色矩形
    return img

def evaluate(name, img):
    fg, bg = segment_background(img)
    bg_pct = (bg > 128).sum() / bg.size * 100
    fg_pct = (fg > 128).sum() / fg.size * 100

    # 评估：真实背景占比（基于我们对测试图像的了解）
    if '居中' in name:
        expected_bg = 100 - (80**2 * 3.14159) / (400*400) * 100  # 约87%
        error = abs(bg_pct - expected_bg)
        status = '✅' if error < 15 else '⚠️' if error < 30 else '❌'
    elif '偏左' in name:
        expected_bg = 100 - (80**2 * 3.14159) / (400*400) * 100  # 约87%
        error = abs(bg_pct - expected_bg)
        status = '✅' if error < 15 else '⚠️' if error < 30 else '❌'
    elif '彩色' in name:
        # 彩色图像，不应该有大量"背景"
        status = '✅' if bg_pct < 50 else '⚠️' if bg_pct < 70 else '❌'
        error = bg_pct
    elif '白色' in name:
        # 白色主体在白色背景上，分割困难
        status = '⚠️'  # 预期效果不佳
        error = None
    else:
        status = '?'
        error = None

    print(f"  {status} {name}: 背景{bg_pct:.1f}% 前景{fg_pct:.1f}%", end='')
    if error is not None:
        print(f" (误差{error:.1f}%)")
    else:
        print()

print("=" * 60)
print("语义分割准确度测试")
print("=" * 60)

tests = [
    ("居中主体", make_centered_subject()),
    ("偏左主体", make_off_center()),
    ("彩色图像", make_colorful()),
    ("白色主体", make_white_subject()),
]

for name, img in tests:
    evaluate(name, img)

print("\n分析：")
print("1. 居中主体分割是否准确？")
print("2. 偏左主体是否因GrabCut固定中心矩形而失败？")
print("3. 彩色图像是否被错误地大面积判为背景？")
print("4. 白色主体在白色背景上是否完全无法区分？")
