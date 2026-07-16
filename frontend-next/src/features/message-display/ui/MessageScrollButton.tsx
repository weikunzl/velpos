'use client'

interface MessageScrollButtonProps {
  visible: boolean
  onClick: () => void
}

export function MessageScrollButton({ visible, onClick }: MessageScrollButtonProps) {
  if (!visible) return null

  return (
    <button
      type="button"
      className="scroll-bottom-btn"
      onClick={onClick}
      title="Scroll to bottom"
      aria-label="Scroll to bottom"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}
