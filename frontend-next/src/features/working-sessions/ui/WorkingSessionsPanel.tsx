'use client'

import { useMemo } from 'react'
import { formatDurationLong } from '@/shared/lib/formatTime'
import { useWorkingSessions } from '../model/useWorkingSessions'

interface Props {
  variant?: 'dropdown' | 'sheet'
  onNavigate: (sessionId: string) => void
  onClose: () => void
}

export default function WorkingSessionsPanel({
  variant = 'dropdown',
  onNavigate,
  onClose,
}: Props) {
  const { workingList } = useWorkingSessions()

  function handleClick(sessionId: string) {
    onNavigate(sessionId)
    onClose()
  }

  const panelClass = `working-panel working-panel--${variant}`

  return (
    <div className={panelClass} onClick={e => e.stopPropagation()}>
      <div className="panel-header">
        <span className="panel-title">
          {variant === 'sheet' ? 'Working Sessions' : 'Working Sessions'}
        </span>
        {workingList.length > 0 && (
          <span className="panel-count">{workingList.length}</span>
        )}
        {variant === 'sheet' && (
          <button className="panel-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
      <div className="panel-body">
        {workingList.length === 0 ? (
          <div className="empty-state">
            {variant === 'sheet' ? 'No active sessions' : 'No active sessions'}
          </div>
        ) : (
          workingList.map(item => (
            <div
              key={item.sessionId}
              className="working-item"
              onClick={() => handleClick(item.sessionId)}
            >
              <div className="working-dot" />
              <div className="working-content">
                <div className="working-name">
                  {item.sessionName || item.sessionId.slice(0, 8)}
                </div>
                <div className="working-meta">
                  {item.projectName && (
                    <span className="project-tag">{item.projectName}</span>
                  )}
                  <span className="elapsed">
                    {formatDurationLong(Date.now() - item.startTime)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
