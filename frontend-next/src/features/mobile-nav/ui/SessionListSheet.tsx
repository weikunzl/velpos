'use client'

import { useState, useMemo } from 'react'
import type { SessionSummary } from '@/shared/types/api'
import { SessionListSwipeItem } from './SessionListSwipeItem'

interface Props {
  project: { name?: string; agents?: { current?: unknown } } | null
  sessions: SessionSummary[]
  currentSessionId: string | null
  onSelect: (session: SessionSummary) => void
  onBack: () => void
  onClose: () => void
  onNewSession: () => void
  onDelete: (sessionId: string) => void
  onCopy: (sessionId: string) => void
}

export function SessionListSheet({
  project,
  sessions,
  currentSessionId,
  onSelect,
  onBack,
  onClose,
  onNewSession,
  onDelete,
  onCopy,
}: Props) {
  const [keyword, setKeyword] = useState('')
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)

  const filteredSessions = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return sessions
    return sessions.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(kw) ||
        (s.session_id || '').toLowerCase().includes(kw)
    )
  }, [sessions, keyword])

  function handleBack() {
    setOpenSwipeId(null)
    onBack()
  }

  return (
    <div className="sl-root" onClick={onClose}>
      <div className="sl-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div className="sl-header">
          <button className="sl-back-btn" onClick={handleBack} aria-label="返回项目列表">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="sl-header-center">
            <span className="sl-project-name">{project?.name || '会话'}</span>
            {Boolean((project as Record<string, unknown>)?.agents) && (
              <span className="sl-agent-badge">Agent</span>
            )}
          </div>
          <button className="sl-new-btn" onClick={onNewSession} aria-label="新建会话">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="sl-search-wrap">
          <svg className="sl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="sl-search"
            type="search"
            placeholder="搜索会话…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Session list */}
        <div className="sl-list">
          {filteredSessions.length === 0 && (
            <div className="sl-empty">
              <span>{keyword ? '没有匹配的会话' : '还没有会话，点击 + 新建'}</span>
            </div>
          )}
          {filteredSessions.map((session, idx) => (
            <div key={session.session_id} className={idx > 0 ? 'sl-swipe-row' : ''}>
              <SessionListSwipeItem
                session={session}
                active={session.session_id === currentSessionId}
                openSwipeId={openSwipeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onCopy={onCopy}
                onSwipeOpen={setOpenSwipeId}
                onSwipeClose={() => setOpenSwipeId(null)}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .sl-root {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: var(--overlay-glass);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: sl-bg-in var(--motion-medium) var(--ease-out) both;
        }
        .sl-sheet {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          border-top: 1px solid var(--glass-border);
          max-height: 92dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-glass);
          padding-bottom: var(--safe-bottom, 0px);
          animation: sl-sheet-in var(--motion-emphasis) var(--ease-spring) both;
        }
        .sl-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px 12px;
          flex-shrink: 0;
        }
        .sl-header-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 0;
        }
        .sl-project-name {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sl-agent-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
          flex-shrink: 0;
        }
        .sl-back-btn, .sl-new-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--touch-target);
          height: var(--touch-target);
          background: var(--bg-hover);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: background var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }
        .sl-back-btn:hover, .sl-new-btn:hover { background: var(--layer-active); color: var(--accent); }
        .sl-new-btn { color: var(--accent); background: var(--accent-dim); border-color: color-mix(in srgb, var(--accent) 30%, transparent); }
        .sl-search-wrap {
          position: relative;
          margin: 0 20px 8px;
          flex-shrink: 0;
        }
        .sl-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
        }
        .sl-search {
          width: 100%; height: 40px;
          padding: 0 12px 0 36px;
          background: var(--bg-input); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); color: var(--text-primary);
          font-size: 14px; outline: none;
        }
        .sl-search:focus { border-color: var(--accent); }
        .sl-list {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
          padding: 4px 12px 8px;
        }
        .sl-empty {
          padding: 32px 0;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .sl-swipe-row + .sl-swipe-row { border-top: 1px solid var(--border-subtle); }
        @keyframes sl-bg-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sl-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
