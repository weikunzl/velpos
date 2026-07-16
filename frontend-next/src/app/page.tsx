'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSessions, useCreateSession, useDeleteSession, useRenameSession, useBatchDeleteSessions } from '@/entities/session/api/useSessionQuery'
import { useProjects, useCreateProject, useDeleteProject, useReorderProjects } from '@/entities/project/api/useProjectQuery'
import { useSessionContext, useCurrentSession, useSessionState, sessionStore, listModelsApi, listSessionBranchesApi, createSessionBranchApi } from '@/entities/session'
import { SessionSidebar, NewProjectDialog } from '@/features/session-list'
import { MessageList } from '@/features/message-display'
import { MessageInput, useSessionStats } from '@/features/send-message'
import type { MessageInputHandle } from '@/features/send-message'
import { RuntimeActionDock } from '@/features/runtime-dock'
import { QueryRuntimeBar } from '@/features/cancel-query'
import { ChatToolbar } from '@/features/input-toolbar'
import { HeaderToolbar } from '@/features/header-toolbar'
import { RewindPicker, type RewindItem } from '@/features/rewind-picker'
import { UsagePanel } from '@/features/usage-panel'
import { MultiSessionDialog } from '@/features/multi-session-dialog'
import { SettingsDialog } from '@/features/settings'
import { TerminalDrawer } from '@/features/terminal'
import { GitManagerDialog } from '@/features/git-manager'
import { WorkspacePanel } from '@/features/workspace'
import { SessionDashboard } from '@/features/session-dashboard'
import { useCompactContext } from '@/features/compact-context'
import { useClearContext } from '@/features/clear-context'
import { useTaskProgress, TaskProgressPanel } from '@/features/task-progress'
import { MobileHeader, MobileNavStack, MobileMoreSheet } from '@/features/mobile-nav'
import { MemoryDialog } from '@/features/memory-manager'
import { ImDialog, useImBinding } from '@/features/im-binding'
import { EvolutionDialog } from '@/features/evolution'
import { PluginManagerDialog } from '@/features/plugin-manager'
import { AgentDialog } from '@/features/agent-manager'
import { CommandPalettePopover, useCommandPalette } from '@/features/command-palette'
import { useGlobalHotkeys } from '@/shared/lib/useGlobalHotkeys'
import { useViewport } from '@/shared/lib/useViewport'
import { AppToast, useToast } from '@/shared/ui/AppToast'
import { formatDurationLong } from '@/shared/lib/formatTime'
import type { SessionSummary } from '@/shared/types/api'

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

  const projects = Array.isArray(projectsData) ? projectsData : []

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [scheduleCounts, setScheduleCounts] = useState<Record<string, number>>({})
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [terminalVisible, setTerminalVisible] = useState(false)
  const [workspaceVisible, setWorkspaceVisible] = useState(false)
  const [gitManagerVisible, setGitManagerVisible] = useState(false)
  const [notificationsVisible, setNotificationsVisible] = useState(false)
  const [workingSessionsVisible, setWorkingSessionsVisible] = useState(false)
  const [newProjectVisible, setNewProjectVisible] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const { isMobile } = useViewport()
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  const handleHotkeyAction = useCallback(
    (action: { type: string }) => {
      switch (action.type) {
        case 'toggle_settings':
          setSettingsVisible((v) => !v); break
        case 'toggle_sidebar':
          setSidebarCollapsed((v) => !v); break
        case 'toggle_terminal':
          setTerminalVisible((v) => !v); break
        case 'toggle_workspace':
          setWorkspaceVisible((v) => !v); break
        case 'toggle_notifications':
          setNotificationsVisible((v) => !v); break
        case 'escape': {
          if (mobileNavOpen) setMobileNavOpen(false)
          else if (mobileMoreOpen) setMobileMoreOpen(false)
          else if (newProjectVisible) setNewProjectVisible(false)
          else if (settingsVisible) setSettingsVisible(false)
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
    [currentSessionId, sessionList, setCurrentSessionId,
      settingsVisible, terminalVisible, workspaceVisible, gitManagerVisible,
      notificationsVisible, workingSessionsVisible, newProjectVisible,
      mobileNavOpen, mobileMoreOpen],
  )

  const anyDialogOpen = settingsVisible || terminalVisible || workspaceVisible
    || gitManagerVisible || notificationsVisible || workingSessionsVisible || newProjectVisible
    || mobileNavOpen || mobileMoreOpen

  useGlobalHotkeys({ onAction: handleHotkeyAction, dialogOpen: anyDialogOpen })

  // ── Session handlers ──

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

  // ── Project handlers ──

  const handleCreateProject = useCallback(async (name: string, path: string) => {
    try {
      await createProject.mutateAsync({ name, path })
      setNewProjectVisible(false)
      showToast(`Project "${name}" created`, 'success')
    } catch {
      showToast('Failed to create project', 'error')
    }
  }, [createProject, showToast])

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

  const sessionListData = Array.isArray(sessionsData) ? sessionsData : []

  // Sync session list to store
  useEffect(() => {
    if (sessionListData.length > 0) {
      sessionStore.setSessions(sessionListData)
    }
  }, [sessionListData])

  // Auto-select first session on load
  useEffect(() => {
    if (sessionListData.length > 0 && !currentSessionId) {
      const lastId = localStorage.getItem('pf_last_session_id')
      const target = lastId ? sessionListData.find((s) => s.session_id === lastId) : undefined
      setCurrentSessionId(target?.session_id || sessionListData[0].session_id)
    }
  }, [sessionListData, currentSessionId, setCurrentSessionId])

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('pf_last_session_id', currentSessionId)
    }
  }, [currentSessionId])

  // Init global events
  useEffect(() => {
    sessionStore.initGlobalEvents()
    return () => { sessionStore.destroyGlobalEvents() }
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
            {[1, 2, 3, 4].map((i) => <div key={i} className="skel-circle" />)}
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
            <div className="empty-state"><span>Loading...</span></div>
          </main>
        </div>
      </div>
    )
  }

  const projectLabel = currentSession?.session?.project_dir
    ? getProjectDirName(currentSession.session.project_dir)
    : '选择项目'

  return (
    <div className="app-shell">
      {isMobile ? (
        <MobileHeader
          projectLabel={projectLabel}
          sessionLabel={currentSession?.session?.name || ''}
          onOpenNav={() => setMobileNavOpen(true)}
          onOpenMore={() => setMobileMoreOpen(true)}
          onNotificationNavigate={(sessionId) => {
            if (typeof sessionId === 'string') setCurrentSessionId(sessionId)
          }}
        />
      ) : (
        <header className="app-header">
          <div className="header-left">
            <button
              className="header-menu-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
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
      )}

      <div className="app-body">
        {!isMobile && (
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
            onCreateProject={() => setNewProjectVisible(true)}
            onDeleteProject={handleDeleteProject}
            onOpenScheduler={handleOpenScheduler}
            onReorderProjects={(ids) => reorderProjects.mutate(ids)}
          />
        )}

        <main className="app-main">
          {currentSessionId ? (
            <ChatPanel
              sessionId={currentSessionId}
              onOpenBranch={() => setGitManagerVisible(true)}
              onSelectSession={setCurrentSessionId}
            />
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
      <NewProjectDialog
        open={newProjectVisible}
        onClose={() => setNewProjectVisible(false)}
        onSubmit={handleCreateProject}
      />
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
      <MobileNavStack
        visible={mobileNavOpen}
        sessions={sessionList}
        currentSessionId={currentSessionId}
        sidebarMode="sessions"
        onVisibleChange={setMobileNavOpen}
        onSessionSelect={(session) => setCurrentSessionId(session.session_id)}
        onNewProject={() => setNewProjectVisible(true)}
        onNewSession={(projectId) => { void handleCreateInProject(projectId) }}
        onDeleteSession={handleDeleteSession}
        onCopySession={(id) => { void handleCopySession(id) }}
      />
      <MobileMoreSheet
        visible={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        onOpenSettings={() => { setMobileMoreOpen(false); setSettingsVisible(true) }}
        onOpenGit={() => { setMobileMoreOpen(false); setGitManagerVisible(true) }}
        onOpenWorkspace={() => { setMobileMoreOpen(false); setWorkspaceVisible(true) }}
        onOpenTerminal={() => { setMobileMoreOpen(false); setTerminalVisible(true) }}
        onOpenWorkingSessions={() => { setMobileMoreOpen(false); setWorkingSessionsVisible(true) }}
      />
    </div>
  )
}

// ── SessionDashboard helpers ──

const PERM_MODES = ['default', 'acceptEdits', 'plan', 'bypass'] as const

function getProjectDirName(path: string): string {
  if (!path) return ''
  return path.split('/').filter(Boolean).pop() || path
}

function formatPermissionMode(mode?: string): string {
  switch (mode) {
    case 'default': return 'Default'
    case 'acceptEdits': return 'Accept Edits'
    case 'plan': return 'Plan'
    case 'bypass': return 'Bypass'
    default: return mode || 'Default'
  }
}

function getPermColorClass(mode?: string): string {
  switch (mode) {
    case 'bypass': return 'perm-red'
    case 'plan': return 'perm-yellow'
    case 'acceptEdits': return 'perm-green'
    default: return 'perm-green'
  }
}

function getContextColorClass(percent: number): string {
  if (percent >= 90) return 'ctx-red'
  if (percent >= 60) return 'ctx-yellow'
  return 'ctx-green'
}

function formatProviderLabel(provider?: string): string {
  if (!provider) return ''
  if (provider === 'claude' || provider === 'anthropic') return ''
  if (provider === 'cursor' || provider === 'acp') return 'Cursor'
  return provider
}

// ── ChatPanel: the main conversation area ──

interface ModelOption {
  value: string
  label?: string
  description?: string
}

function ChatPanel({
  sessionId,
  onOpenBranch,
  onSelectSession,
}: {
  sessionId: string
  onOpenBranch?: () => void
  onSelectSession?: (id: string) => void
}) {
  const state = useSessionState(sessionId)
  const inputRef = useRef<MessageInputHandle>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [runtimePanelVisible, setRuntimePanelVisible] = useState(false)
  const [rewindPickerOpen, setRewindPickerOpen] = useState(false)
  const [usagePanelOpen, setUsagePanelOpen] = useState(false)
  const [multiSessionOpen, setMultiSessionOpen] = useState(false)
  const [showTaskPanel, setShowTaskPanel] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [imOpen, setImOpen] = useState(false)
  const [evolutionOpen, setEvolutionOpen] = useState(false)
  const [pluginOpen, setPluginOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [branchSessions, setBranchSessions] = useState<SessionSummary[]>([])
  const [now, setNow] = useState(() => Date.now())

  const { compacting, compactContext } = useCompactContext()
  const { clearing, clearContext } = useClearContext()
  const { contextUsage, toolStats, gitBranch: statsGitBranch } = useSessionStats(sessionId)
  const im = useImBinding()

  const status = state?.status || 'disconnected'
  const messages = state?.messages || []
  const session = state?.session
  const projectDir = session?.project_dir || ''
  const projectId = session?.project_id || ''
  const { planTaskCounts, hasPlanTasks } = useTaskProgress(messages as never, status)
  const commandPalette = useCommandPalette(projectDir || null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    void im.fetchChannels()
    void im.fetchStatus(sessionId)
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (projectDir) {
      void commandPalette.loadCommands(session?.provider || 'claude')
    }
  }, [projectDir, session?.provider]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!modelMenuOpen) return
    listModelsApi(session?.provider || '').then((list) => {
      const opts = (list as ModelOption[]).map((m) => ({
        value: m.value || String((m as { id?: string }).id || ''),
        label: m.label || m.value,
        description: m.description,
      })).filter((m) => m.value)
      setModels(opts)
    }).catch(() => setModels([]))
  }, [modelMenuOpen, session?.provider])

  useEffect(() => {
    if (!multiSessionOpen) return
    listSessionBranchesApi(sessionId)
      .then((list) => setBranchSessions((list || []) as unknown as SessionSummary[]))
      .catch(() => setBranchSessions([]))
  }, [multiSessionOpen, sessionId])

  const displayMessages = debugMode
    ? messages
    : messages.filter((m) => m.role !== 'system' && m.type !== 'tool_use')

  const rewindItems: RewindItem[] = messages
    .filter((m) => m.role === 'user')
    .map((m, i) => ({
      key: m.id || `msg-${i}`,
      index: i,
      label: `#${messages.length - i}`,
      text: typeof m.content?.text === 'string' ? m.content.text : '(attachment / structured)',
      messageId: m.id,
    }))

  const totalInputTokens = (state?.queryHistory || []).reduce((s, q) => s + (q.usage?.input_tokens || 0), 0)
  const totalOutputTokens = (state?.queryHistory || []).reduce((s, q) => s + (q.usage?.output_tokens || 0), 0)

  const projectDirName = getProjectDirName(projectDir)
  const modelLabel = session?.model || 'default'
  const gitBranch = statsGitBranch || session?.git_branch || ''
  const permMode = session?.permission_mode || 'default'
  const isRunning = status === 'running'
  const showClaudeControls = !session?.provider || session.provider === 'claude' || session.provider === 'anthropic'
  const createdAt = session?.created_at ? new Date(session.created_at).getTime() : 0
  const sessionElapsed = createdAt ? formatDurationLong(now - createdAt) : ''
  const agentProviderLabel = formatProviderLabel(session?.provider)
  const totalToolCalls = toolStats.reduce((sum, t) => sum + t.count, 0)
  const topTools = toolStats.slice(0, 5)
  const claudeResumeCommand = showClaudeControls ? `claude --resume ${sessionId}` : ''
  const hasChannels = im.availableChannels.length > 0
  const isBoundForSession = im.isBound
  const boundChannelType = im.bindingState?.channel_type || ''
  const boundInstanceName = im.bindingState?.display_name || ''

  const handleCyclePermission = useCallback(() => {
    const conn = sessionStore.getWsConnection(sessionId)
    if (!conn) return
    const idx = PERM_MODES.indexOf(permMode as typeof PERM_MODES[number])
    const next = PERM_MODES[(idx >= 0 ? idx + 1 : 0) % PERM_MODES.length]
    conn.send({ action: 'set_permission_mode', mode: next })
  }, [sessionId, permMode])

  const handleSelectModel = useCallback((model: string) => {
    const conn = sessionStore.getWsConnection(sessionId)
    conn?.send({ action: 'set_model', model })
    setModelMenuOpen(false)
  }, [sessionId])

  const handleOpenCommandPalette = useCallback(() => {
    void commandPalette.loadCommands(session?.provider || 'claude')
    commandPalette.togglePanel()
  }, [commandPalette, session?.provider])

  const handleCreateBranch = useCallback(async () => {
    try {
      const created = await createSessionBranchApi(sessionId, Math.max(0, messages.length - 1))
      onSelectSession?.(created.session_id)
      setMultiSessionOpen(false)
    } catch { /* empty */ }
  }, [sessionId, messages.length, onSelectSession])

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={displayMessages} status={status} />
      {(runtimePanelVisible || isRunning || state?.queued) && (
        <QueryRuntimeBar
          sessionId={sessionId}
          status={status}
          queryStartedAt={state?.queryStartedAt ?? null}
          queued={state?.queued}
          queuedPrompt={state?.queuedPrompt}
          error={state?.error}
        />
      )}
      <RuntimeActionDock sessionId={sessionId} state={state} />
      {showTaskPanel && hasPlanTasks && (
        <TaskProgressPanel messages={messages as never} status={status} />
      )}
      <div className="session-dashboard-wrap" style={{ position: 'relative' }}>
        <SessionDashboard
          sessionId={sessionId}
          projectDir={projectDir}
          projectDirName={projectDirName}
          modelLabel={modelLabel}
          gitBranch={gitBranch}
          permModeLabel={formatPermissionMode(permMode)}
          permModeColorClass={getPermColorClass(permMode)}
          sessionElapsed={sessionElapsed}
          agentProviderLabel={agentProviderLabel}
          contextUsage={{
            current: contextUsage.current,
            max: contextUsage.max,
            percent: contextUsage.percent,
          }}
          contextColorClass={getContextColorClass(contextUsage.percent)}
          compacting={compacting}
          isRunning={isRunning}
          showClaudeControls={showClaudeControls}
          hasPlanTasks={hasPlanTasks}
          planTaskCounts={{
            total: planTaskCounts.total,
            completed: planTaskCounts.completed,
            inProgress: planTaskCounts.in_progress,
          }}
          totalToolCalls={totalToolCalls}
          topTools={topTools}
          toolStats={toolStats}
          budgetStatus={null}
          claudeResumeCommand={claudeResumeCommand}
          onCompact={() => { void compactContext(sessionId) }}
          onModelClick={() => setModelMenuOpen((v) => !v)}
          onBranchClick={() => onOpenBranch?.()}
          onPermClick={handleCyclePermission}
          onTaskPanelToggle={() => setShowTaskPanel((v) => !v)}
          showTaskPanel={showTaskPanel}
        />
        {modelMenuOpen && (
          <div className="dropdown-menu model-menu" style={{ position: 'absolute', bottom: '100%', left: 12, zIndex: 40, minWidth: 220 }}>
            {models.length === 0 ? (
              <div className="dropdown-empty" style={{ padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>No models</div>
            ) : models.map((m) => (
              <button
                key={m.value}
                className={`dropdown-item${m.value === modelLabel ? ' active' : ''}`}
                onClick={() => handleSelectModel(m.value)}
                title={m.description || m.value}
              >
                {m.label || m.value}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="send-message-area">
        <ChatToolbar
          sessionId={sessionId}
          projectDir={projectDir}
          projectId={projectId}
          debugMode={debugMode}
          runtimePanelVisible={runtimePanelVisible}
          isRunning={isRunning}
          showClaudeControls={showClaudeControls}
          hasChannels={hasChannels}
          isBoundForSession={isBoundForSession}
          boundChannelType={boundChannelType}
          boundInstanceName={boundInstanceName}
          currentAgentInfo={null}
          parallelBranchCount={branchSessions.length}
          queryHistoryCount={state?.queryHistory?.length || 0}
          clearing={clearing}
          voiceSupported={false}
          videoSupported={false}
          onToggleDebug={() => setDebugMode((v) => !v)}
          onToggleRuntime={() => setRuntimePanelVisible((v) => !v)}
          onToggleMediaMenu={() => {}}
          onOpenAgent={() => setAgentOpen(true)}
          onOpenPlugin={() => setPluginOpen(true)}
          onOpenMemory={() => setMemoryOpen(true)}
          onOpenMultiSession={() => setMultiSessionOpen(true)}
          onOpenCommandPalette={handleOpenCommandPalette}
          onClear={() => { void clearContext(sessionId) }}
          onToggleUsage={() => setUsagePanelOpen((v) => !v)}
          onOpenIM={() => setImOpen(true)}
          onOpenBranch={onOpenBranch}
        />
        <MessageInput
          ref={inputRef}
          sessionId={sessionId}
          disabled={status === 'disconnected' || status === 'error'}
          running={isRunning}
          slashCommands={commandPalette.invokableCommands.map((c) => ({
            name: c.name,
            description: c.description,
          }))}
        />
      </div>

      <RewindPicker
        open={rewindPickerOpen}
        items={rewindItems}
        onRewindTo={() => setRewindPickerOpen(false)}
        onClose={() => setRewindPickerOpen(false)}
      />
      <UsagePanel
        open={usagePanelOpen}
        queryHistory={state?.queryHistory || []}
        totalInputTokens={totalInputTokens}
        totalOutputTokens={totalOutputTokens}
        isRunning={isRunning}
        runningDuration=""
        runningStatusText=""
        onClose={() => setUsagePanelOpen(false)}
      />
      <MultiSessionDialog
        open={multiSessionOpen}
        sessions={branchSessions}
        currentSessionId={sessionId}
        onSelectSession={(id) => {
          onSelectSession?.(id)
          setMultiSessionOpen(false)
        }}
        onCompare={() => {}}
        onClose={() => setMultiSessionOpen(false)}
      />
      {multiSessionOpen && (
        <div className="multi-session-create-bar" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}>
          <button
            className="glass-btn glass-btn--accent"
            onClick={() => { void handleCreateBranch() }}
            title="Create parallel branch session"
          >
            Create branch
          </button>
        </div>
      )}
      <MemoryDialog
        visible={memoryOpen}
        projectDir={projectDir}
        projectId={projectId}
        onClose={() => setMemoryOpen(false)}
        onEvolve={() => { setMemoryOpen(false); setEvolutionOpen(true) }}
      />
      <ImDialog
        visible={imOpen}
        sessionId={sessionId}
        projectId={projectId}
        onClose={() => setImOpen(false)}
        onNavigateSession={onSelectSession}
      />
      <EvolutionDialog
        visible={evolutionOpen}
        projectId={projectId}
        projectDir={projectDir}
        sessionId={sessionId}
        onClose={() => setEvolutionOpen(false)}
      />
      <PluginManagerDialog
        visible={pluginOpen}
        projectDir={projectDir}
        onClose={() => setPluginOpen(false)}
      />
      <AgentDialog
        visible={agentOpen}
        projectId={projectId}
        onClose={() => setAgentOpen(false)}
      />
      <CommandPalettePopover
        visible={commandPalette.visible}
        commands={commandPalette.paletteCommands}
        policyRows={commandPalette.policyRows}
        loading={commandPalette.loading}
        searchQuery={commandPalette.searchQuery}
        onSelect={(cmd) => {
          inputRef.current?.appendText(`/${cmd.name} `)
          commandPalette.closePanel()
        }}
        onClose={commandPalette.closePanel}
        onSearchQueryChange={commandPalette.setSearchQuery}
        onPolicyChange={(row, patch) => { void commandPalette.updateCommandPolicy(row, patch) }}
      />
    </div>
  )
}

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
