'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../model/useNotifications'
import NotificationPanel from './NotificationPanel'

interface Props {
  onNavigate?: (sessionId: string) => void
}

export default function NotificationBell({ onNavigate }: Props) {
  const { unreadCount } = useNotifications()
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
    <div className="notification-wrapper" ref={wrapperRef}>
      <button
        className="glass-btn glass-btn--icon notification-bell"
        onClick={() => setShowPanel(prev => !prev)}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {showPanel && (
        <NotificationPanel
          onNavigate={handleNavigate}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  )
}
