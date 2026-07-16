'use client'

import { useState, useEffect } from 'react'
import type { SessionSummary } from '@/shared/types/api'

interface MultiSessionDialogProps {
  open: boolean
  sessions: SessionSummary[]
  currentSessionId?: string
  onSelectSession: (sessionId: string) => void
  onCompare: (sessionIds: string[]) => void
  onClose: () => void
}

export function MultiSessionDialog({
  open,
  sessions,
  currentSessionId,
  onSelectSession,
  onCompare,
  onClose,
}: MultiSessionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest')

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
    }
  }, [open])

  if (!open) return null

  const sortedSessions = [...sessions].sort((a, b) => {
    switch (sortOrder) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '')
      case 'oldest':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      default: // newest
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }
  })

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function handleCompare() {
    if (selectedIds.size < 2) return
    onCompare(Array.from(selectedIds))
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="dialog-header">
          <h2 className="dialog-title">Compare Sessions</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="dialog-body">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{sessions.length} sessions available</span>
            <select
              className="multi-session-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">By name</option>
            </select>
          </div>

          <div className="multi-session-list">
            {sortedSessions.map((s) => {
              const isCurrent = s.session_id === currentSessionId
              const isSelected = selectedIds.has(s.session_id)
              return (
                <div
                  key={s.session_id}
                  className={`multi-session-item ${isCurrent ? 'multi-session-item--current' : ''} ${isSelected ? 'multi-session-item--selected' : ''}`}
                  onClick={() => toggleSelect(s.session_id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="multi-session-checkbox"
                  />
                  <div className="multi-session-info">
                    <span className="multi-session-name">{s.name || 'Unnamed'}</span>
                    <span className="multi-session-meta">
                      {s.project_id ? `Project: ${s.project_id.slice(0, 8)}` : 'No project'}
                    </span>
                  </div>
                  <button
                    className="multi-session-go"
                    onClick={(e) => {
                      e.preventDefault()
                      onSelectSession(s.session_id)
                    }}
                    title="Switch to this session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {selectedIds.size >= 2 && (
            <div className="multi-session-compare-bar">
              <span className="text-sm text-muted">{selectedIds.size} sessions selected</span>
              <button className="btn btn-primary btn-sm" onClick={handleCompare}>
                Compare Selected
              </button>
            </div>
          )}
          {selectedIds.size < 2 && selectedIds.size > 0 && (
            <div className="multi-session-compare-bar">
              <span className="text-sm text-muted">Select at least 2 sessions to compare</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
