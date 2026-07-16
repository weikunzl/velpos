'use client'

import ThemeSwitcher from '@/shared/ui/ThemeSwitcher'
import { NotificationBell } from '@/features/notification-center'
import { WorkingSessionsButton } from '@/features/working-sessions'
import { WorkspaceButton } from '@/features/workspace'

interface HeaderToolbarProps {
  workspaceActive?: boolean
  onNotificationNavigate?: (sessionId: string) => void
  onToggleNotifications: () => void
  onToggleSettings: () => void
  onToggleTerminal: () => void
  onToggleWorkspace: () => void
  onToggleGitManager: () => void
  onToggleWorkingSessions: () => void
}

export function HeaderToolbar({
  workspaceActive = false,
  onNotificationNavigate,
  onToggleNotifications: _onToggleNotifications,
  onToggleSettings,
  onToggleTerminal,
  onToggleWorkspace,
  onToggleGitManager,
  onToggleWorkingSessions: _onToggleWorkingSessions,
}: HeaderToolbarProps) {
  return (
    <div className="header-toolbar">
      <NotificationBell onNavigate={onNotificationNavigate} />
      <WorkingSessionsButton onNavigate={onNotificationNavigate} />

      <button type="button" className="glass-btn" onClick={onToggleGitManager} title="Git Management" aria-label="Git Management">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
        <span className="glass-btn-label git-btn-label">Git</span>
      </button>

      <button type="button" className="glass-btn" onClick={onToggleSettings} title="Settings" aria-label="Settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span className="glass-btn-label settings-btn-label">Settings</span>
      </button>

      <WorkspaceButton active={workspaceActive} onClick={onToggleWorkspace} />

      <button type="button" className="glass-btn glass-btn--icon" onClick={onToggleTerminal} title="Terminal" aria-label="Terminal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </button>

      <div className="header-toolbar-divider" aria-hidden="true" />

      <ThemeSwitcher />
    </div>
  )
}
