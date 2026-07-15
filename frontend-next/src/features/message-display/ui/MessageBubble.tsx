'use client'

import { useState, useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Message } from '@/shared/types/api'

interface MessageBubbleProps {
  message: Message
}

// Simple message type classification
function getBubbleClass(type: string): string {
  switch (type) {
    case 'result':
    case 'text':
      return 'message-bubble message-user'
    case 'system':
      return 'message-bubble message-system'
    case 'interactive':
    case 'tool_use':
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

export function MessageBubble({ message }: MessageBubbleProps) {
  const { type, content, timestamp } = message
  const [collapsed, setCollapsed] = useState(false)

  // Render content based on type
  const rendered = useMemo(() => {
    // For result/text messages, render markdown
    if (type === 'result' || type === 'text') {
      const text = typeof content?.text === 'string' ? content.text : ''
      if (!text) return null

      // Configure marked for safety
      const html = marked.parse(text, { async: false }) as string
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'code', 'pre', 'span',
          'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'blockquote', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        ],
        ALLOWED_ATTR: ['href', 'target', 'class', 'rel'],
      })
      return <div dangerouslySetInnerHTML={{ __html: clean }} />
    }

    // For tool_use messages
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
            <pre style={{ fontSize: 12, marginTop: 4, padding: 8, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          )}
        </div>
      )
    }

    // For system messages
    if (type === 'system') {
      const subtype = content?.subtype as string || ''
      if (subtype === 'auto_continue') {
        return <span>Auto-continuing ({String(content?.attempt || '')}/{String(content?.max || '')})</span>
      }
      return <span>{String(content?.text || JSON.stringify(content))}</span>
    }

    // For interactive messages
    if (type === 'interactive') {
      const interactionType = content?.interaction_type as string || ''
      if (interactionType === 'permission') {
        return (
          <div>
            <div className="interactive-title">Permission Request</div>
            <div className="interactive-desc">Tool: {String(content?.tool_name || '')}</div>
            <pre style={{ fontSize: 12, marginTop: 4, padding: 8, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
              {JSON.stringify(content?.tool_input || {}, null, 2)}
            </pre>
          </div>
        )
      }
      return <div>{JSON.stringify(content)}</div>
    }

    return <div>{JSON.stringify(content).slice(0, 500)}</div>
  }, [type, content, collapsed])

  if (!rendered && type !== 'result' && type !== 'text') return null
  if (!rendered) return null

  return (
    <div className={getBubbleClass(type)}>
      {rendered}
      <div className="message-timestamp">{formatTime(timestamp)}</div>
    </div>
  )
}
