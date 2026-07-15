'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  disabled?: boolean
  clearing?: boolean
  onClear: () => void
}

export function ClearContextButton({ disabled = false, clearing = false, onClear }: Props) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleClick() {
    if (disabled || clearing) return
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => {
        setConfirming(false)
        timerRef.current = null
      }, 3000)
      return
    }
    setConfirming(false)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    onClear()
  }

  return (
    <button
      className={`clear-ctx-btn${confirming ? ' clear-ctx-btn--confirming' : ''}${disabled || clearing ? ' clear-ctx-btn--disabled' : ''}`}
      disabled={disabled || clearing}
      onClick={handleClick}
      title="Clear context"
    >
      {clearing ? 'Clearing...' : confirming ? 'Confirm?' : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      )}
    </button>
  )
}
