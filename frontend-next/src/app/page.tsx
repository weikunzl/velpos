'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSessions, useCreateSession, useDeleteSession, useRenameSession, useBatchDeleteSessions } from '@/entities/session/api/useSessionQuery'
import { useProjects, useCreateProject, useDeleteProject, useReorderProjects } from '@/entities/project/api/useProjectQuery'
import { useSessionContext, useCurrentSession, useSessionState, sessionStore } from '@/entities/session'
import { SessionSidebar } from '@/features/session-list'
import { MessageList } from '@/features/message-display'
import { MessageInput } from '@/features/send-message'
import { RuntimeActionDock } from '@/features/runtime-dock'
import { HeaderToolbar } from '@/features/header-toolbar'
import { SettingsDialog } from '@/features/settings'
import { TerminalDrawer } from '@/features/terminal'
import { GitManagerDialog } from '@/features/git-manager'
import { WorkspacePanel } from '@/features/workspace'
import { useGlobalHotkeys } from '@/shared/lib/useGlobalHotkeys'
import { AppToast, useToast } from '@/shared/ui/AppToast'

export default function Home() {
  const { data: sessionsData, isLoading } = useSessions()
  const { data: projectsData } = useProjects()

  const { currentSessionId, setCurrentSessionId, sessions: sessionList } = useSessionContext()
  const currentSession = useCurrentSession()

  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const renameSession = useRenameSession()
  const batchDeleteSessions = useBatchDeleteSessions()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const reorderProjects = useReorderProjects()

  const projects = projectsData || []

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [scheduleCounts, setScheduleCounts] = useState<Record<string, number>>({})
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [workspaceVisible, setWorkspaceVisible] = useState(false)
  const [gitManagerVisible, setGitManagerVisible] = useState(false)
  const [notificationsVisible, setNotificationsVisible] = useState(false)
  const [workingSessionsVisible, setWorkingSessionsVisible] = useState(false)
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const handleHotkeyAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'toggle_settings':
          setSettingsVisible((v) => !v)
          break
        case 'toggle_sidebar':
          setSidebarCollapsed((v) => !v)
          break
        case 'toggle_terminal':
          setTerminalVisible((v) => !v)
          break
        case 'toggle_workspace':
          setWorkspaceVisible((v) => !v)
          break
        case 'toggle_notifications':
          setNotificationsVisible((v) => !v)
          break
        case 'escape': {
          if (settingsVisible) setSettingsVisible(false)
          else if (terminalVisible) setTerminalVisible(false)
          else if (workspaceVisible) setWorkspaceVisible(false)
          else if (gitManagerVisible) setGitManagerVisible(false)
          else if (notificationsVisible) setNotificationsVisible(false)
          else if (workingSessionsVisible) setWorkingSessionsVisible(false)
          break
        }
        case 'previous_session': {
          const idx = sessionList.findIndex((s) => s.session_id === currentSessionId)
          if (idx > 0) setCurrentSessionId(sessionList[idx - 1].session_id)
          break
        }
        case 'next_session': {
          const idx = sessionList.findIndex((s) => s.session_id === currentSessionId)
          if (idx < sessionList.length - 1) setCurrentSessionId(sessionList[idx + 1].session_id)
          break
        }
      }
    },
    [
      currentSessionId, sessionList, setCurrentSessionId,
      settingsVisible, terminalVisible, workspaceVisible, gitManagerVisible,
      notificationsVisible, workingSessionsVisible,
    ],
  )

  const anyDialogOpen = settingsVisible || terminalVisible || workspaceVisible
    || gitManagerVisible || notificationsVisible || workingSessionsVisible

  useGlobalHotkeys({ onAction: handleHotkeyAction, dialogOpen: anyDialogOpen })

  const handleCreateSession = useCallback(async () => {
    try {
      const result = await createSession.mutateAsync({})
      setCurrentSessionId(result.session_id)
    } catch { /* empty */ }
  }, [createSession, setCurrentSessionId])

  const handleCreateInProject = useCallback(async (projectId: string) => {
    try {
      const result = await createSession.mutateAsync({ projectId })
      setCurrentSessionId(result.session_id)
    } catch { /* empty */ }
  }, [createSession, setCurrentSessionId])

  const handleDeleteSession = useCallback((id: string) => {
    deleteSession.mutate({ sessionId: id })
    sessionStore.removeState(id)
    sessionStore.forceCloseConnection(id)
  }, [deleteSession])

  const handleRenameSession = useCallback((id: string, name: string) => {
    renameSession.mutate({ sessionId: id, name })
  }, [renameSession])

  const handleBatchDelete = useCallback((ids: string[]) => {
    batchDeleteSessions.mutate(ids)
    for (const id of ids) {
      sessionStore.removeState(id)
      sessionStore.forceCloseConnection(id)
    }
  }, [batchDeleteSessions])

  const handleCopySession = useCallback(async (sessionId: string) => {
    try {
      const result = await createSession.mutateAsync({
        name: `${sessionList.find((s) => s.session_id === sessionId)?.name || ''} (copy)`,
      })
      setCurrentSessionId(result.session_id)
    } catch { /* empty */ }
  }, [createSession, sessionList, setCurrentSessionId])

  const handleDeleteProject = useCallback((projectId: string) => {
    const projectSessions = sessionList.filter((s) => s.project_id === projectId)
    for (const s of projectSessions) {
      sessionStore.removeState(s.session_id)
      sessionStore.forceCloseConnection(s.session_id)
    }
    deleteProject.mutate(projectId)
  }, [deleteProject, sessionList])

  const handleOpenScheduler = useCallback((_projectId: string) => {
    // TODO: implement scheduler dialog
  }, [])

  // Sync session list to store
  useEffect(() => {
    if (sessionsData) {
      sessionStore.setSessions(sessionsData)
    }
  }, [sessionsData])

  // Auto-select first session on load
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0 && !currentSessionId) {
      const lastId = localStorage.getItem('pf_last_session_id')
      const target = lastId ? sessionsData.find((s) => s.session_id === lastId) : undefined
      setCurrentSessionId(target?.session_id || sessionsData[0].session_id)
    }
  }, [sessionsData, currentSessionId, setCurrentSessionId])

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('pf_last_session_id', currentSessionId)
    }
  }, [currentSessionId])

  // Init global events
  useEffect(() => {
    sessionStore.initGlobalEvents()
    return () => {
      sessionStore.destroyGlobalEvents()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="header-left">
            <div className="skel-circle" />
            <div className="skel-bar" style={{ width: 80, height: 16 }} />
          </div>
          <div className="header-right">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skel-circle" />
            ))}
          </div>
        </header>
        <div className="app-body">
          <aside className="skel-sidebar">
            <div className="skel-sidebar-header">
              <div className="skel-bar" style={{ width: '60%', height: 12 }} />
            </div>
            <div className="skel-sidebar-list">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skel-session-item">
                  <div className="skel-bar" style={{ width: `${50 + i * 7}%`, height: 10 }} />
                  <div className="skel-bar" style={{ width: '40%', height: 8, marginTop: 6 }} />
                </div>
              ))}
            </div>
          </aside>
          <main className="app-main">
            <div className="empty-state">
              <span>Loading...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <button
            className="header-menu-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <AppLogo />
        </div>
        <div className="header-right">
          <HeaderToolbar
            onToggleSettings={() => setSettingsVisible(!settingsVisible)}
            onToggleTerminal={() => setTerminalVisible(!terminalVisible)}
            onToggleWorkspace={() => setWorkspaceVisible(!workspaceVisible)}
            onToggleGitManager={() => setGitManagerVisible(!gitManagerVisible)}
            onToggleNotifications={() => setNotificationsVisible(!notificationsVisible)}
            onToggleWorkingSessions={() => setWorkingSessionsVisible(!workingSessionsVisible)}
          />
          <span className="header-session-name">
            {currentSession?.session?.name || ''}
          </span>
        </div>
      </header>

      <div className="app-body">
        <SessionSidebar
          projects={projects}
          sessions={sessionList}
          currentSessionId={currentSessionId}
          loading={isLoading}
          scheduleCounts={scheduleCounts}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSelect={setCurrentSessionId}
          onCreate={handleCreateSession}
          onDelete={handleDeleteSession}
          onRename={handleRenameSession}
          onCopy={handleCopySession}
          onBatchDelete={handleBatchDelete}
          onCreateInProject={handleCreateInProject}
          onDeleteProject={handleDeleteProject}
          onOpenScheduler={handleOpenScheduler}
          onReorderProjects={(ids) => reorderProjects.mutate(ids)}
        />

        <main className="app-main">
          {currentSessionId ? (
            <ChatPanel sessionId={currentSessionId} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="empty-text">Select or create a session to start</div>
            </div>
          )}
        </main>
      </div>

      <AppToast toast={toast} onDismiss={dismissToast} />
      <SettingsDialog open={settingsVisible} onClose={() => setSettingsVisible(false)} />
      <GitManagerDialog open={gitManagerVisible} onClose={() => setGitManagerVisible(false)} />
      <WorkspacePanel
        visible={workspaceVisible}
        project={currentSession?.session?.project_id ? { id: currentSession.session.project_id, dir_path: currentSession.session.project_dir || '' } : null}
        onClose={() => setWorkspaceVisible(false)}
      />
      <TerminalDrawer
        open={terminalVisible}
        onClose={() => setTerminalVisible(false)}
        projectDir={currentSession?.session?.project_dir || ''}
        gitBranch={currentSession?.session?.git_branch || ''}
      />
    </div>
  )
}

function ChatPanel({ sessionId }: { sessionId: string }) {
  const state = useSessionState(sessionId)

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={state?.messages || []}
        status={state?.status || 'disconnected'}
      />
      <RuntimeActionDock sessionId={sessionId} state={state} />
      <div className="send-message-area">
        <MessageInput
          sessionId={sessionId}
          disabled={state?.status === 'disconnected' || state?.status === 'error'}
        />
      </div>
    </div>
  )
}

/** Simple App Logo */
function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="#4a9eff" points="256,56 108,200 148,400 256,296"/>
        <polygon fill="#a78bfa" points="256,56 404,200 364,400 256,296"/>
        <polygon fill="#3b5998" points="148,400 256,456 256,296"/>
        <polygon fill="#7c3aed" opacity="0.8" points="364,400 256,456 256,296"/>
        <polygon fill="#c4b5fd" opacity="0.5" points="256,56 200,148 256,180 312,148"/>
      </svg>
      <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Velpos</span>
    </div>
  )
}
