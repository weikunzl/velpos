'use client'

import { useState, useEffect, useRef } from 'react'
import { getWorkerContext } from '../api/teamApi'

interface Props {
  sessionId: string
  teamTaskId?: string
  onNavigateBack?: (sessionId: string, projectId: string) => void
}

interface WorkerContext {
  coordinator_session_id: string
  team_project_id: string
  team_project_name: string
  role: string
}

export function WorkerSessionBreadcrumb({ sessionId, teamTaskId, onNavigateBack }: Props) {
  const [context, setContext] = useState<WorkerContext | null>(null)
  const loadSeqRef = useRef(0)

  useEffect(() => {
    async function loadContext() {
      if (!teamTaskId || !sessionId) {
        setContext(null)
        return
      }
      const seq = ++loadSeqRef.current
      try {
        const data = await getWorkerContext(sessionId)
        if (seq !== loadSeqRef.current) return
        setContext(data)
      } catch {
        if (seq !== loadSeqRef.current) return
        setContext(null)
      }
    }
    loadContext()
  }, [sessionId, teamTaskId])

  function navigateBack() {
    if (!context) return
    onNavigateBack?.(context.coordinator_session_id, context.team_project_id)
  }

  if (!context) return null

  return (
    <div className="worker-breadcrumb" onClick={navigateBack}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span className="breadcrumb-text">Teams: {context.team_project_name}</span>
      <span className="breadcrumb-role">{context.role}</span>
      <style>{`
        .worker-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          margin: 4px 8px;
          border-radius: var(--radius-sm);
          background: var(--accent-dim);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
          color: var(--accent);
          font-size: 12px;
          cursor: pointer;
          transition: background var(--transition-fast);
          flex-shrink: 0;
        }
        .worker-breadcrumb:hover {
          background: color-mix(in srgb, var(--accent) 15%, var(--bg-secondary));
        }
        .breadcrumb-text { font-weight: 500; }
        .breadcrumb-role { color: var(--text-muted); font-size: 11px; }
      `}</style>
    </div>
  )
}
