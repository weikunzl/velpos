'use client'

interface ResultMeta {
  is_error?: boolean
  duration_ms?: number
  num_turns?: number
  usage?: unknown
}

interface Props {
  result: {
    html?: string
    meta?: ResultMeta
  }
}

export function ResultBlock({ result }: Props) {
  if (!result.meta?.is_error) return null

  return (
    <div className="msg-result error">
      <div className="result-divider">
        <div className="divider-line" />
        <div className="result-badge">
          <span className="result-dot" />
          <span className="result-label">Error</span>
        </div>
        <div className="divider-line" />
      </div>
      {result.html && (
        <div className="result-text markdown-body" dangerouslySetInnerHTML={{ __html: result.html }} />
      )}
    </div>
  )
}
