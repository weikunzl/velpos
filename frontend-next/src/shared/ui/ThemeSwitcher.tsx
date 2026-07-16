'use client'

import { useTheme } from '@/shared/lib/useTheme'

type Theme = 'dark' | 'light' | 'sepia'

const NEXT_LABEL: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  sepia: 'Sepia',
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    )
  }
  if (theme === 'sepia') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v2" />
        <path d="M12 19v2" />
        <path d="M5.6 5.6l1.4 1.4" />
        <path d="M17 17l1.4 1.4" />
        <path d="M3 12h2" />
        <path d="M19 12h2" />
        <path d="M5.6 18.4l1.4-1.4" />
        <path d="M17 7l1.4-1.4" />
        <circle cx="12" cy="12" r="4" />
        <path d="M8 15c1.5 1 6.5 1 8 0" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function ThemeSwitcher() {
  const { theme, cycleTheme, nextTheme } = useTheme()
  const next = nextTheme()
  const label = NEXT_LABEL[next]

  return (
    <button
      onClick={cycleTheme}
      className="theme-switcher"
      title={`Switch to ${label} theme`}
      aria-label={`Switch to ${label} theme`}
      data-theme-current={theme}
    >
      <ThemeIcon theme={theme} />
    </button>
  )
}
