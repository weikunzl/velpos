'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useSessionContext } from '@/entities/session'
import type { SessionSummary, Project } from '@/shared/types/api'

interface SessionSidebarProps {
  projects: Project[]
  sessions: SessionSummary[]
  currentSessionId: string | null
  loading: boolean
  scheduleCounts: Record<string, number>
  collapsed: boolean
  onToggleCollapse: () => void
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onCopy: (id: string) => void
  onBatchDelete: (ids: string[]) => void
  onCreateInProject: (projectId: string) => void
  onCreateProject: () => void
  onDeleteProject: (projectId: string) => void
  onOpenScheduler: (projectId: string) => void
  onReorderProjects: (ids: string[]) => void
}

export function SessionSidebar({
  projects,
  sessions,
  currentSessionId,
  loading,
  scheduleCounts,
  collapsed,
  onToggleCollapse,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onCopy,
  onBatchDelete,
  onCreateInProject,
  onCreateProject,
  onDeleteProject,
  onOpenScheduler,
}: SessionSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  // Group sessions by project
  const projectMap = new Map<string, Project>()
  for (const p of projects) {
    projectMap.set(p.id, p)
  }

  const groupedSessions = new Map<string | '__unassigned', SessionSummary[]>()
  for (const s of sessions) {
    const key = s.project_id || '__unassigned'
    if (!groupedSessions.has(key)) groupedSessions.set(key, [])
    groupedSessions.get(key)!.push(s)
  }

  // Scroll to current session
  const scrollToSession = useCallback(
    (sessionId: string) => {
      if (!listRef.current) return
      const el = listRef.current.querySelector(`[data-session-id="${sessionId}"]`)
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    },
    [],
  )

  useEffect(() => {
    if (currentSessionId) {
      scrollToSession(currentSessionId)
    }
  }, [currentSessionId, scrollToSession])

  // Expose scrollToSession via ref
  useEffect(() => {
    const el = listRef.current
    if (el) {
      ;(el as unknown as Record<string, unknown>).scrollToSession = scrollToSession
    }
  }, [scrollToSession])

  // Expose scrollToSession to parent via window event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.sessionId) scrollToSession(e.detail.sessionId)
    }
    window.addEventListener('vp-scroll-to-session' as never, handler as never)
    return () => window.removeEventListener('vp-scroll-to-session' as never, handler as never)
  }, [scrollToSession])

  // Toggle project collapse
  function toggleProjectCollapse(projectId: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  // Rename handlers
  function startRename(id: string, currentName: string) {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  function confirmRename() {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  // Batch selection
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirmBatchDelete() {
    if (selectedIds.size > 0) {
      onBatchDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setSelectMode(false)
    }
  }

  function renderSessionItem(s: SessionSummary) {
    const isSelected = s.session_id === currentSessionId
    const isMarked = selectedIds.has(s.session_id)
    const isRenaming = renamingId === s.session_id

    return (
      <div
        key={s.session_id}
        data-session-id={s.session_id}
        className={`session-item ${isSelected ? 'session-item-active' : ''}`}
        onClick={() => {
          if (selectMode) {
            toggleSelect(s.session_id)
          } else {
            onSelect(s.session_id)
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          // Could show context menu here
        }}
      >
        {selectMode && (
          <div
            className={`session-checkbox ${isMarked ? 'session-checkbox-checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              toggleSelect(s.session_id)
            }}
          >
            {isMarked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
        <div className="session-item-content">
          {isRenaming ? (
            <input
              className="session-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onBlur={confirmRename}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="session-item-name">{s.name || 'Unnamed'}</div>
          )}
          <div className="session-item-meta">
            <span className={`session-status-dot status-${s.status}`} />
            <span className="session-item-status">{s.status}</span>
            {s.model && <span className="session-item-model">{s.model}</span>}
          </div>
        </div>
        {!selectMode && (
          <div className="session-item-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="session-action-btn"
              title="Rename"
              onClick={() => startRename(s.session_id, s.name)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            </button>
            <button
              className="session-action-btn"
              title="Copy"
              onClick={() => onCopy(s.session_id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
            <button
              className="session-action-btn session-action-danger"
              title="Delete"
              onClick={() => onDelete(s.session_id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderProjectGroup(projectId: string, project: Project | undefined) {
    const projectSessions = groupedSessions.get(projectId) || []
    const isCollapsed = collapsedProjects.has(projectId)

    if (projectSessions.length === 0 && !project) return null

    const projectName = project?.name || projectId.slice(0, 8)
    const scheduleCount = scheduleCounts[projectId] || 0

    return (
      <div key={projectId} className="project-group">
        <div
          className="project-header"
          onClick={() => toggleProjectCollapse(projectId)}
          onContextMenu={(e) => {
            e.preventDefault()
            if (project && window.confirm(`Delete project "${projectName}" and all its sessions?`)) {
              onDeleteProject(projectId)
            }
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`project-chevron ${isCollapsed ? '' : 'project-chevron-open'}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="project-name">{projectName}</span>
          <span className="project-session-count">{projectSessions.length}</span>
          {scheduleCount > 0 && (
            <button
              className="project-schedule-badge"
              title="View scheduled tasks"
              onClick={(e) => {
                e.stopPropagation()
                onOpenScheduler(projectId)
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              {scheduleCount}
            </button>
          )}
          <button
            className="project-add-session"
            title="New session in project"
            onClick={(e) => {
              e.stopPropagation()
              onCreateInProject(projectId)
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>
        {!isCollapsed && (
          <div className="project-sessions">
            {projectSessions.map(renderSessionItem)}
          </div>
        )}
      </div>
    )
  }

  if (collapsed) {
    return (
      <aside className="main-sidebar sidebar-collapsed">
        <div className="sidebar-collapsed-overlay">
          <button className="sidebar-expand-btn" onClick={onToggleCollapse} title="Expand sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="main-sidebar">
      {/* Sidebar header */}
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <span className="sidebar-title">Sessions</span>
          <span className="sidebar-count">{sessions.length}</span>
        </div>
        <div className="sidebar-header-actions">
          <button
            className={`sidebar-header-btn ${selectMode ? 'sidebar-header-btn-active' : ''}`}
            onClick={() => {
              setSelectMode(!selectMode)
              setSelectedIds(new Set())
            }}
            title="Select multiple"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="12" x2="15" y2="12" /></svg>
          </button>
          <button className="sidebar-header-btn" onClick={onCreate} title="New session">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>
      </div>

      {/* Batch mode bar */}
      {selectMode && (
        <div className="sidebar-batch-bar">
          <span className="batch-count">{selectedIds.size} selected</span>
          <button
            className="batch-action-btn"
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect all
          </button>
          <button
            className="batch-action-btn batch-action-danger"
            onClick={confirmBatchDelete}
            disabled={selectedIds.size === 0}
          >
            Delete
          </button>
        </div>
      )}

      {/* Session list */}
      <div className="sidebar-list" ref={listRef}>
        {loading && (
          <div className="sidebar-loading">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="sidebar-skeleton-item">
                <div className="skel-bar" style={{ width: `${50 + i * 8}%`, height: 10 }} />
                <div className="skel-bar" style={{ width: '35%', height: 8, marginTop: 6 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="sidebar-empty">
            <div className="sidebar-empty-text">No sessions yet</div>
            <button className="sidebar-empty-btn" onClick={onCreate}>
              Create your first session
            </button>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            {/* Unassigned sessions */}
            {groupedSessions.has('__unassigned') && (
              <div className="project-group">
                <div className="project-header">
                  <span className="project-name">Unassigned</span>
                  <span className="project-session-count">
                    {groupedSessions.get('__unassigned')!.length}
                  </span>
                </div>
                <div className="project-sessions">
                  {groupedSessions.get('__unassigned')!.map(renderSessionItem)}
                </div>
              </div>
            )}

            {/* Project groups */}
            {projects.map((p) => renderProjectGroup(p.id, p))}
          </>
        )}
      </div>

      {/* New Project button */}
      <div className="sidebar-footer">
        <button className="new-project-btn" onClick={onCreateProject}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Collapse button */}
      <div className="sidebar-collapse-area-side">
        <button
          className="sidebar-collapse-btn-side"
          onClick={onToggleCollapse}
          title="Collapse sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
