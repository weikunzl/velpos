'use client'

interface Props {
  block: {
    tool_name?: string
    tool_input?: string
  }
  answered: boolean
  onRespond: (data: { decision: 'allow' | 'deny' }) => void
}

export function PermissionRequestBlock({ block, answered, onRespond }: Props) {
  return (
    <div className={`permission-block ${answered ? 'perm-answered' : ''}`}>
      <div className="perm-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>Permission Required</span>
      </div>

      <div className="perm-tool">
        <span className="tool-label">Tool:</span>
        <span className="tool-name">{block.tool_name}</span>
      </div>

      {block.tool_input && (
        <div className="perm-input">
          <pre className="input-preview">{block.tool_input}</pre>
        </div>
      )}

      {!answered ? (
        <div className="perm-actions">
          <button className="perm-btn perm-allow" onClick={() => onRespond({ decision: 'allow' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Allow
          </button>
          <button className="perm-btn perm-deny" onClick={() => onRespond({ decision: 'deny' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Deny
          </button>
        </div>
      ) : (
        <div className="perm-resolved">Responded</div>
      )}
    </div>
  )
}
