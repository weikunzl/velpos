import { describe, it, expect } from 'vitest'
import { parseRulePaths, formatFileSize } from '../textParsers'

describe('parseRulePaths', () => {
  it('parses newline-separated paths', () => {
    expect(parseRulePaths('a\n  b  \nc')).toEqual(['a', 'b', 'c'])
  })

  it('filters empty lines', () => {
    expect(parseRulePaths('a\n\nb\n')).toEqual(['a', 'b'])
  })

  it('returns empty array for empty string', () => {
    expect(parseRulePaths('')).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(parseRulePaths()).toEqual([])
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats KB', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
  })

  it('formats MB', () => {
    expect(formatFileSize(1048576 * 2)).toBe('2.0 MB')
  })

  it('handles string input', () => {
    expect(formatFileSize('1024')).toBe('1 KB')
  })

  it('handles 0 and NaN', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize('abc')).toBe('0 B')
  })
})
