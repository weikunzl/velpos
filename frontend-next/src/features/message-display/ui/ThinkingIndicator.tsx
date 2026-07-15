'use client'

export function ThinkingIndicator() {
  return (
    <div
      className="message-bubble message-assistant"
      style={{ maxWidth: 120, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 4 }}
    >
      <span className="runtime-spinner" />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Thinking...</span>
    </div>
  )
}
