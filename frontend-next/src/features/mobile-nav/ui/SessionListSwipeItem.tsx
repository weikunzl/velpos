'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Session } from '@/shared/types/api'

const COPY_WIDTH = 72
const DELETE_WIDTH = 72
const BOTH_ACTION_WIDTH = COPY_WIDTH + DELETE_WIDTH
const OPEN_THRESHOLD = 36

interface Props {
  session: Session
  active?: boolean
  openSwipeId?: string | null
  onSelect: (session: Session) => void
  onDelete: (sessionId: string) => void
  onCopy: (sessionId: string) => void
  onSwipeOpen: (sessionId: string) => void
  onSwipeClose: () => void
}

export function SessionListSwipeItem({
  session,
  active = false,
  openSwipeId,
  onSelect,
  onDelete,
  onCopy,
  onSwipeOpen,
  onSwipeClose,
}: Props) {
  const offset = useRef(0)
  const [renderOffset, setRenderOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startOffset = useRef(0)
  const didSwipe = useRef(false)
  const lockAxis = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isClaudeCode = (session as Session & { source?: string }).source === 'claude-code'
  const canCopy = !isClaudeCode
  const canDelete = !active

  const actionWidth = useMemo(() => {
    if (canCopy && canDelete) return BOTH_ACTION_WIDTH
    if (canCopy) return COPY_WIDTH
    if (canDelete) return DELETE_WIDTH
    return 0
  }, [canCopy, canDelete])

  const isOpen = actionWidth > 0 && renderOffset <= -actionWidth / 2
  const isRaised = isDragging || isOpen

  function statusColor(s: Session) {
    if (s.status === 'running') return 'running'
    if (s.status === 'waiting') return 'waiting'
    return ''
  }

  function sessionLabel(s: Session) {
    if (s.status === 'running') return '运行中'
    if (s.status === 'waiting') return '等待输入'
    return ''
  }

  // Close swipe when another item opens
  useEffect(() => {
    const openId = openSwipeId == null ? null : String(openSwipeId)
    if (!openId || openId === session.session_id) return
    offset.current = 0
    setRenderOffset(0)
    setIsDragging(false)
  }, [openSwipeId, session.session_id])

  function snapOffset() {
    if (!actionWidth) {
      offset.current = 0
      setRenderOffset(0)
      return
    }
    const shouldOpen = offset.current < -Math.min(OPEN_THRESHOLD, actionWidth / 2)
    const newOffset = shouldOpen ? -actionWidth : 0
    offset.current = newOffset
    setRenderOffset(newOffset)
    if (!shouldOpen && String(openSwipeId) === session.session_id) {
      onSwipeClose()
    }
  }

  function closeSwipe() {
    const wasOpen = isOpen
    offset.current = 0
    setRenderOffset(0)
    if (wasOpen && String(openSwipeId) === session.session_id) {
      onSwipeClose()
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!actionWidth) return
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    startOffset.current = offset.current
    setIsDragging(true)
    didSwipe.current = false
    lockAxis.current = null
    onSwipeOpen(session.session_id)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging || !actionWidth) return
    const touch = e.touches[0]
    const dx = touch.clientX - startX.current
    const dy = touch.clientY - startY.current

    if (!lockAxis.current) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      lockAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (lockAxis.current === 'y') {
        setIsDragging(false)
        if (!isOpen && String(openSwipeId) === session.session_id) {
          onSwipeClose()
        }
        return
      }
    }

    if (lockAxis.current !== 'x') return

    didSwipe.current = true
    e.preventDefault()
    const newOffset = Math.min(0, Math.max(-actionWidth, startOffset.current + dx))
    offset.current = newOffset
    setRenderOffset(newOffset)
  }

  function handleTouchEnd() {
    if (!isDragging) return
    setIsDragging(false)
    if (lockAxis.current === 'x') {
      snapOffset()
    } else if (!isOpen && String(openSwipeId) === session.session_id) {
      onSwipeClose()
    }
    lockAxis.current = null
  }

  function handleContentClick() {
    if (didSwipe.current) {
      didSwipe.current = false
      return
    }
    if (isOpen) {
      closeSwipe()
      return
    }
    onSelect(session)
  }

  return (
    <div
      ref={containerRef}
      className={`sl-swipe-root${isRaised ? ' sl-swipe--raised' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Actions (right side) */}
      {actionWidth > 0 && (
        <div className="sl-swipe-actions" style={{ width: actionWidth }}>
          {canCopy && (
            <button className="sl-swipe-action sl-swipe-action--copy" onClick={() => onCopy(session.session_id)}>
              Copy
            </button>
          )}
          {canDelete && (
            <button className="sl-swipe-action sl-swipe-action--delete" onClick={() => onDelete(session.session_id)}>
              Delete
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="sl-swipe-content"
        style={{ transform: renderOffset ? `translate3d(${renderOffset}px, 0, 0)` : undefined }}
        onClick={handleContentClick}
      >
        <div className="sl-swipe-info">
          <span className="sl-swipe-name">
            {session.name || session.session_id}
          </span>
          {sessionLabel(session) && (
            <span className={`sl-swipe-status sl-swipe-status--${statusColor(session)}`}>
              {sessionLabel(session)}
            </span>
          )}
        </div>
        {(session as Session & { created_at?: string }).created_at && (
          <span className="sl-swipe-time">
            {(session as Session & { created_at?: string }).created_at}
          </span>
        )}
      </div>

      <style>{`
        .sl-swipe-root {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-md);
          z-index: 1;
        }
        .sl-swipe--raised { z-index: 2; }
        .sl-swipe-actions {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: row;
          z-index: 0;
        }
        .sl-swipe-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: filter var(--transition-fast);
        }
        .sl-swipe-action:active { filter: brightness(0.85); }
        .sl-swipe-action--copy { background: var(--accent); }
        .sl-swipe-action--delete { background: #e53e3e; }
        .sl-swipe-content {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-secondary);
          cursor: pointer;
          transition: background var(--transition-fast);
          will-change: transform;
          z-index: 1;
        }
        .sl-swipe-content:active { background: var(--bg-hover); }
        .sl-swipe-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .sl-swipe-name { font-size: 14px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sl-swipe-status { font-size: 11px; font-weight: 600; }
        .sl-swipe-status--running { color: var(--accent); }
        .sl-swipe-status--waiting { color: #f59e0b; }
        .sl-swipe-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
      `}</style>
    </div>
  )
}
