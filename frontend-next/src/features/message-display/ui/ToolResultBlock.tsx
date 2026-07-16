'use client'

import { useState, useMemo } from 'react'

interface Props {
  result: {
    content?: unknown
    is_error?: boolean
    tool_use_id?: string
  }
}

export function ToolResultBlock({ result }: Props) {
  const [expanded, setExpanded] = useState(false)

  const displayContent = useMemo<string>(() => {
    const content = result.content
    if (content == null || content === '') return ''
    if (typeof content === 'string') return content
    try {
      return JSON.stringify(content, null, 2)
    } catch {
      return String(content)
    }
  }, [result.content])

  return (
    <div className={`msg-tool-result ${result.is_error ? 'error' : ''} ${expanded ? 'is-expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="tool-result-header">
        <span className={`result-icon ${result.is_error ? 'error' : 'success'}`}>
          {result.is_error ? (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="tool-result-label">{result.is_error ? 'Error' : 'Result'}</span>
        {result.content != null && (
          <span className="expand-hint">
            <svg className={expanded ? 'rotated' : ''} width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
            </svg>
          </span>
        )}
      </div>
      <div className="tool-result-content-wrapper">
        {result.content != null && (
          <div className="tool-result-content">
            <pre>{displayContent}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
