import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useViewport, BREAKPOINTS } from '../useViewport'

describe('useViewport', () => {
  let mediaQueryList: MediaQueryList

  beforeEach(() => {
    mediaQueryList = {
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList
    vi.spyOn(window, 'matchMedia').mockImplementation(() => mediaQueryList)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns breakpoint constants', () => {
    expect(BREAKPOINTS.mobile).toBe(768)
    expect(BREAKPOINTS.tablet).toBe(1024)
  })

  it('returns isMobile and isTablet booleans', () => {
    Object.defineProperty(mediaQueryList, 'matches', { value: false, writable: true })
    const { result } = renderHook(() => useViewport())
    expect(typeof result.current.isMobile).toBe('boolean')
    expect(typeof result.current.isTablet).toBe('boolean')
  })

  it('sets isMobile to true when viewport is narrow', () => {
    const mobileMql = {
      matches: true,
      media: `(max-width: ${BREAKPOINTS.mobile}px)`,
      addEventListener: vi.fn((_event: string, cb: () => void) => { setTimeout(cb, 0) }),
      removeEventListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query.includes(`${BREAKPOINTS.mobile}`)) return mobileMql
      return mediaQueryList
    })
    const { result } = renderHook(() => useViewport())
    expect(result.current.isMobile).toBe(true)
  })

  it('sets isTablet to true when viewport is medium', () => {
    const tabletMql = {
      matches: true,
      media: `(max-width: ${BREAKPOINTS.tablet}px)`,
      addEventListener: vi.fn((_event: string, cb: () => void) => { setTimeout(cb, 0) }),
      removeEventListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    } as unknown as MediaQueryList
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query.includes(`${BREAKPOINTS.tablet}`)) return tabletMql
      return mediaQueryList
    })
    const { result } = renderHook(() => useViewport())
    expect(result.current.isTablet).toBe(true)
  })
})
