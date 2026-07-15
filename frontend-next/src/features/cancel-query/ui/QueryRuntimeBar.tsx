'use client'

import { useQueryElapsed } from '../model/useQueryElapsed'
import { sessionStore } from '@/entities/session'

interface QueryRuntimeBarProps {
  sessionId: string
  status: string
  queryStartedAt: number | null
}

export function QueryRuntimeBar({ sessionId, status, queryStartedAt }: QueryRuntimeBarProps) {
  const elapsed = useQueryElapsed(queryStartedAt)

  if (status !== 'running') return null

  function handleCancel() {
    const ws = sessionStore.getWsConnection(sessionId)
    if (ws) {
      ws.send({ action: 'cancel' })
    }
  }

  return (
    <div className="runtime-bar">
      <span className="runtime-spinner" />
      <span className="runtime-text">Running... {elapsed}</span>
      <button className="runtime-btn runtime-btn-danger" onClick={handleCancel}>
        Cancel
      </button>
    </div>
  )
}
