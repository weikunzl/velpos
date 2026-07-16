'use client'

import { useQueryElapsed } from '../model/useQueryElapsed'
import { sessionStore } from '@/entities/session'

interface QueryRuntimeBarProps {
  sessionId: string
  status: string
  queryStartedAt: number | null
  queued?: boolean
  queuedPrompt?: string
  error?: string | null
}

export function QueryRuntimeBar({
  sessionId,
  status,
  queryStartedAt,
  queued = false,
  queuedPrompt = '',
  error = null,
}: QueryRuntimeBarProps) {
  const elapsed = useQueryElapsed(queryStartedAt)

  function handleCancel() {
    const ws = sessionStore.getWsConnection(sessionId)
    if (ws) {
      ws.send({ action: 'cancel' })
    }
  }

  // Queued state — waiting to run
  if (queued && status !== 'running') {
    return (
      <div className="runtime-bar runtime-bar-queued">
        <div className="runtime-bar-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <span className="runtime-text">{queuedPrompt || 'Waiting in queue...'}</span>
        <button className="runtime-btn runtime-btn-danger" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    )
  }

  // Running state
  if (status === 'running') {
    return (
      <div className="runtime-bar runtime-bar-running">
        <span className="runtime-spinner" />
        <span className="runtime-text">
          Running
          {elapsed !== '0:00' ? (
            <span className="runtime-elapsed">{elapsed}</span>
          ) : null}
        </span>
        <button className="runtime-btn runtime-btn-danger" onClick={handleCancel}>
          Stop
        </button>
      </div>
    )
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="runtime-bar runtime-bar-error">
        <span className="runtime-text runtime-text-error">{error}</span>
      </div>
    )
  }

  return null
}
