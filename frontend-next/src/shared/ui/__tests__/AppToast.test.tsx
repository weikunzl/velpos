import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppToast, useToast } from '../AppToast'
import { renderHook } from '@testing-library/react'

describe('AppToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders null when toast is null', () => {
    const { container } = render(<AppToast toast={null} onDismiss={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toast message', () => {
    render(<AppToast toast={{ id: '1', message: 'Hello', type: 'info' }} onDismiss={vi.fn()} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('calls onDismiss after duration', () => {
    const onDismiss = vi.fn()
    render(<AppToast toast={{ id: '1', message: 'Test', type: 'info', duration: 100 }} onDismiss={onDismiss} />)
    act(() => { vi.advanceTimersByTime(100) })
    act(() => { vi.advanceTimersByTime(300) })
    expect(onDismiss).toHaveBeenCalledWith('1')
  })

  it('has visible class after animation frame', () => {
    render(<AppToast toast={{ id: '1', message: 'Hi', type: 'success' }} onDismiss={vi.fn()} />)
    const el = screen.getByText('Hi').parentElement
    expect(el!.className).toContain('app-toast')
  })

  it('renders with all toast types', () => {
    const types = ['info', 'success', 'warning', 'error'] as const
    for (const type of types) {
      const { unmount } = render(
        <AppToast toast={{ id: type, message: type, type }} onDismiss={vi.fn()} />,
      )
      expect(screen.getByText(type)).toBeInTheDocument()
      unmount()
    }
  })
})

describe('useToast', () => {
  it('initializes with null toast', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('show() sets a toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('hello', 'success') })
    expect(result.current.toast).not.toBeNull()
    expect(result.current.toast!.message).toBe('hello')
    expect(result.current.toast!.type).toBe('success')
  })

  it('show() defaults to info type', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('info default') })
    expect(result.current.toast!.type).toBe('info')
  })

  it('dismiss() clears the toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('bye') })
    const id = result.current.toast!.id
    act(() => { result.current.dismiss(id) })
    expect(result.current.toast).toBeNull()
  })

  it('dismiss() does nothing for wrong id', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.show('stay') })
    act(() => { result.current.dismiss('wrong-id') })
    expect(result.current.toast).not.toBeNull()
  })
})
