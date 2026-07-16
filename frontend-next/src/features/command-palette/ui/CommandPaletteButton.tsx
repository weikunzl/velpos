'use client'

interface Props {
  disabled?: boolean
  onClick?: () => void
}

export function CommandPaletteButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className="glass-btn glass-btn--accent cmd-btn"
      disabled={disabled}
      onClick={onClick}
      data-tooltip="Skills"
      title="View available commands"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    </button>
  )
}
