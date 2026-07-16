'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/shared/lib/formatTime'
import type { SessionSummary } from '@/shared/types/api'

interface SessionListItemProps {
  session: SessionSummary
  active: boolean
  selectable?: boolean
  selected?: boolean
  pinned?: boolean
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onCopy?: (sessionId: string) => void
  onRename?: (sessionId: string, name: string) => void
  onToggleSelect?: (sessionId: string) => void
  onTogglePin?: (sessionId: string) => void
}

const IM_LABELS: Record<string, string> = { lark: 'Lark', openim: 'IM', qq: 'QQ', weixin: 'WeChat' }

function getShortId(id: string): string {
  return id ? id.substring(0, 8) : ''
}

export function SessionListItem({
  session,
  active,
  selectable = false,
  selected = false,
  pinned = false,
  onSelect,
  onDelete,
  onCopy,
  onRename,
  onToggleSelect,
  onTogglePin,
}: SessionListItemProps) {
  const isClaudeCode = (session as unknown as Record<string, string>).source === 'claude-code'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [copying, setCopying] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayName = session.name || getShortId(session.session_id)
  const formattedTime = formatRelativeTime((session as unknown as Record<string, string>).updated_time || session.updated_at)

  const providerLabel = (() => {
    if (isClaudeCode) return ''
    const provider = (session as unknown as Record<string, string>).provider || 'claude'
    if (provider === 'claude') return ''
    return provider === 'cursor' ? 'Cursor' : provider
  })()

  const imChannelType = ((session as unknown as Record<string, Record<string, string>>).im_binding?.channel_type as string) || ''
  const imChannelLabel = IM_LABELS[imChannelType] || imChannelType

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

  const requestDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => {
      setShowDeleteConfirm(false)
      confirmTimerRef.current = null
    }, 3000)
  }, [])

  const confirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
    setShowDeleteConfirm(false)
    onDelete(session.session_id)
  }, [session.session_id, onDelete])

  const cancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmTimerRef.current) { clearTimeout(confirmTimerRef.current); confirmTimerRef.current = null }
    setShowDeleteConfirm(false)
  }, [])

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isClaudeCode) return
    setEditing(true)
    setEditName(displayName)
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }, [displayName, isClaudeCode])

  const submitRename = useCallback(() => {
    const trimmed = editName.trim()
    setEditing(false)
    if (trimmed && trimmed !== (session.name || '')) {
      onRename?.(session.session_id, trimmed)
    }
  }, [editName, session.name, session.session_id, onRename])

  const cancelEditing = useCallback(() => {
    setEditing(false)
  }, [])

  const requestCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (copying || isClaudeCode || !onCopy) return
    setCopying(true)
    onCopy(session.session_id)
    setTimeout(() => setCopying(false), 800)
  }, [copying, isClaudeCode, onCopy, session.session_id])

  const handleClick = useCallback(() => {
    if (selectable) {
      onToggleSelect?.(session.session_id)
    } else {
      onSelect(session.session_id)
    }
  }, [selectable, onToggleSelect, onSelect, session.session_id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectable) {
        onToggleSelect?.(session.session_id)
      } else {
        onSelect(session.session_id)
      }
    }
  }, [selectable, onToggleSelect, onSelect, session.session_id])

  const statusClass = isClaudeCode ? 'status-claude' : session.status === 'running' ? 'status-running' : session.status === 'error' ? 'status-error' : 'status-idle'

  return (
    <div
      className={`session-item${active ? ' active' : ''}${isClaudeCode ? ' is-claude-code' : ''}${selected ? ' is-selected' : ''}${pinned ? ' is-pinned' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Session ${getShortId(session.session_id)}`}
      onKeyDown={handleKeyDown}
    >
      {showDeleteConfirm ? (
        <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
          <span className="confirm-text">Delete?</span>
          <button className="confirm-yes" onClick={confirmDelete}>Yes</button>
          <button className="confirm-no" onClick={cancelDelete}>No</button>
        </div>
      ) : (
        <>
          <div className="session-main">
            {selectable ? (
              <label className="select-checkbox" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelect?.(session.session_id)}
                />
                <span className="checkbox-mark" />
              </label>
            ) : (
              <span
                className={`status-dot ${statusClass}`}
                aria-label={isClaudeCode ? 'claude-code' : session.status || 'idle'}
              />
            )}

            {editing && !isClaudeCode ? (
              <input
                ref={editInputRef}
                className="rename-input"
                value={editName}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.stopPropagation(); submitRename() }
                  if (e.key === 'Escape') { e.stopPropagation(); cancelEditing() }
                }}
                onBlur={submitRename}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Session name"
              />
            ) : (
              <>
                <span className="session-name" onDoubleClick={startEditing}>
                  {displayName}
                </span>
                <span className="action-buttons">
                  {onTogglePin && (
                    <button
                      className={`pin-btn${pinned ? ' pinned' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onTogglePin(session.session_id) }}
                      aria-label={pinned ? 'Unpin session' : 'Pin session'}
                      title={pinned ? 'Unpin' : 'Pin'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="17" x2="12" y2="22"/>
                        <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                      </svg>
                    </button>
                  )}
                  {!isClaudeCode && onCopy && (
                    <button
                      className={`copy-btn${copying ? ' copying' : ''}`}
                      disabled={copying}
                      onClick={requestCopy}
                      aria-label="复制会话"
                      title="复制会话"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  )}
                  <button
                    className="delete-btn"
                    onClick={requestDelete}
                    aria-label="Delete session"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </span>
              </>
            )}
          </div>

          {!editing && (
            <div className="session-meta">
              {providerLabel && (
                <span className="provider-badge" title={`Agent: ${providerLabel}`}>
                  {providerLabel}
                </span>
              )}
              {imChannelType && (
                <span className="im-badge" title={`IM: ${imChannelType}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {imChannelLabel}
                </span>
              )}
              {formattedTime && <span className="session-time">{formattedTime}</span>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
