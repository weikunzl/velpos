'use client'

import { ClearContextButton } from '@/features/clear-context'
import { ImButton } from '@/features/im-binding'
import { MemoryButton } from '@/features/memory-manager'

export interface ToolbarGroup {
  id: string
  label?: string
}

export interface ChatToolbarProps {
  sessionId: string
  projectDir: string
  projectId: string
  debugMode: boolean
  runtimePanelVisible: boolean
  isRunning: boolean
  showClaudeControls: boolean
  hasChannels: boolean
  isBoundForSession: boolean
  boundChannelType: string
  boundInstanceName: string
  currentAgentInfo: string | null
  parallelBranchCount: number
  queryHistoryCount: number
  clearing: boolean
  voiceSupported: boolean
  videoSupported: boolean

  onToggleDebug: () => void
  onToggleRuntime: () => void
  onToggleMediaMenu: () => void
  onOpenAgent: () => void
  onOpenPlugin: () => void
  onOpenMemory: () => void
  onOpenMultiSession: () => void
  onOpenCommandPalette: () => void
  onClear: () => void
  onToggleUsage: () => void
  onOpenIM: () => void
  onOpenBranch?: () => void
}

export function ChatToolbar({
  sessionId,
  projectDir,
  projectId: _projectId,
  debugMode,
  runtimePanelVisible,
  isRunning,
  showClaudeControls,
  hasChannels,
  isBoundForSession,
  boundChannelType,
  boundInstanceName,
  currentAgentInfo,
  parallelBranchCount,
  queryHistoryCount,
  clearing,
  onToggleDebug,
  onToggleRuntime,
  onOpenAgent,
  onOpenPlugin,
  onOpenMemory,
  onOpenMultiSession,
  onOpenCommandPalette,
  onClear,
  onToggleUsage,
  onOpenIM,
  onOpenBranch = () => {},
}: ChatToolbarProps) {
  return (
    <div className="input-toolbar">
      {/* Group 1: Debug + Runtime */}
      <div className="toolbar-group">
        <ToolbarBtn
          active={debugMode}
          onClick={onToggleDebug}
          title={debugMode ? 'Debug: ON — tool calls visible' : 'Debug: OFF — user messages only'}
          label="Debug"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2l1.88 1.88" /><path d="M14.12 3.88 16 2" />
            <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
            <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
            <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
            <path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
            <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" />
            <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
          </svg>
        </ToolbarBtn>
        <ToolbarBtn
          active={runtimePanelVisible}
          onClick={onToggleRuntime}
          title="Runtime — show current activity"
          label="Runtime"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            <polyline points="7 10 10 13 17 8" />
          </svg>
        </ToolbarBtn>
      </div>

      {/* Group 2: Agent / Plugin / Memory / Multi-session (Claude controls only) */}
      {showClaudeControls && (
        <div className="toolbar-group">
          <ToolbarBtn
            active={!!currentAgentInfo}
            disabled={!sessionId || !_projectId}
            onClick={onOpenAgent}
            title={currentAgentInfo ? `Agent: ${currentAgentInfo}` : 'Select Agent'}
            label="Agent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" />
              <rect x="3" y="8" width="18" height="12" rx="2" /><line x1="9" y1="13" x2="9.01" y2="13" />
              <line x1="15" y1="13" x2="15.01" y2="13" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            disabled={!sessionId}
            onClick={onOpenPlugin}
            title="Plugin management"
            label="Plugin"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
              <rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </ToolbarBtn>
          <MemoryButton
            disabled={!sessionId || !projectDir}
            onClick={onOpenMemory}
          />
          <ToolbarBtn
            disabled={isRunning || !sessionId}
            onClick={onOpenMultiSession}
            title="Multi-session: create parallel sessions"
            label="Multi-session"
            badge={parallelBranchCount > 0 ? parallelBranchCount : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
              <path d="M8.5 8.5 11 15" /><path d="M15.5 8.5 13 15" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            disabled={!sessionId || !projectDir}
            onClick={onOpenBranch}
            title="Git branch management"
            label="Branch"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          </ToolbarBtn>
        </div>
      )}

      {/* Group 3: Actions */}
      <div className="toolbar-group">
        <ToolbarBtn
          onClick={onOpenCommandPalette}
          disabled={!projectDir}
          title="Command palette"
          label="Commands"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </ToolbarBtn>
        {showClaudeControls && (
          <ClearContextButton
            disabled={isRunning || !sessionId}
            clearing={clearing}
            onClear={onClear}
          />
        )}
        <ToolbarBtn
          onClick={onToggleUsage}
          disabled={!sessionId}
          badge={queryHistoryCount > 0 ? queryHistoryCount : undefined}
          title="Usage and query history"
          label="Usage"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </ToolbarBtn>
        {hasChannels && (
          <ImButton
            disabled={!sessionId}
            bound={isBoundForSession}
            channelType={boundChannelType}
            instanceName={boundInstanceName}
            onClick={onOpenIM}
          />
        )}
      </div>
    </div>
  )
}

// ── Internal ToolbarBtn component ──

interface ToolbarBtnProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title?: string
  label?: string
  badge?: number | string
  children: React.ReactNode
}

function ToolbarBtn({ active = false, disabled = false, onClick, title, label, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      className={`toolbar-btn${active ? ' toolbar-btn--active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      data-tooltip={label || title}
    >
      {children}
    </button>
  )
}
