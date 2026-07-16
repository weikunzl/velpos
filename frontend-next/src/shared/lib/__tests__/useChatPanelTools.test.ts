import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatPanelTools } from '../useChatPanelTools'

describe('useChatPanelTools', () => {
  beforeEach(() => {
    localStorage.removeItem('pf_debug_mode')
    localStorage.removeItem('pf_runtime_panel')
  })

  afterEach(() => vi.restoreAllMocks())

  it('defaults debugMode and runtimePanelVisible to false', () => {
    const { result } = renderHook(() => useChatPanelTools())
    expect(result.current.debugMode).toBe(false)
    expect(result.current.runtimePanelVisible).toBe(false)
  })

  it('toggleDebug flips the value and persists', () => {
    const { result } = renderHook(() => useChatPanelTools())
    act(() => result.current.toggleDebug())
    expect(result.current.debugMode).toBe(true)
    expect(localStorage.getItem('pf_debug_mode')).toBe('true')
    act(() => result.current.toggleDebug())
    expect(result.current.debugMode).toBe(false)
    expect(localStorage.getItem('pf_debug_mode')).toBe('false')
  })

  it('toggleRuntimePanel flips the value', () => {
    const { result } = renderHook(() => useChatPanelTools())
    act(() => result.current.toggleRuntimePanel())
    expect(result.current.runtimePanelVisible).toBe(true)
    act(() => result.current.toggleRuntimePanel())
    expect(result.current.runtimePanelVisible).toBe(false)
  })

  it('reads persisted debug mode from localStorage', () => {
    localStorage.setItem('pf_debug_mode', 'true')
    const { result } = renderHook(() => useChatPanelTools())
    expect(result.current.debugMode).toBe(true)
  })

  it('handles setItem error gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full')
    })
    const { result } = renderHook(() => useChatPanelTools())
    act(() => result.current.toggleDebug())
    expect(result.current.debugMode).toBe(true)
    setItemSpy.mockRestore()
  })
})
