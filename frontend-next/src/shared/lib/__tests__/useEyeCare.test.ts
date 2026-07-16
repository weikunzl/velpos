import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEyeCare } from '../useEyeCare'

describe('useEyeCare', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.style.removeProperty('filter')
  })

  afterEach(() => vi.restoreAllMocks())

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('pf_eyecare_brightness', 'not-a-number')
    const { result } = renderHook(() => useEyeCare())
    expect(result.current.brightness).toBe(100)
  })

  it('handles localStorage error gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    const { result } = renderHook(() => useEyeCare())
    act(() => result.current.setBrightness(80))
    expect(result.current.brightness).toBe(80)
    setItemSpy.mockRestore()
  })

  it('defaults to 100 brightness and 0 warmth', () => {
    const { result } = renderHook(() => useEyeCare())
    expect(result.current.brightness).toBe(100)
    expect(result.current.warmth).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('setBrightness updates value and applies filter', () => {
    const { result } = renderHook(() => useEyeCare())
    act(() => result.current.setBrightness(80))
    expect(result.current.brightness).toBe(80)
    expect(result.current.isActive).toBe(true)
    expect(document.documentElement.style.filter).toContain('brightness')
  })

  it('setWarmth updates value and applies filter', () => {
    const { result } = renderHook(() => useEyeCare())
    act(() => result.current.setWarmth(50))
    expect(result.current.warmth).toBe(50)
    expect(result.current.isActive).toBe(true)
    expect(document.documentElement.style.filter).toContain('sepia')
  })

  it('reset restores defaults and removes filter', () => {
    const { result } = renderHook(() => useEyeCare())
    act(() => { result.current.setBrightness(80); result.current.setWarmth(50) })
    act(() => result.current.reset())
    expect(result.current.brightness).toBe(100)
    expect(result.current.warmth).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('restores from localStorage', () => {
    localStorage.setItem('pf_eyecare_brightness', '90')
    localStorage.setItem('pf_eyecare_warmth', '20')
    const { result } = renderHook(() => useEyeCare())
    expect(result.current.brightness).toBe(90)
    expect(result.current.warmth).toBe(20)
  })

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => useEyeCare())
    act(() => result.current.setBrightness(70))
    expect(localStorage.getItem('pf_eyecare_brightness')).toBe('70')
  })
})
