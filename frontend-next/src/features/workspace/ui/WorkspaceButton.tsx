'use client'

interface WorkspaceButtonProps {
  active?: boolean
  onClick: () => void
}

export function WorkspaceButton({ active = false, onClick }: WorkspaceButtonProps) {
  return (
    <button
      className={`workspace-button${active ? ' active' : ''}`}
      onClick={onClick}
      title="Workspace files"
      aria-label="Workspace files"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>
        <path d="M3 10h18"/>
      </svg>
    </button>
  )
}
