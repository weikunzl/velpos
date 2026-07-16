'use client'

interface ImButtonProps {
  disabled?: boolean
  bound?: boolean
  channelType?: string
  instanceName?: string
  onClick: () => void
}

const CHANNEL_LABELS: Record<string, string> = {
  openim: 'OpenIM',
  lark: 'Lark',
  qq: 'QQ',
  weixin: 'WeChat',
}

function getLabel(bound: boolean, channelType: string, instanceName: string): string {
  if (!bound) return 'IM'
  if (instanceName) return instanceName
  return CHANNEL_LABELS[channelType] || channelType || 'IM'
}

export function ImButton({ disabled = false, bound = false, channelType = '', instanceName = '', onClick }: ImButtonProps) {
  const label = getLabel(bound, channelType, instanceName)

  return (
    <button
      className={`glass-btn glass-btn--accent im-btn${bound ? ' im-btn--bound' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title="IM Integration"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="im-btn-label">{label}</span>
      {bound && <span className="im-status-dot" />}
    </button>
  )
}
