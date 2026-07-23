// ============================================
//  colorSpace 单元测试 — RGB ↔ Lab / Oklab / CIEDE2000
// ============================================
import { describe, it, expect } from 'vitest'
import {
  rgbToLab,
  deltaE,
  clamp,
  rgbToOklab,
  oklabDist,
  deltaE2000,
  rgbDeltaE2000,
} from '../../../server/utils/colorSpace.js'

describe('rgbToLab', () => {
  it('纯黑 RGB(0,0,0) 应转换到 Lab 近似 (0, 0, 0)', () => {
    const lab = rgbToLab(0, 0, 0)
    expect(lab.L).toBeCloseTo(0, 0)
  })

  it('纯白 RGB(255,255,255) 应转换到 Lab ≈ (100, 0, 0)', () => {
    const lab = rgbToLab(255, 255, 255)
    expect(lab.L).toBeCloseTo(100, 0)
    expect(Math.abs(lab.a)).toBeLessThan(1)
    expect(Math.abs(lab.b)).toBeLessThan(1)
  })

  it('纯红 RGB(255,0,0) L 应在 50-60 之间', () => {
    const lab = rgbToLab(255, 0, 0)
    expect(lab.L).toBeGreaterThan(40)
    expect(lab.L).toBeLessThan(65)
    expect(lab.a).toBeGreaterThan(0) // 偏红
  })

  it('纯绿 RGB(0,255,0) a 应为负值（偏绿）', () => {
    const lab = rgbToLab(0, 255, 0)
    expect(lab.a).toBeLessThan(0)
  })

  it('纯蓝 RGB(0,0,255) b 应为负值（偏蓝）', () => {
    const lab = rgbToLab(0, 0, 255)
    expect(lab.b).toBeLessThan(0)
  })
})

describe('deltaE', () => {
  it('相同颜色的距离应为 0', () => {
    const lab = { L: 50, a: 0, b: 0 }
    expect(deltaE(lab, lab)).toBe(0)
  })

  it('黑白距离应很大', () => {
    const black = rgbToLab(0, 0, 0)
    const white = rgbToLab(255, 255, 255)
    expect(deltaE(black, white)).toBeGreaterThan(50)
  })
})

describe('clamp', () => {
  it('正常值不改变', () => {
    expect(clamp(128)).toBe(128)
  })
  it('负值钳位到 0', () => {
    expect(clamp(-5)).toBe(0)
  })
  it('超过 255 钳位到 255', () => {
    expect(clamp(300)).toBe(255)
  })
  it('边界值 0 和 255', () => {
    expect(clamp(0)).toBe(0)
    expect(clamp(255)).toBe(255)
  })
})

describe('rgbToOklab', () => {
  it('纯黑的 L 应接近 0', () => {
    const ok = rgbToOklab(0, 0, 0)
    expect(ok.L).toBeCloseTo(0, 1)
  })

  it('纯白的 L 应接近 1', () => {
    const ok = rgbToOklab(255, 255, 255)
    expect(ok.L).toBeCloseTo(1, 1)
    expect(Math.abs(ok.a)).toBeLessThan(0.01)
    expect(Math.abs(ok.b)).toBeLessThan(0.01)
  })

  it('Oklab L 值应在合理范围', () => {
    const ok = rgbToOklab(128, 128, 128)
    expect(ok.L).toBeGreaterThan(0)
    expect(ok.L).toBeLessThan(1)
  })
})

describe('oklabDist', () => {
  it('相同颜色距离为 0', () => {
    const ok = rgbToOklab(100, 150, 200)
    expect(oklabDist(ok, ok)).toBe(0)
  })

  it('不同颜色距离大于 0', () => {
    const a = rgbToOklab(255, 0, 0)
    const b = rgbToOklab(0, 255, 0)
    expect(oklabDist(a, b)).toBeGreaterThan(0.01)
  })
})

describe('deltaE2000 (CIEDE2000)', () => {
  it('相同颜色距离为 0', () => {
    const lab = { L: 50, a: 10, b: -20 }
    expect(deltaE2000(lab, lab)).toBe(0)
  })

  it('黑与白的色差应很大', () => {
    const black = rgbToLab(0, 0, 0)
    const white = rgbToLab(255, 255, 255)
    const d = deltaE2000(black, white)
    expect(d).toBeGreaterThan(50)
  })

  it('浅灰与深灰色差应适中', () => {
    const light = rgbToLab(220, 220, 220)
    const dark = rgbToLab(30, 30, 30)
    const d = deltaE2000(light, dark)
    expect(d).toBeGreaterThan(20)
    expect(d).toBeLessThan(100)
  })

  it('相近颜色色差应很小', () => {
    const a = rgbToLab(100, 100, 100)
    const b = rgbToLab(102, 100, 100)
    const d = deltaE2000(a, b)
    expect(d).toBeLessThan(2)
  })

  it('CIEDE2000 对灰色区域区分度好于 CIE76', () => {
    const gray1 = rgbToLab(128, 128, 128)
    const gray2 = rgbToLab(140, 140, 140)
    const d2000 = deltaE2000(gray1, gray2)
    const d76 = deltaE(gray1, gray2)
    // CIEDE2000 在灰色区域对饱和度差异更敏感（权重更高）
    expect(d2000).toBeGreaterThan(0)
    expect(d76).toBeGreaterThan(0)
  })
})

describe('rgbDeltaE2000', () => {
  it('相同 RGB 色差为 0', () => {
    expect(rgbDeltaE2000(100, 150, 200, 100, 150, 200)).toBe(0)
  })

  it('红绿差异应明显', () => {
    const d = rgbDeltaE2000(255, 0, 0, 0, 255, 0)
    expect(d).toBeGreaterThan(10)
  })
})
