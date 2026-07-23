// ============================================
//  前端工具函数单元测试
// ============================================
import { describe, it, expect } from 'vitest'
import { esc, contrastColor, formatDate, deepClone } from '../../../src/utils/helpers.js'

describe('esc (HTML 转义)', () => {
  it('普通字符串不改变', () => {
    expect(esc('hello')).toBe('hello')
  })

  it('转义 < 和 >', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;')
  })

  it('转义 &', () => {
    expect(esc('a & b')).toBe('a &amp; b')
  })

  it('转义双引号', () => {
    expect(esc('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it('混合特殊字符', () => {
    const result = esc('<a href="x&y">')
    expect(result).toBe('&lt;a href=&quot;x&amp;y&quot;&gt;')
  })

  it('空字符串', () => {
    expect(esc('')).toBe('')
  })
})

describe('contrastColor', () => {
  it('黑色返回白色文字', () => {
    expect(contrastColor('#000000')).toBe('#fff')
  })

  it('白色返回黑色文字', () => {
    expect(contrastColor('#FFFFFF')).toBe('#000')
  })

  it('无 # 前缀也正常', () => {
    expect(contrastColor('000000')).toBe('#fff')
  })

  it('中灰色返回黑色', () => {
    // 128 * 0.299 + 128 * 0.587 + 128 * 0.114 = 128 < 150
    expect(contrastColor('#808080')).toBe('#fff')
  })

  it('亮色返回黑色', () => {
    expect(contrastColor('#CCCCCC')).toBe('#000')
  })
})

describe('formatDate', () => {
  it('空字符串返回空', () => {
    expect(formatDate('')).toBe('')
  })

  it('null/undefined 返回空', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })

  it('正常日期格式化', () => {
    const result = formatDate('2026-01-15T10:30:00Z')
    expect(result).toContain('2026')
  })
})

describe('deepClone', () => {
  it('深拷贝后修改不影响原对象', () => {
    const obj = { a: 1, b: { c: 2 } }
    const clone = deepClone(obj)
    clone.b.c = 99
    expect(obj.b.c).toBe(2)
  })

  it('数组深拷贝', () => {
    const arr = [{ x: 1 }, { y: 2 }]
    const clone = deepClone(arr)
    clone[0].x = 99
    expect(arr[0].x).toBe(1)
  })
})
