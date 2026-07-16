'use client'

import { useState, useMemo } from 'react'
import { formatInput, formatToolDisplayName, formatToolValue, toolInputSummary, toolBlockHasDetails } from '../lib/formatters'

interface Props {
  block: Record<string, unknown>
}

export function ToolUseBlock({ block }: Props) {
  const [expanded, setExpanded] = useState(false)

  const displayName = useMemo(() => formatToolDisplayName(block.name as string || ''), [block.name])
  const input = block.input as Record<string, unknown> | undefined
  const inputSummary = useMemo(() => toolInputSummary(input, block), [input, block])
  const hasDetails = toolBlockHasDetails(block)

  const detailSections = useMemo(() => {
    const sections: Array<{ label: string; text: string }> = []
    if (input && typeof input === 'object' && Object.keys(input).length > 0) {
      sections.push({ label: 'Input', text: formatInput(input) })
    }
    const locations = block.locations as Array<unknown> | undefined
    if (Array.isArray(locations) && locations.length > 0) {
      sections.push({ label: 'Locations', text: formatInput(locations) })
    }
    if (block.output != null && block.output !== '') {
      sections.push({ label: 'Output', text: formatToolValue(block.output) })
    }
    if (block.status) {
      sections.push({ label: 'Status', text: String(block.status) })
    }
    return sections
  }, [block, input])

  return (
    <div className={`msg-tool-use ${expanded ? 'is-expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="tool-header">
        <span className="tool-icon">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v1.3a.7.7 0 0 0 .7.7h1.3a.5.5 0 0 0 0-1H3V4.5A1.5 1.5 0 0 1 4.5 3H6a.5.5 0 0 0 0-1H4.5zM10 2.5a.5.5 0 0 1 .5-.5h1.5A2.5 2.5 0 0 1 14.5 4.5V6a.5.5 0 0 1-1 0V4.5A1.5 1.5 0 0 0 12 3h-1.5a.5.5 0 0 1-.5-.5zM2.5 10a.5.5 0 0 1 .5.5V12a1.5 1.5 0 0 0 1.5 1.5H6a.5.5 0 0 1 0 1H4.5A2.5 2.5 0 0 1 2 12v-1.5a.5.5 0 0 1 .5-.5zm11 0a.5.5 0 0 1 .5.5V12a2.5 2.5 0 0 1-2.5 2.5H10a.5.5 0 0 1 0-1h1.5A1.5 1.5 0 0 0 13 12v-1.5a.5.5 0 0 1 .5-.5z" />
          </svg>
        </span>
        <span className="tool-name">{displayName}</span>
        {inputSummary ? (
          <span className="tool-detail">{inputSummary}</span>
        ) : !hasDetails ? (
          <span className="tool-detail tool-detail--muted">No details yet</span>
        ) : null}
        <span className="expand-hint">
          <svg className={expanded ? 'rotated' : ''} width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
          </svg>
        </span>
      </div>
      <div className="tool-input-wrapper">
        {detailSections.length > 0 && (
          <div className="tool-input">
            {detailSections.map((section, index) => (
              <section key={index} className="tool-section">
                <div className="tool-section-label">{section.label}</div>
                <pre>{section.text}</pre>
              </section>
            ))}
          </div>
        )}
        {detailSections.length === 0 && expanded && (
          <div className="tool-input tool-input--empty">
            <pre>Waiting for tool input or output…</pre>
          </div>
        )}
      </div>
    </div>
  )
}
