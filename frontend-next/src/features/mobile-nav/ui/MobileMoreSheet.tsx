'use client'

import { useTheme } from '@/shared/lib/useTheme'
import { useWorkingSessions } from '@/features/working-sessions/model/useWorkingSessions'

interface Props {
  visible: boolean
  onClose: () => void
  onOpenSettings: () => void
  onOpenGit: () => void
  onOpenWorkspace: () => void
  onOpenTerminal: () => void
  onOpenWorkingSessions: () => void
}

const themeLabel: Record<string, string> = {
  dark: '深色',
  light: '浅色',
  sepia: '护眼',
}

export function MobileMoreSheet({
  visible,
  onClose,
  onOpenSettings,
  onOpenGit,
  onOpenWorkspace,
  onOpenTerminal,
  onOpenWorkingSessions,
}: Props) {
  const { theme, cycleTheme } = useTheme()
  const { workingCount } = useWorkingSessions()

  function nextThemeLabel() {
    if (theme === 'dark') return '切换到浅色'
    if (theme === 'light') return '切换到护眼'
    return '切换到深色'
  }

  if (!visible) return null

  return (
    <div className="mm-root" onClick={onClose}>
      <div className="mm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mm-handle" />
        <div className="mm-title">更多操作</div>

        <div className="mm-grid">
          <button className="mm-item" onClick={onOpenSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span>Settings</span>
          </button>

          <button className="mm-item" onClick={onOpenGit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span>Git</span>
          </button>

          <button className="mm-item" onClick={cycleTheme}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>{themeLabel[theme] || theme}</span>
          </button>

          <button className="mm-item" onClick={onOpenWorkspace}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Workspace</span>
          </button>

          <button className="mm-item" onClick={onOpenTerminal}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Terminal</span>
          </button>

          <button className="mm-item" onClick={onOpenWorkingSessions}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Working Sessions{workingCount > 0 ? ` (${workingCount})` : ''}</span>
          </button>
        </div>

        <div className="mm-theme-hint">{nextThemeLabel()}</div>
      </div>

      <style>{`
        .mm-root {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: var(--overlay-glass);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: mm-bg-in var(--motion-medium) var(--ease-out) both;
        }
        .mm-sheet {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          border-top: 1px solid var(--glass-border);
          padding: 8px 20px calc(12px + var(--safe-bottom, 0px));
          box-shadow: var(--shadow-glass);
          animation: mm-sheet-in var(--motion-emphasis) var(--ease-spring) both;
        }
        .mm-handle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--text-muted);
          margin: 0 auto 12px;
          opacity: 0.3;
        }
        .mm-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          margin-bottom: 16px;
        }
        .mm-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .mm-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: var(--bg-hover);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 11px;
          transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
        }
        .mm-item:hover,
        .mm-item:active {
          background: var(--layer-active);
          color: var(--accent);
          border-color: color-mix(in srgb, var(--accent) 30%, transparent);
        }
        .mm-theme-hint {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 12px;
        }
        @keyframes mm-bg-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mm-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
