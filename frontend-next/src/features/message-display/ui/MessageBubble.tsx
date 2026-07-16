'use client'

import { useState, useMemo } from 'react'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import { sanitizeHtml } from '@/shared/lib/sanitizeHtml'
import type { Message } from '@/shared/types/api'

interface MessageBubbleProps {
  message: Message
}

// Configure marked with highlight.js
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch { /* fall through */ }
    }
    try {
      return hljs.highlightAuto(code).value
    } catch { /* fall through */ }
    return code
  },
}))

marked.setOptions({
  breaks: true,
  gfm: true,
})

const LONG_CONTENT_CHARS = 2000

function getBubbleClass(type: string): string {
  switch (type) {
    case 'result':
    case 'text':
      return 'message-bubble message-user'
    case 'system':
      return 'message-bubble message-system'
    case 'interactive':
    case 'tool_use':
    case 'tool_result':
      return 'message-bubble message-interactive'
    default:
      return 'message-bubble message-assistant'
  }
}

function formatTime(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text: string, folding: boolean, expanded: boolean, onToggle: () => void) {
  if (!text) return null
  const needsFold = folding && text.length > LONG_CONTENT_CHARS
  const displayText = needsFold && !expanded ? text.slice(0, LONG_CONTENT_CHARS) + '\n\n...' : text

  const html = marked.parse(displayText, { async: false }) as string
  const clean = sanitizeHtml(html)

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: clean }} />
      {needsFold && (
        <button className="msg-expand-btn" onClick={onToggle}>
          {expanded ? 'Show less' : `Show more (${text.length - LONG_CONTENT_CHARS} more chars)`}
        </button>
      )}
    </div>
  )
}

function renderDiff(text: string) {
  const lines = text.split('\n')
  return (
    <div className="msg-diff">
      {lines.map((line, i) => {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          return <div key={i} className="msg-diff-line msg-diff-add">{line}</div>
        }
        if (line.startsWith('-') && !line.startsWith('---')) {
          return <div key={i} className="msg-diff-line msg-diff-del">{line}</div>
        }
        if (line.startsWith('@@')) {
          return <div key={i} className="msg-diff-line msg-diff-hunk">{line}</div>
        }
        return <div key={i} className="msg-diff-line">{line}</div>
      })}
    </div>
  )
}

function hasDiffContent(text: string): boolean {
  const lines = text.split('\n')
  const diffLines = lines.filter(l => l.startsWith('+') || l.startsWith('-') || l.startsWith('@@'))
  return diffLines.length > lines.length * 0.3
}

function renderChoices(options: string[] | undefined, selected?: string, onSelect?: (val: string) => void) {
  if (!options || options.length === 0) return null
  return (
    <div className="msg-choices">
      {options.map((opt) => (
        <button
          key={opt}
          className={`msg-choice-btn ${opt === selected ? 'msg-choice-selected' : ''}`}
          onClick={() => onSelect?.(opt)}
          disabled={!!selected}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { type, content, timestamp } = message
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const rendered = useMemo(() => {
    if (type === 'result' || type === 'text') {
      const text = typeof content?.text === 'string' ? content.text : ''
      if (!text) return null

      // Auto-detect diff content
      if (text.length < 10000 && hasDiffContent(text)) {
        return (
          <div>
            <div className="msg-diff-header">Diff</div>
            {renderDiff(text)}
          </div>
        )
      }

      return renderMarkdown(text, true, expanded, () => setExpanded((v) => !v))
    }

    if (type === 'tool_use') {
      const toolName = content?.tool_name as string || ''
      const toolInput = content?.tool_input as Record<string, unknown> || {}
      return (
        <div>
          <div
            className="interactive-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Tool: {toolName}
          </div>
          {!collapsed && (
            <pre className="msg-tool-input">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          )}
        </div>
      )
    }

    if (type === 'tool_result') {
      const toolName = content?.tool_name as string || ''
      const resultText = typeof content?.text === 'string' ? content.text
        : typeof content?.output === 'string' ? content.output
        : JSON.stringify(content?.content || content)
      const isError = content?.is_error as boolean
      return (
        <div>
          <div
            className="interactive-title"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {isError ? 'Error: ' : 'Result: '}{toolName}
          </div>
          {!collapsed && (
            <pre className={`msg-result ${isError ? 'msg-result-error' : ''}`}>
              {resultText.slice(0, 5000)}
            </pre>
          )}
        </div>
      )
    }

    if (type === 'system') {
      const subtype = content?.subtype as string || ''
      if (subtype === 'auto_continue') {
        return <span>Auto-continuing ({String(content?.attempt || '')}/{String(content?.max || '')})</span>
      }
      return <span>{String(content?.text || JSON.stringify(content))}</span>
    }

    if (type === 'interactive') {
      const interactionType = content?.interaction_type as string || ''
      if (interactionType === 'permission') {
        return (
          <div>
            <div className="interactive-title">Permission Request</div>
            <div className="interactive-desc">Tool: {String(content?.tool_name || '')}</div>
            <pre className="msg-tool-input">
              {JSON.stringify(content?.tool_input || {}, null, 2)}
            </pre>
          </div>
        )
      }
      if (interactionType === 'choice') {
        const options = content?.options as string[] | undefined
        const selected = content?.selected as string | undefined
        const title = content?.title as string || 'Choose an option'
        return (
          <div>
            <div className="interactive-title">{title}</div>
            {renderChoices(options, selected)}
          </div>
        )
      }
      return <div>{JSON.stringify(content)}</div>
    }

    return <div>{JSON.stringify(content).slice(0, 500)}</div>
  }, [type, content, collapsed, expanded])

  if (!rendered && type !== 'result' && type !== 'text') return null
  if (!rendered) return null

  return (
    <div className={getBubbleClass(type)}>
      {rendered}
      <div className="message-timestamp">{formatTime(timestamp)}</div>
    </div>
  )
}
