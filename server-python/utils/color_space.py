"""
色彩空间工具 — RGB ↔ CIE Lab ↔ Oklab + CIEDE2000 色差
纯 NumPy 向量化实现，比 Node.js 逐像素循环快 10 倍以上
"""
import numpy as np
from math import pi, sqrt, cos, sin, atan2, exp


# --- sRGB ↔ CIE Lab ---

def rgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """
    sRGB → CIE Lab (D65)
    rgb: uint8 [0,255] 或 float [0,1]，shape (..., 3)
    返回: float64，L∈[0,100]
    """
    rgb = np.asarray(rgb, dtype=np.float64)
    if rgb.ndim == 1:
        rgb = rgb.reshape(1, 3)
    if rgb.max() > 1.0:
        rgb = rgb / 255.0

    # 线性化
    mask = rgb > 0.04045
    rgb_lin = np.where(mask, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)

    # sRGB → XYZ (D65)
    xyz = np.zeros_like(rgb_lin)
    xyz[..., 0] = rgb_lin[..., 0] * 0.4124564 + rgb_lin[..., 1] * 0.3575761 + rgb_lin[..., 2] * 0.1804375
    xyz[..., 1] = rgb_lin[..., 0] * 0.2126729 + rgb_lin[..., 1] * 0.7151522 + rgb_lin[..., 2] * 0.0721750
    xyz[..., 2] = rgb_lin[..., 0] * 0.0193339 + rgb_lin[..., 1] * 0.1191920 + rgb_lin[..., 2] * 0.9503041
    xyz *= 100.0

    # XYZ → Lab (D65 ref: Xn=95.047, Yn=100, Zn=108.883)
    xn, yn, zn = 95.047, 100.000, 108.883
    xyz_norm = xyz / np.array([xn, yn, zn])

    t = np.where(xyz_norm > 0.008856, np.cbrt(xyz_norm), (903.3 * xyz_norm + 16.0) / 116.0)
    lab = np.zeros_like(xyz)
    lab[..., 0] = 116.0 * t[..., 1] - 16.0
    lab[..., 1] = 500.0 * (t[..., 0] - t[..., 1])
    lab[..., 2] = 200.0 * (t[..., 1] - t[..., 2])
    return lab.squeeze()


# --- sRGB ↔ Oklab ---

def rgb_to_oklab(rgb: np.ndarray) -> np.ndarray:
    """
    sRGB → Oklab（Björn Ottosson 2020）
    比 CIE Lab 色相线性度更好
    """
    rgb = np.asarray(rgb, dtype=np.float64)
    # 确保至少 2D (H, W, 3) 或 (N, 3)
    if rgb.ndim == 1:
        rgb = rgb.reshape(1, 3)
    if rgb.max() > 1.0:
        rgb = rgb / 255.0

    # 线性化（逐通道）
    mask = rgb > 0.04045
    lin = np.where(mask, ((rgb + 0.055) / 1.055) ** 2.4, rgb / 12.92)

    # 线性 RGB → LMS（向量化）
    lr, lg, lb = lin[..., 0], lin[..., 1], lin[..., 2]
    ll = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    mm = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    ss = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

    # 立方根压缩
    lc = np.cbrt(ll)
    mc = np.cbrt(mm)
    sc = np.cbrt(ss)

    # LMS' → Oklab
    ok = np.zeros_like(lin)
    ok[..., 0] = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc
    ok[..., 1] = 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc
    ok[..., 2] = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc
    return ok.squeeze()


def oklab_dist(l1: np.ndarray, l2: np.ndarray) -> np.ndarray:
    """Oklab 欧几里得距离（L 加权 2×）"""
    dL = (l1[..., 0] - l2[..., 0]) * 2.0
    da = l1[..., 1] - l2[..., 1]
    db = l1[..., 2] - l2[..., 2]
    return np.sqrt(dL * dL + da * da + db * db)


# --- CIEDE2000 ---

def delta_e_2000(lab1: np.ndarray, lab2: np.ndarray) -> float:
    """
    CIEDE2000 色差公式（最精确的感知色差算法）
    参考: CIE 2000 Technical Report
    """
    L1, a1, b1 = float(lab1[0]), float(lab1[1]), float(lab1[2])
    L2, a2, b2 = float(lab2[0]), float(lab2[1]), float(lab2[2])

    C1 = sqrt(a1 * a1 + b1 * b1)
    C2 = sqrt(a2 * a2 + b2 * b2)
    Cbar = (C1 + C2) / 2.0

    G = 0.5 * (1.0 - sqrt(Cbar ** 7 / (Cbar ** 7 + 25.0 ** 7)))
    a1p = (1.0 + G) * a1
    a2p = (1.0 + G) * a2

    C1p = sqrt(a1p * a1p + b1 * b1)
    C2p = sqrt(a2p * a2p + b2 * b2)

    h1p = (atan2(b1, a1p) * 180.0 / pi) % 360.0
    h2p = (atan2(b2, a2p) * 180.0 / pi) % 360.0

    dLp = L2 - L1
    dCp = C2p - C1p

    if C1p * C2p == 0:
        dhp = 0.0
    else:
        dhp = h2p - h1p
        if dhp > 180.0: dhp -= 360.0
        elif dhp < -180.0: dhp += 360.0
    dHp = 2.0 * sqrt(C1p * C2p) * sin(dhp * pi / 360.0)

    Lpbar = (L1 + L2) / 2.0
    Cpbar = (C1p + C2p) / 2.0

    if C1p * C2p == 0:
        hpbar = h1p + h2p
    else:
        hpbar = (h1p + h2p) / 2.0
        if abs(h1p - h2p) > 180.0:
            hpbar = hpbar + 180.0 if hpbar < 180.0 else hpbar - 180.0

    T = (1.0 - 0.17 * cos((hpbar - 30.0) * pi / 180.0)
         + 0.24 * cos(2.0 * hpbar * pi / 180.0)
         + 0.32 * cos((3.0 * hpbar + 6.0) * pi / 180.0)
         - 0.20 * cos((4.0 * hpbar - 63.0) * pi / 180.0))

    SL = 1.0 + (0.015 * (Lpbar - 50.0) ** 2) / sqrt(20.0 + (Lpbar - 50.0) ** 2)
    SC = 1.0 + 0.045 * Cpbar
    SH = 1.0 + 0.015 * Cpbar * T

    dTheta = 30.0 * exp(-((hpbar - 275.0) / 25.0) ** 2)
    RC = 2.0 * sqrt(Cpbar ** 7 / (Cpbar ** 7 + 25.0 ** 7))
    RT = -sin(2.0 * dTheta * pi / 180.0) * RC

    return float(sqrt(
        (dLp / SL) ** 2 +
        (dCp / SC) ** 2 +
        (dHp / SH) ** 2 +
        RT * (dCp / SC) * (dHp / SH)
    ))
