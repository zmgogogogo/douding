// ============================================
//  JWT 工具单元测试
// ============================================
import { describe, it, expect } from 'vitest'
import { signToken, verifyToken } from '../../../server/utils/jwt.js'

describe('signToken', () => {
  it('应返回一个字符串 token', () => {
    const token = signToken({ id: 1, username: 'test' })
    expect(token).toBeTypeOf('string')
    expect(token.split('.')).toHaveLength(3) // JWT 三段式
  })

  it('不同 payload 应生成不同 token', () => {
    const t1 = signToken({ id: 1 })
    const t2 = signToken({ id: 2 })
    expect(t1).not.toBe(t2)
  })
})

describe('verifyToken', () => {
  it('应能正确解析已签发的 token', () => {
    const payload = { id: 42, username: 'douding' }
    const token = signToken(payload)
    const decoded = verifyToken(token)
    expect(decoded.id).toBe(42)
    expect(decoded.username).toBe('douding')
  })

  it('无效 token 应抛出异常', () => {
    expect(() => verifyToken('not.a.valid.token')).toThrow()
  })

  it('空字符串应抛出异常', () => {
    expect(() => verifyToken('')).toThrow()
  })
})
