import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUserPreferences } from '../useUserPreferences'

describe('useUserPreferences', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('defaults to enter-send behavior', () => {
    const { result } = renderHook(() => useUserPreferences())
    expect(result.current.enterBehavior).toBe('enter-send')
    expect(result.current.shouldEnterSend()).toBe(true)
    expect(result.current.shouldCtrlEnterSend()).toBe(false)
  })

  it('setEnterBehavior changes behavior', () => {
    const { result } = renderHook(() => useUserPreferences())
    act(() => result.current.setEnterBehavior('ctrl-enter-send'))
    expect(result.current.enterBehavior).toBe('ctrl-enter-send')
    expect(result.current.shouldEnterSend()).toBe(false)
    expect(result.current.shouldCtrlEnterSend()).toBe(true)
  })

  it('ignores invalid behavior values', () => {
    const { result } = renderHook(() => useUserPreferences())
    act(() => result.current.setEnterBehavior('invalid'))
    expect(result.current.enterBehavior).toBe('enter-send')
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useUserPreferences())
    act(() => result.current.setEnterBehavior('ctrl-enter-send'))
    expect(localStorage.getItem('pf_enter_behavior')).toBe('ctrl-enter-send')
  })

  it('restores from localStorage', () => {
    localStorage.setItem('pf_enter_behavior', 'ctrl-enter-send')
    const { result } = renderHook(() => useUserPreferences())
    expect(result.current.enterBehavior).toBe('ctrl-enter-send')
  })

  it('handles localStorage error gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    const { result } = renderHook(() => useUserPreferences())
    act(() => result.current.setEnterBehavior('ctrl-enter-send'))
    expect(result.current.enterBehavior).toBe('ctrl-enter-send')
    setItemSpy.mockRestore()
  })

  it('ignores invalid stored value', () => {
    localStorage.setItem('pf_enter_behavior', 'invalid-behavior')
    const { result } = renderHook(() => useUserPreferences())
    expect(result.current.enterBehavior).toBe('enter-send')
  })
})
