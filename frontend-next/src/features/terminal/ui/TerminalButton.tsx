'use client'

interface TerminalButtonProps {
  disabled?: boolean
  active?: boolean
  onClick: () => void
}

export function TerminalButton({ disabled = false, active = false, onClick }: TerminalButtonProps) {
  return (
    <button
      className={`glass-btn glass-btn--icon${active ? ' active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title="Terminal"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    </button>
  )
}
