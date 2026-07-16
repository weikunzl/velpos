import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClickOutside } from '../useClickOutside'

describe('useClickOutside', () => {
  it('calls callback when clicking outside', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useClickOutside(callback))
    const el = document.createElement('div')
    result.current.current = el
    const outside = document.createElement('span')
    document.body.appendChild(outside)

    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(callback).toHaveBeenCalledTimes(1)

    document.body.removeChild(outside)
  })

  it('does not call callback when clicking inside', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useClickOutside(callback))
    const el = document.createElement('div')
    result.current.current = el
    document.body.appendChild(el)

    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(callback).not.toHaveBeenCalled()

    document.body.removeChild(el)
  })

  it('does not call callback when ref is null', () => {
    const callback = vi.fn()
    renderHook(() => useClickOutside(callback))
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(callback).not.toHaveBeenCalled()
  })

  it('removes event listener on unmount', () => {
    const callback = vi.fn()
    const { unmount } = renderHook(() => useClickOutside(callback))
    unmount()
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(callback).not.toHaveBeenCalled()
  })
})
