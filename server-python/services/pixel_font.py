"""
像素字体替换模块（文档4.3 可选优化）
识别文字后用标准 5×7 像素字体重新渲染，完全替代原图文字
"""
import cv2
import numpy as np

# ============================================
#  5×7 像素字体（宽×高）
#  每个字符 5 列 × 7 行，每行 1 字节（bit0=最左列）
# ============================================
FONT_CHAR_WIDTH = 5
FONT_CHAR_HEIGHT = 7
FONT_SPACING = 1  # 字符间距

PIXEL_FONT = {
    # 大写字母
    'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
    'C': [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    'D': [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100],
    'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
    'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
    'G': [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
    'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'I': [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    'J': [0b00111, 0b00001, 0b00001, 0b00001, 0b10001, 0b10001, 0b01110],
    'K': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
    'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
    'M': [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
    'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
    'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
    'Q': [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
    'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
    'S': [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
    'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'V': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
    'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
    'X': [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
    'Y': [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
    'Z': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
    # 数字
    '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
    '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
    '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
    '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
    '4': [0b10001, 0b10001, 0b10001, 0b11111, 0b00001, 0b00001, 0b00001],
    '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
    '6': [0b01110, 0b10001, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
    '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
    '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
    '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b10001, 0b01110],
    # 符号
    ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
    '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100],
    ',': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b01000],
    '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
    '?': [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0b00000, 0b00100],
    '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
    ':': [0b00000, 0b00100, 0b00000, 0b00000, 0b00000, 0b00100, 0b00000],
    '\'':[0b00100, 0b00100, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
    '"': [0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
    '#': [0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b00000, 0b00000],
    '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b00000, 0b00000],
    '(': [0b00010, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00010],
    ')': [0b01000, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01000],
    '+': [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
}


def render_pixel_text(
    text: str,
    color_rgb: tuple = (0, 0, 0)
) -> np.ndarray:
    """
    用 5×7 像素字体渲染文字为图像

    Args:
        text: 要渲染的文字（ASCII）
        color_rgb: 文字颜色 (R, G, B)，默认黑色

    Returns:
        H×W×3 RGB uint8 图像
        透明区域用 color_rgb 的反色填充（白底黑字或黑底白字）
    """
    text = text.upper()
    # 过滤不可渲染字符
    chars = [ch for ch in text if ch in PIXEL_FONT]
    if not chars:
        return np.zeros((FONT_CHAR_HEIGHT, FONT_CHAR_WIDTH, 3), dtype=np.uint8)

    width = len(chars) * (FONT_CHAR_WIDTH + FONT_SPACING) - FONT_SPACING
    height = FONT_CHAR_HEIGHT

    # 背景色（与文字色形成对比）
    bg_rgb = tuple(255 - c for c in color_rgb)

    canvas = np.full((height, width, 3), bg_rgb, dtype=np.uint8)

    for i, ch in enumerate(chars):
        bits = PIXEL_FONT[ch]
        x0 = i * (FONT_CHAR_WIDTH + FONT_SPACING)
        for row in range(FONT_CHAR_HEIGHT):
            for col in range(FONT_CHAR_WIDTH):
                # MSB = 最左列
                if bits[row] & (1 << (FONT_CHAR_WIDTH - 1 - col)):
                    canvas[row, x0 + col] = color_rgb

    return canvas


def replace_text_with_pixel_font(
    image: np.ndarray,
    text_regions: list[dict],
) -> np.ndarray:
    """
    将检测到的文字区域替换为像素字体渲染

    对每个文字区域：
    1. 用像素字体渲染识别出的文字内容
    2. 缩放到原文字区域大小（最近邻保持像素风格）
    3. 替换原图像素

    Args:
        image: RGB 图像 (H, W, 3)
        text_regions: OCR 检测结果 [{bbox, text, confidence}, ...]

    Returns:
        替换后的图像
    """
    result = image.copy()
    h, w = image.shape[:2]

    for region in text_regions:
        text = region.get('text', '').strip()
        if not text:
            continue

        x, y, rw, rh = region['bbox']
        # 边界检查
        x, y = max(0, x), max(0, y)
        rw, rh = min(w - x, rw), min(h - y, rh)

        if rw < FONT_CHAR_WIDTH or rh < FONT_CHAR_HEIGHT:
            continue

        # 1. 渲染像素文字
        rendered = render_pixel_text(text, color_rgb=(0, 0, 0))

        # 2. 计算缩放（保持像素风格 + 比例）
        font_w = rendered.shape[1]
        font_h = FONT_CHAR_HEIGHT
        scale = min(rw / font_w, rh / font_h)

        new_w = int(font_w * scale)
        new_h = int(font_h * scale)

        if new_w < 2 or new_h < 2:
            continue

        scaled = cv2.resize(rendered, (new_w, new_h), interpolation=cv2.INTER_NEAREST)

        # 3. 居中放置
        ox = x + (rw - new_w) // 2
        oy = y + (rh - new_h) // 2
        ox, oy = max(0, ox), max(0, oy)
        pw = min(new_w, w - ox)
        ph = min(new_h, h - oy)

        if pw > 0 and ph > 0:
            result[oy:oy + ph, ox:ox + pw] = scaled[:ph, :pw]

    return result
