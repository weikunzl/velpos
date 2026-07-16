'use client'

import { useRef, useState, useEffect } from 'react'
import { useTheme } from '@/shared/lib/useTheme'
import { useEyeCare } from '@/shared/lib/useEyeCare'

type Theme = 'dark' | 'light' | 'sepia'

const themeOptions: Array<{ value: Theme; label: string; icon: 'moon' | 'sun' | 'eye' }> = [
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'sepia', label: '护眼', icon: 'eye' },
]

function ThemeIcon({ icon }: { icon: 'moon' | 'sun' | 'eye' }) {
  if (icon === 'sun') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  if (icon === 'eye') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { brightness, setBrightness, warmth, setWarmth, reset } = useEyeCare()
  const [showPanel, setShowPanel] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPanel])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPanel(false)
    }
    if (showPanel) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showPanel])

  function handleThemeClick(opt: (typeof themeOptions)[number]) {
    if (opt.value === theme) {
      setShowPanel((prev) => !prev)
    } else {
      setTheme(opt.value)
      setShowPanel(false)
    }
  }

  return (
    <div className="theme-switcher-wrap" ref={switcherRef}>
      <div className="theme-switcher" role="radiogroup" aria-label="Theme">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`theme-btn${theme === opt.value ? ' active' : ''}`}
            aria-checked={theme === opt.value}
            title={opt.label}
            role="radio"
            onClick={() => handleThemeClick(opt)}
          >
            <ThemeIcon icon={opt.icon} />
          </button>
        ))}
      </div>

      {showPanel && (
        <div className="eyecare-panel">
          <div className="panel-row">
            <svg className="row-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            <input
              type="range"
              className="slider"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              min={60}
              max={100}
              step={1}
              aria-label="亮度"
            />
            <svg className="row-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
          </div>

          <div className="panel-row">
            <span className="row-label">冷</span>
            <input
              type="range"
              className="slider slider-warmth"
              value={warmth}
              onChange={(e) => setWarmth(Number(e.target.value))}
              min={0}
              max={100}
              step={1}
              aria-label="色温"
            />
            <span className="row-label">暖</span>
          </div>

          <button type="button" className="reset-btn" onClick={reset}>
            重置
          </button>
        </div>
      )}
    </div>
  )
}
