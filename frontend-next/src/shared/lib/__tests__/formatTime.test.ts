import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { formatRelativeTime, formatDuration, formatDurationLong } from '../formatTime'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty string for null/undefined', () => {
    expect(formatRelativeTime(null)).toBe('')
    expect(formatRelativeTime(undefined)).toBe('')
  })

  it('returns "just now" for less than 1 minute ago', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 1000)).toBe('just now')
    expect(formatRelativeTime(now - 59000)).toBe('just now')
  })

  it('returns minutes ago for < 1 hour', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 60000)).toBe('1m ago')
    expect(formatRelativeTime(now - 60000 * 30)).toBe('30m ago')
    expect(formatRelativeTime(now - 60000 * 59)).toBe('59m ago')
  })

  it('returns hours ago for < 24 hours', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 3600000)).toBe('1h ago')
    expect(formatRelativeTime(now - 3600000 * 12)).toBe('12h ago')
    expect(formatRelativeTime(now - 3600000 * 23)).toBe('23h ago')
  })

  it('returns days ago for < 7 days', () => {
    const now = Date.now()
    expect(formatRelativeTime(now - 86400000)).toBe('1d ago')
    expect(formatRelativeTime(now - 86400000 * 6)).toBe('6d ago')
  })

  it('returns date string for >= 7 days', () => {
    const now = Date.now()
    const result = formatRelativeTime(now - 86400000 * 7)
    expect(result).toContain('2026')
  })

  it('handles string date input', () => {
    expect(formatRelativeTime('2026-07-15T11:59:00Z')).toBe('1m ago')
  })

  it('handles string date input for "just now"', () => {
    // Use ISO string for current time
    const dateStr = new Date(Date.now() - 30000).toISOString()
    expect(formatRelativeTime(dateStr)).toBe('just now')
  })
})

describe('formatDuration', () => {
  it('returns fallback for null/undefined', () => {
    expect(formatDuration(null)).toBe('')
    expect(formatDuration(undefined)).toBe('')
    expect(formatDuration(null, '--')).toBe('--')
  })

  it('formats milliseconds as seconds', () => {
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(0)).toBe('')
    expect(formatDuration(100)).toBe('0.1s')
  })

  it('formats zero ms with fallback', () => {
    expect(formatDuration(0, '--')).toBe('--')
  })
})

describe('formatDurationLong', () => {
  it('returns fallback for null/undefined', () => {
    expect(formatDurationLong(null)).toBe('')
    expect(formatDurationLong(undefined)).toBe('')
    expect(formatDurationLong(undefined, '--')).toBe('--')
  })

  it('formats seconds only when < 60s', () => {
    expect(formatDurationLong(5000)).toBe('5s')
    expect(formatDurationLong(59000)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDurationLong(120000)).toBe('2m 0s')
    expect(formatDurationLong(125000)).toBe('2m 5s')
    expect(formatDurationLong(3599000)).toBe('59m 59s')
  })

  it('formats hours and minutes for >= 1 hour', () => {
    expect(formatDurationLong(3600000)).toBe('1h 0m')
    expect(formatDurationLong(3660000)).toBe('1h 1m')
    expect(formatDurationLong(7260000)).toBe('2h 1m')
  })

  it('handles 0 ms', () => {
    expect(formatDurationLong(0)).toBe('')
    expect(formatDurationLong(0, '--')).toBe('--')
  })

  it('handles negative ms (treats as 0)', () => {
    expect(formatDurationLong(-1000)).toBe('0s')
  })
})
