import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHotkeyHint } from '../useHotkeyHint'

describe('useHotkeyHint', () => {
  afterEach(() => vi.restoreAllMocks())

  it('starts with modifier not pressed', () => {
    const { result } = renderHook(() => useHotkeyHint())
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('detects Meta key press', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' })) })
    expect(result.current.isModifierPressed).toBe(true)
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' })) })
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('detects Control key press', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' })) })
    expect(result.current.isModifierPressed).toBe(true)
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' })) })
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('ignores other keys', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' })) })
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('ignores other keys on keyup', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' })) })
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('stopListening cleans up listeners', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => result.current.stopListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' })) })
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('stopListening resets pressed state', () => {
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' })) })
    act(() => result.current.stopListening())
    expect(result.current.isModifierPressed).toBe(false)
  })

  it('startListening is idempotent', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const { result } = renderHook(() => useHotkeyHint())
    act(() => result.current.startListening())
    act(() => result.current.startListening())
    expect(addEventListenerSpy).toHaveBeenCalledTimes(2)
    addEventListenerSpy.mockRestore()
  })
})
