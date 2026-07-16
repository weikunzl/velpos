import { describe, it, expect } from 'vitest'
import { useCancellableAsync } from '../useCancellableAsync'

describe('useCancellableAsync', () => {
  it('starts with version 1', () => {
    const { start, isCurrent } = useCancellableAsync()
    const v1 = start()
    expect(v1).toBe(1)
    expect(isCurrent(v1)).toBe(true)
  })

  it('version increments on each start', () => {
    const { start, isCurrent } = useCancellableAsync()
    const v1 = start()
    const v2 = start()
    expect(v1).toBe(1)
    expect(v2).toBe(2)
    expect(isCurrent(v1)).toBe(false)
    expect(isCurrent(v2)).toBe(true)
  })

  it('isCurrent returns false for old versions', () => {
    const { start, isCurrent } = useCancellableAsync()
    const v1 = start()
    start()
    expect(isCurrent(v1)).toBe(false)
  })
})
