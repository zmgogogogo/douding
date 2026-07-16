// ============================================
//  色彩空间工具 — RGB ↔ CIE Lab 转换
// ============================================

/** sRGB → CIE Lab（感知均匀色彩空间） */
export function rgbToLab(r, g, b) {
  // sRGB 线性化
  const linearize = v => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92 }
  const rl = linearize(r), gl = linearize(g), bl = linearize(b)
  // sRGB → XYZ (D65)
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) * 100
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) * 100
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) * 100
  // XYZ → Lab (D65)
  const xn = 95.047, yn = 100.000, zn = 108.883
  const f = t => t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116
  const fy = f(y / yn)
  return {
    L: Math.max(0, 116 * fy - 16),
    a: 500 * (f(x / xn) - fy),
    b: 200 * (fy - f(z / zn))
  }
}

/** Lab ΔE 距离（CIE76 感知均匀） */
export function deltaE(l1, l2) {
  return Math.sqrt((l1.L - l2.L) ** 2 + (l1.a - l2.a) ** 2 + (l1.b - l2.b) ** 2)
}

/** 钳位到 [0, 255] */
export function clamp(v) {
  return Math.max(0, Math.min(255, v))
}

// ============================================
//  Oklab 色彩空间（Björn Ottosson 2020）
//  比 CIE Lab 色相线性度更好，距离更符合人眼感知
//  参考：https://bottosson.github.io/posts/oklab/
// ============================================

/** sRGB → 线性 sRGB */
function srgbToLinear(v) {
  v /= 255
  return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
}

/** RGB → Oklab（感知均匀色彩空间） */
export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b)
  // 线性 RGB → LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  // 立方根压缩
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s)
  // LMS' → Oklab
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  }
}

/** Oklab 欧几里得距离（感知均匀，L 加权 2× 优先保证亮度正确） */
export function oklabDist(l1, l2) {
  const dL = (l1.L - l2.L) * 2  // L 通道 2× 权重：亮度正确 > 色度正确
  const da = l1.a - l2.a, db = l1.b - l2.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

// ============================================
//  CIEDE2000 色差公式 — 当前最精确的感知色差算法
//  参考：CIE 2000 Technical Report
//  被 beadot、Pixelbead 等竞品采用
// ============================================

/** 角度转弧度 */
function toRad(deg) { return deg * Math.PI / 180 }

/** 弧度转角度 */
function toDeg(rad) { return rad * 180 / Math.PI }

/**
 * CIEDE2000 色差计算
 * 比 CIE76 和 CIE94 更精确，尤其对蓝色和灰色区域感知更好
 * @param {object} lab1 - {L, a, b}
 * @param {object} lab2 - {L, a, b}
 * @returns {number} ΔE00 值
 */
export function deltaE2000(lab1, lab2) {
  const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b
  const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b

  // 1. 计算 C'（色度）和 h'（色相角）
  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)
  const Cbar = (C1 + C2) / 2

  // G 因子：修正蓝色区域色相角非线性
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2

  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  // 色相角
  let h1p = toDeg(Math.atan2(b1, a1p))
  if (h1p < 0) h1p += 360
  let h2p = toDeg(Math.atan2(b2, a2p))
  if (h2p < 0) h2p += 360

  // 2. ΔL', ΔC', ΔH'
  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp
  if (C1p * C2p === 0) {
    dhp = 0
  } else {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(toRad(dhp) / 2)

  // 3. 计算权重因子 SL, SC, SH
  const Lpbar = (L1 + L2) / 2
  const Cpbar = (C1p + C2p) / 2

  let hpbar
  if (C1p * C2p === 0) {
    hpbar = h1p + h2p
  } else {
    hpbar = (h1p + h2p) / 2
    if (Math.abs(h1p - h2p) > 180) {
      if (h1p + h2p < 360) hpbar += 180
      else hpbar -= 180
    }
  }

  const T = 1 - 0.17 * Math.cos(toRad(hpbar - 30)) + 0.24 * Math.cos(toRad(2 * hpbar))
    + 0.32 * Math.cos(toRad(3 * hpbar + 6)) - 0.20 * Math.cos(toRad(4 * hpbar - 63))

  const SL = 1 + (0.015 * Math.pow(Lpbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lpbar - 50, 2))
  const SC = 1 + 0.045 * Cpbar
  const SH = 1 + 0.015 * Cpbar * T

  // 4. 旋转因子 RT
  const dTheta = 30 * Math.exp(-Math.pow((hpbar - 275) / 25, 2))
  const RC = 2 * Math.sqrt(Math.pow(Cpbar, 7) / (Math.pow(Cpbar, 7) + Math.pow(25, 7)))
  const RT = -Math.sin(toRad(2 * dTheta)) * RC

  // 5. 计算最终 ΔE00
  const kL = 1, kC = 1, kH = 1  // 标准参考条件
  const dE = Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  )

  return dE
}

/**
 * RGB → CIEDE2000 色差（便捷函数）
 * 直接传入两个 RGB 颜色，返回 ΔE00 值
 */
export function rgbDeltaE2000(r1, g1, b1, r2, g2, b2) {
  const lab1 = rgbToLab(r1, g1, b1)
  const lab2 = rgbToLab(r2, g2, b2)
  return deltaE2000(lab1, lab2)
}
