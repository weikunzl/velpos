'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { SessionSummary, Project } from '@/shared/types/api'
import { SessionListItem } from './SessionListItem'
import {
  PINNED_SESSIONS_KEY,
  PINNED_PROJECTS_KEY,
  loadPinnedIds,
  savePinnedIds,
  togglePinnedId,
  compareSessions,
  splitPinnedProjects,
} from '@/shared/lib/pinning'

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
  onReorderProjects,
}: SessionSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [pinnedSessionIds, setPinnedSessionIds] = useState<Set<string>>(() => new Set())
  const [pinnedProjectIds, setPinnedProjectIds] = useState<Set<string>>(() => new Set())
  const [sidebarMode, setSidebarMode] = useState<'single' | 'teams'>('single')
  const [dragProjectId, setDragProjectId] = useState<string | null>(null)

  const modeProjects = projects.filter((p) =>
    sidebarMode === 'teams'
      ? p.project_type === 'team'
      : p.project_type !== 'team',
  )

  const modeProjectIds = new Set(modeProjects.map((p) => p.id))

  const groupedSessions = new Map<string | '__unassigned', SessionSummary[]>()
  for (const s of sessions) {
    const key = s.project_id || '__unassigned'
    if (key !== '__unassigned' && !modeProjectIds.has(key)) continue
    if (!groupedSessions.has(key)) groupedSessions.set(key, [])
    groupedSessions.get(key)!.push(s)
  }
  for (const [key, list] of groupedSessions) {
    list.sort((a, b) => compareSessions(
      { session_id: a.session_id, status: a.status, updated_time: a.updated_at },
      { session_id: b.session_id, status: b.status, updated_time: b.updated_at },
      pinnedSessionIds,
    ))
    groupedSessions.set(key, list)
  }

  const { pinnedProjects, unpinnedProjects } = splitPinnedProjects(modeProjects, pinnedProjectIds)
  const orderedProjects = [...pinnedProjects, ...unpinnedProjects] as Project[]

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

  useEffect(() => {
    setPinnedSessionIds(loadPinnedIds(PINNED_SESSIONS_KEY))
    setPinnedProjectIds(loadPinnedIds(PINNED_PROJECTS_KEY))
  }, [])

  // Toggle project collapse
  function toggleProjectCollapse(projectId: string) {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePinSession(id: string) {
    setPinnedSessionIds((prev) => {
      const next = togglePinnedId(prev, id)
      savePinnedIds(PINNED_SESSIONS_KEY, next)
      return next
    })
  }

  function togglePinProject(id: string) {
    setPinnedProjectIds((prev) => {
      const next = togglePinnedId(prev, id)
      savePinnedIds(PINNED_PROJECTS_KEY, next)
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

  function renderSessionItem(s: SessionSummary, extraClass = '') {
    return (
      <SessionListItem
        key={s.session_id}
        session={s}
        active={s.session_id === currentSessionId}
        className={extraClass}
        selectable={selectMode}
        selected={selectedIds.has(s.session_id)}
        pinned={pinnedSessionIds.has(s.session_id)}
        onSelect={onSelect}
        onDelete={onDelete}
        onCopy={onCopy}
        onRename={onRename}
        onToggleSelect={toggleSelect}
        onTogglePin={togglePinSession}
      />
    )
  }

  function handleProjectDrop(targetId: string) {
    if (!dragProjectId || dragProjectId === targetId) {
      setDragProjectId(null)
      return
    }
    const ids = orderedProjects.map((p) => p.id)
    const from = ids.indexOf(dragProjectId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) {
      setDragProjectId(null)
      return
    }
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, dragProjectId)
    onReorderProjects(next)
    setDragProjectId(null)
  }

  function renderProjectGroup(projectId: string, project: Project | undefined) {
    const projectSessions = groupedSessions.get(projectId) || []
    const isCollapsed = collapsedProjects.has(projectId)

    if (projectSessions.length === 0 && !project) return null

    const projectName = project?.name || projectId.slice(0, 8)
    const scheduleCount = scheduleCounts[projectId] || 0
    const isPinned = project ? pinnedProjectIds.has(projectId) : false
    const isTeam = project?.project_type === 'team'

    return (
      <div
        key={projectId}
        className={`project-group${dragProjectId === projectId ? ' dragging' : ''}`}
        draggable={!!project}
        onDragStart={() => project && setDragProjectId(projectId)}
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={() => handleProjectDrop(projectId)}
        onDragEnd={() => setDragProjectId(null)}
      >
        <div
          className="project-header"
          title={projectName}
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
            className={`collapse-arrow${isCollapsed ? ' collapsed' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {isTeam ? (
            <svg className="project-icon project-icon--team" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ) : isPinned ? (
            <svg className="project-icon project-icon--pinned" width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )}
          <span className="project-name">{projectName}</span>
          <span className="project-count">{projectSessions.length}</span>
          {project && (
            <span className="project-actions">
              <button
                type="button"
                className={`project-action-btn project-pin-btn${isPinned ? ' pinned' : ''}`}
                title={isPinned ? 'Unpin' : 'Pin'}
                aria-label={isPinned ? 'Unpin project' : 'Pin project'}
                onClick={(e) => {
                  e.stopPropagation()
                  togglePinProject(projectId)
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
              </button>
              <button
                type="button"
                className="project-action-btn project-clock-btn"
                title="Project clock"
                aria-label="Configure project clock"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenScheduler(projectId)
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {scheduleCount > 0 && <span className="project-clock-badge">{scheduleCount}</span>}
              </button>
              <button
                type="button"
                className="project-action-btn project-add-btn"
                title="New session"
                aria-label="Create session in this project"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateInProject(projectId)
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </span>
          )}
        </div>
        <div className={`group-content${isCollapsed ? ' collapsed' : ''}`}>
          {projectSessions.map((s) => renderSessionItem(s, 'indented-session'))}
        </div>
      </div>
    )
  }

  if (collapsed) {
    return (
      <aside className="session-sidebar main-sidebar sidebar-collapsed">
        <div className="sidebar-collapsed-overlay">
          <button className="sidebar-expand-btn" onClick={onToggleCollapse} title="Expand sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="session-sidebar main-sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="new-session-btn"
          onClick={onCreateProject}
          aria-label={sidebarMode === 'teams' ? 'Create new team' : 'Create new project'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {sidebarMode === 'teams' ? 'New Team' : 'New Project'}
        </button>
        <button
          type="button"
          className={`select-mode-btn${selectMode ? ' active' : ''}`}
          onClick={() => {
            setSelectMode(!selectMode)
            setSelectedIds(new Set())
          }}
          aria-label={selectMode ? 'Exit selection mode' : 'Enter selection mode'}
          title="Select sessions"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </button>
      </div>

      <div className="sidebar-mode-tabs" role="tablist" aria-label="Sidebar mode">
        <button
          type="button"
          role="tab"
          className={`mode-tab${sidebarMode === 'single' ? ' active' : ''}`}
          aria-selected={sidebarMode === 'single'}
          onClick={() => setSidebarMode('single')}
        >
          Agents
        </button>
        <button
          type="button"
          role="tab"
          className={`mode-tab${sidebarMode === 'teams' ? ' active' : ''}`}
          aria-selected={sidebarMode === 'teams'}
          onClick={() => setSidebarMode('teams')}
        >
          Teams
        </button>
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
      <div className="sidebar-list-wrapper">
        <div className="sidebar-list-fade sidebar-list-fade--top" />
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
            {/* Project groups first */}
            {orderedProjects.map((p) => renderProjectGroup(p.id, p))}

            {/* Unassigned sessions */}
            {sidebarMode === 'single' && groupedSessions.has('__unassigned') && (
              <div className="project-group">
                <div className="project-header">
                  <span className="project-name">Unassigned</span>
                  <span className="project-count">
                    {groupedSessions.get('__unassigned')!.length}
                  </span>
                </div>
                <div className="group-content">
                  {groupedSessions.get('__unassigned')!.map((s) => renderSessionItem(s, 'indented-session'))}
                </div>
              </div>
            )}

            {sidebarMode === 'teams' && orderedProjects.length === 0 && (
              <div className="sidebar-empty">
                <div className="sidebar-empty-text">No teams yet</div>
                <p className="empty-hint">Create a team to coordinate multiple agents</p>
              </div>
            )}
          </>
        )}
        </div>
        <div className="sidebar-list-fade sidebar-list-fade--bottom" />
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
