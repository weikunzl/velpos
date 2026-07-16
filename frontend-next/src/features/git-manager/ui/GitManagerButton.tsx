'use client'

interface GitManagerButtonProps {
  onClick: () => void
}

export function GitManagerButton({ onClick }: GitManagerButtonProps) {
  return (
    <button className="glass-btn" onClick={onClick} title="Git Management">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
      <span className="git-btn-label">Git</span>
    </button>
  )
}
