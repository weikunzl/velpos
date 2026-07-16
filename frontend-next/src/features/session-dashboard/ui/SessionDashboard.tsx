'use client'

export interface ContextUsage {
  current: number
  max: number
  percent: number
}

export interface ToolStat {
  name: string
  count: number
}

export interface PlanTaskCounts {
  total: number
  completed: number
  inProgress: number
}

export interface BudgetStatus {
  state: string
}

export interface SessionDashboardProps {
  sessionId: string
  projectDir: string
  projectDirName: string
  modelLabel: string
  gitBranch: string
  permModeLabel: string
  permModeColorClass: string
  sessionElapsed: string
  agentProviderLabel: string
  contextUsage: ContextUsage
  contextColorClass: string
  compacting: boolean
  isRunning: boolean
  showClaudeControls: boolean
  hasPlanTasks: boolean
  planTaskCounts: PlanTaskCounts
  totalToolCalls: number
  topTools: ToolStat[]
  toolStats: ToolStat[]
  budgetStatus: BudgetStatus | null
  claudeResumeCommand: string

  onCompact: () => void
  onModelClick: () => void
  onBranchClick: () => void
  onPermClick: () => void
  onTaskPanelToggle: () => void
  showTaskPanel: boolean
}

export function SessionDashboard({
  sessionId,
  projectDir: _projectDir,
  projectDirName,
  modelLabel,
  gitBranch,
  permModeLabel,
  permModeColorClass,
  sessionElapsed,
  agentProviderLabel,
  contextUsage,
  contextColorClass,
  compacting,
  isRunning,
  showClaudeControls,
  hasPlanTasks,
  planTaskCounts,
  totalToolCalls,
  topTools,
  toolStats,
  budgetStatus,
  claudeResumeCommand,
  onCompact,
  onModelClick,
  onBranchClick,
  onPermClick,
  onTaskPanelToggle,
  showTaskPanel: _showTaskPanel,
}: SessionDashboardProps) {
  return (
    <div className="session-dashboard">
      {/* Context usage bar: full width */}
      <button
        className={`context-bar-btn ${contextColorClass}`}
        disabled={isRunning || compacting || !showClaudeControls}
        onClick={onCompact}
        title={
          showClaudeControls
            ? `Context: ${contextUsage.current.toLocaleString()} / ${contextUsage.max.toLocaleString()} tokens — Click to compact`
            : `Context: ${contextUsage.current.toLocaleString()} / ${contextUsage.max.toLocaleString()} tokens`
        }
      >
        <span className="context-bar-track">
          <span
            className={`context-bar-fill ${contextColorClass}`}
            style={{ width: `${contextUsage.percent}%` }}
          />
          <span className="context-track-label">
            {formatTokenCount(contextUsage.max)}
            {compacting && <span className="context-compacting"> · compacting…</span>}
          </span>
        </span>
        <span className="context-pct">{contextUsage.percent}%</span>
      </button>

      {/* Info chips row */}
      <div className="dash-row">
        <div className="dash-row-scroll">
          {/* Project dir */}
          {projectDirName && (
            <span className="dash-chip dash-project" title={_projectDir}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {projectDirName}
            </span>
          )}

          {/* Session ID chip */}
          <span
            className="dash-chip dash-session-id"
            title={
              showClaudeControls && claudeResumeCommand
                ? `${claudeResumeCommand} — Click to locate & copy`
                : 'Session ID'
            }
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            {sessionId || 'session'}
          </span>

          {/* Session elapsed */}
          {sessionElapsed && (
            <span className="dash-chip dash-elapsed" title="Session duration">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              {sessionElapsed}
            </span>
          )}

          {/* Provider label */}
          {agentProviderLabel && (
            <span className="dash-chip dash-provider" title="Agent provider">
              {agentProviderLabel}
            </span>
          )}

          {/* Model */}
          {showClaudeControls ? (
            <button className="dash-chip dash-model" onClick={onModelClick} title="Switch model">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              {modelLabel}
            </button>
          ) : (
            <span className="dash-chip dash-model" title="Agent model">{modelLabel}</span>
          )}

          {/* Git branch */}
          {gitBranch && (
            <button className="dash-chip dash-branch" title={`Branch: ${gitBranch}`} onClick={onBranchClick}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              {gitBranch}
            </button>
          )}

          {/* Permission mode */}
          {showClaudeControls && (
            <button
              className={`dash-chip dash-perm ${permModeColorClass}`}
              onClick={onPermClick}
              title="Permission mode"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {permModeLabel}
            </button>
          )}

          {/* Plan / task progress */}
          {hasPlanTasks && (
            <button
              className={`dash-chip dash-agent${planTaskCounts.inProgress > 0 ? ' dash-agent--running' : ''}`}
              onClick={onTaskPanelToggle}
              title={`Plan: ${planTaskCounts.completed}/${planTaskCounts.total}`}
            >
              {planTaskCounts.inProgress > 0 ? (
                <span className="agent-dot" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className="dash-chip-main">Plan</span>
              <span className="dash-chip-count">{planTaskCounts.completed}/{planTaskCounts.total}</span>
              {planTaskCounts.inProgress > 0 && <span className="dash-chip-state">active</span>}
            </button>
          )}
        </div>
      </div>

      {/* Tool + Budget summary row */}
      {(totalToolCalls > 0 || (budgetStatus?.state && budgetStatus.state !== 'none')) && (
        <div className="dash-row tool-summary-row">
          {budgetStatus?.state && budgetStatus.state !== 'none' && (
            <span className={`dash-chip dash-budget budget-${budgetStatus.state}`}>
              Budget {budgetStatus.state}
            </span>
          )}
          {totalToolCalls > 0 && (
            <span
              className="dash-chip dash-tools"
              title={toolStats.map((t) => `${t.name}: ${t.count}`).join(', ')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              {topTools.map((tool, i) => (
                <span key={tool.name}>
                  {i > 0 && <span className="tool-sep">/</span>}
                  <span className="tool-name">{tool.name}</span>
                  <span className="tool-count">{tool.count}</span>
                </span>
              ))}
              {toolStats.length > 5 && <span className="tool-more">+{toolStats.length - 5}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
