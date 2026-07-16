import { useState, useEffect } from 'react'

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const

function getMatches(): { isMobile: boolean; isTablet: boolean } {
  /* v8 ignore next 3 */ if (typeof window === 'undefined') return { isMobile: false, isTablet: false }
  return {
    isMobile: window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`).matches,
    isTablet: window.matchMedia(`(max-width: ${BREAKPOINTS.tablet}px)`).matches,
  }
}

export function useViewport() {
  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile}px)`)
    const tabletQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.tablet}px)`)

    function onChange() {
      setMatches(getMatches())
    }

    mobileQuery.addEventListener('change', onChange)
    tabletQuery.addEventListener('change', onChange)
    return () => {
      mobileQuery.removeEventListener('change', onChange)
      tabletQuery.removeEventListener('change', onChange)
    }
  }, [])

  return matches
}
