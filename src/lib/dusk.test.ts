import { isDusk } from './dusk'

describe('isDusk', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true at 22:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T22:00:00'))
    expect(isDusk()).toBe(true)
  })

  it('returns false at 14:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T14:00:00'))
    expect(isDusk()).toBe(false)
  })

  it('returns true at 05:59', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T05:59:00'))
    expect(isDusk()).toBe(true)
  })

  it('returns false at 06:00', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T06:00:00'))
    expect(isDusk()).toBe(false)
  })
})
