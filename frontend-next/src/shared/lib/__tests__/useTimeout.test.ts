import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimeout } from '../useTimeout'

describe('useTimeout', () => {
  afterEach(() => { vi.useRealTimers() })

  it('sets and fires a timeout', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useTimeout())
    act(() => { result.current.set(fn, 100) })
    expect(fn).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('clears a timeout before it fires', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result } = renderHook(() => useTimeout())
    let id: ReturnType<typeof setTimeout>
    act(() => { id = result.current.set(fn, 100) })
    act(() => { result.current.clear(id) })
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).not.toHaveBeenCalled()
  })

  it('clears all timeouts with clearAll', () => {
    vi.useFakeTimers()
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    const { result } = renderHook(() => useTimeout())
    act(() => { result.current.set(fn1, 100); result.current.set(fn2, 200) })
    act(() => { result.current.clearAll() })
    act(() => { vi.advanceTimersByTime(300) })
    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).not.toHaveBeenCalled()
  })

  it('clears all on unmount', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { result, unmount } = renderHook(() => useTimeout())
    act(() => { result.current.set(fn, 100) })
    unmount()
    act(() => { vi.advanceTimersByTime(100) })
    expect(fn).not.toHaveBeenCalled()
  })
})
