import { hashSeed } from './seed'

describe('hashSeed', () => {
  it('produces consistent results for the same string', () => {
    expect(hashSeed('a7f3b2')).toBe(hashSeed('a7f3b2'))
    expect(hashSeed('hello')).toBe(hashSeed('hello'))
  })

  it('produces different results for different strings', () => {
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
    expect(hashSeed('seed1')).not.toBe(hashSeed('seed2'))
  })

  it('handles empty string', () => {
    // djb2 initial value — deterministic and defined
    expect(hashSeed('')).toBe(5381)
  })

  it('handles long strings', () => {
    const long = 'a'.repeat(10_000)
    const result = hashSeed(long)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(0xFFFFFFFF)
    // Deterministic
    expect(hashSeed(long)).toBe(result)
  })

  it('handles unicode', () => {
    // Characters outside ASCII, including multi-byte sequences
    expect(hashSeed('日本語')).toBe(hashSeed('日本語'))
    expect(hashSeed('🌸')).toBe(hashSeed('🌸'))
    expect(hashSeed('🌸')).not.toBe(hashSeed('🌿'))
  })

  it('output is a uint32 (non-negative integer)', () => {
    const samples = ['', 'a', 'test', '123', 'huntingforcarrots']
    for (const s of samples) {
      const h = hashSeed(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xFFFFFFFF)
    }
  })
})
