'use client'

interface PromptBinderProps {
  channelName?: string
  description?: string
  prompt?: string
  disabled?: boolean
  onStart: (prompt?: string) => void
  onBack: () => void
}

export function PromptBinder({
  channelName = '',
  description = '',
  prompt = '',
  disabled = false,
  onStart,
  onBack,
}: PromptBinderProps) {
  return (
    <div className="prompt-binder">
      <button className="back-link" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div className="prompt-info">
        <p className="prompt-desc">
          Bind <strong>{channelName}</strong> to this session.
          {description || ' After starting, the session will listen for messages from this channel.'}
        </p>
        <div className="warning-hint">
          The session will be dedicated to handling channel messages during listening.
        </div>
      </div>
      <button className="btn-start" disabled={disabled} onClick={() => onStart(prompt)}>
        Start Binding
      </button>
    </div>
  )
}
