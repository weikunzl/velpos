'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light' | 'sepia'

const STORAGE_KEY = 'vp-theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored && ['dark', 'light', 'sepia'].includes(stored)) {
      applyTheme(stored)
      setThemeState(stored)
    }
  }, [])

  const applyTheme = (t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
  }

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem(STORAGE_KEY, t)
  }, [])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['dark', 'light', 'sepia']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
  }, [theme, setTheme])

  const nextTheme = useCallback((): Theme => {
    const order: Theme[] = ['dark', 'light', 'sepia']
    return order[(order.indexOf(theme) + 1) % order.length]
  }, [theme])

  return { theme, setTheme, cycleTheme, nextTheme }
}
