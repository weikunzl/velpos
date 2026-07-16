'use client'

import { useState, useMemo } from 'react'

interface Props {
  block: { thinking?: string }
}

export function ThinkingBlock({ block }: Props) {
  const [expanded, setExpanded] = useState(false)
  const text = block.thinking || ''

  const truncatedText = useMemo(() => {
    if (text.length > 300) return text.substring(0, 300) + '...'
    return text
  }, [text])

  return (
    <div className={`thinking-block ${expanded ? 'is-expanded' : ''}`}>
      <div className="thinking-summary" onClick={() => setExpanded(!expanded)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>Thinking</span>
        <svg className="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className="thinking-content-wrapper">
        <div className="thinking-content">{expanded ? text : truncatedText}</div>
      </div>
    </div>
  )
}
