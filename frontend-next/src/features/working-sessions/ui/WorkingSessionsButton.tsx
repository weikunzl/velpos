'use client'

import { useState, useRef, useEffect } from 'react'
import { useWorkingSessions } from '../model/useWorkingSessions'
import WorkingSessionsPanel from './WorkingSessionsPanel'

interface Props {
  onNavigate?: (sessionId: string) => void
}

export default function WorkingSessionsButton({ onNavigate }: Props) {
  const { workingCount } = useWorkingSessions()
  const [showPanel, setShowPanel] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPanel])

  function handleNavigate(sessionId: string) {
    onNavigate?.(sessionId)
  }

  return (
    <div className="working-sessions-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="glass-btn glass-btn--icon working-sessions-btn"
        onClick={() => setShowPanel(prev => !prev)}
        aria-label="Working sessions"
        title="Working sessions"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        {workingCount > 0 && (
          <span className="badge working-badge">{workingCount > 9 ? '9+' : workingCount}</span>
        )}
      </button>
      {showPanel && (
        <WorkingSessionsPanel
          onNavigate={handleNavigate}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  )
}
