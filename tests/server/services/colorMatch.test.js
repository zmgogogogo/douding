// ============================================
//  颜色匹配服务单元测试
// ============================================
import { describe, it, expect } from 'vitest'
import { rgbToLab, deltaE2000 } from '../../../server/utils/colorSpace.js'

// hex 解析逻辑（从 colorMatch.js 中提取，方便独立测试）
function parseHex(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

// 最简单的颜色匹配：找 Lab 距离最小的颜色
function findBestMatch(rgb, palette) {
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
  let best = null
  let bestDist = Infinity
  for (const c of palette) {
    const d = deltaE2000(lab, c._lab)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return { color: best, distance: bestDist }
}

describe('parseHex', () => {
  it('解析 #FF0000 得到 r=255, g=0, b=0', () => {
    const { r, g, b } = parseHex('#FF0000')
    expect(r).toBe(255)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  it('解析无 # 前缀的颜色', () => {
    const { r, g, b } = parseHex('00FF00')
    expect(r).toBe(0)
    expect(g).toBe(255)
    expect(b).toBe(0)
  })

  it('解析小写 hex', () => {
    const { r, g, b } = parseHex('#ffffff')
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })
})

describe('findBestMatch', () => {
  // 模拟一个小型调色板（预计算 Lab 值）
  const palette = [
    { id: 1, name: 'White', hex: '#EAEEF3', _lab: rgbToLab(234, 238, 243) },
    { id: 2, name: 'Black', hex: '#292A2B', _lab: rgbToLab(41, 42, 43) },
    { id: 3, name: 'Red', hex: '#B61927', _lab: rgbToLab(182, 25, 39) },
    { id: 4, name: 'Green', hex: '#009053', _lab: rgbToLab(0, 144, 83) },
    { id: 5, name: 'Blue', hex: '#0078BF', _lab: rgbToLab(0, 120, 191) },
  ]

  it('白色 RGB 应匹配到 White', () => {
    const result = findBestMatch(parseHex('#FFFFFF'), palette)
    expect(result.color.name).toBe('White')
    expect(result.distance).toBeLessThan(5)
  })

  it('黑色 RGB 应匹配到 Black', () => {
    const result = findBestMatch(parseHex('#111111'), palette)
    expect(result.color.name).toBe('Black')
  })

  it('红色 RGB 应匹配到 Red', () => {
    const result = findBestMatch(parseHex('#CC0000'), palette)
    expect(result.color.name).toBe('Red')
  })

  it('绿色 RGB 应匹配到 Green', () => {
    const result = findBestMatch(parseHex('#008844'), palette)
    expect(result.color.name).toBe('Green')
  })

  it('蓝色 RGB 应匹配到 Blue', () => {
    const result = findBestMatch(parseHex('#0066CC'), palette)
    expect(result.color.name).toBe('Blue')
  })
})
