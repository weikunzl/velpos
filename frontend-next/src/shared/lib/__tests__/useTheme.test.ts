import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to dark theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('sets theme and persists to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('light') })
    expect(result.current.theme).toBe('light')
    expect(localStorage.getItem('vp-theme')).toBe('light')
  })

  it('cycles through themes', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('dark') })
    act(() => { result.current.cycleTheme() })
    expect(result.current.theme).toBe('light')
    act(() => { result.current.cycleTheme() })
    expect(result.current.theme).toBe('sepia')
    act(() => { result.current.cycleTheme() })
    expect(result.current.theme).toBe('dark')
  })

  it('nextTheme returns the next theme without changing current', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('dark') })
    expect(result.current.nextTheme()).toBe('light')
    expect(result.current.theme).toBe('dark')
  })

  it('nextTheme wraps around from sepia to dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('sepia') })
    expect(result.current.nextTheme()).toBe('dark')
  })

  it('applies data-theme attribute on DOM element', () => {
    const { result } = renderHook(() => useTheme())
    act(() => { result.current.setTheme('light') })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('vp-theme', 'sepia')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('sepia')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
  })

  it('ignores invalid localStorage value on mount', () => {
    localStorage.setItem('vp-theme', 'invalid')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
  })
})
