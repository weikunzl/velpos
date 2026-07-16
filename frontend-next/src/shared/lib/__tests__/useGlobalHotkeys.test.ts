import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGlobalHotkeys } from '../useGlobalHotkeys'

describe('useGlobalHotkeys', () => {
  const fireKey = (key: string, opts: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      bubbles: true,
      cancelable: true,
      ...opts,
    })
    window.dispatchEvent(event)
    return event
  }

  it('calls previous_session on Meta+ArrowUp', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('ArrowUp', { metaKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'previous_session' })
  })

  it('calls previous_session on Ctrl+ArrowUp', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('ArrowUp', { ctrlKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'previous_session' })
  })

  it('calls next_session on Meta+ArrowDown', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('ArrowDown', { metaKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'next_session' })
  })

  it('calls toggle_settings on Meta+p', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('p', { metaKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'toggle_settings' })
  })

  it('calls toggle_sidebar on Meta+b', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('b', { metaKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'toggle_sidebar' })
  })

  it('calls toggle_notifications on Meta+k', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('k', { metaKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'toggle_notifications' })
  })

  it('calls escape on Escape', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('Escape')
    expect(onAction).toHaveBeenCalledWith({ type: 'escape' })
  })

  it('calls cycle_permission on Shift+Tab', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('Tab', { shiftKey: true })
    expect(onAction).toHaveBeenCalledWith({ type: 'cycle_permission' })
  })

  it('does not call onAction for unknown keys', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('a')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('does not call onAction for Escape with meta', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('Escape', { metaKey: true })
    expect(onAction).not.toHaveBeenCalled()
  })

  it('returns cleanup function on unmount', () => {
    const onAction = vi.fn()
    const { unmount } = renderHook(() => useGlobalHotkeys({ onAction }))
    unmount()
    fireKey('Escape')
    expect(onAction).not.toHaveBeenCalled()
  })

  it('uses latest onAction callback', () => {
    const onAction = vi.fn()
    const { rerender } = renderHook(
      (config) => useGlobalHotkeys(config),
      { initialProps: { onAction } },
    )
    const onAction2 = vi.fn()
    rerender({ onAction: onAction2 })
    fireKey('Escape')
    expect(onAction).not.toHaveBeenCalled()
    expect(onAction2).toHaveBeenCalledWith({ type: 'escape' })
  })

  it('does not call onAction for shiftKey without Tab', () => {
    const onAction = vi.fn()
    renderHook(() => useGlobalHotkeys({ onAction }))
    fireKey('Shift', { shiftKey: true })
    expect(onAction).not.toHaveBeenCalled()
  })
})
