'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { sessionStore } from '@/entities/session'

interface MessageInputProps {
  sessionId: string
  disabled?: boolean
}

export function MessageInput({ sessionId, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const composingRef = useRef(false)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }, [text])

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || sending) return
      setSending(true)
      try {
        const ws = sessionStore.getWsConnection(sessionId)
        if (ws) {
          ws.send({ action: 'send_prompt', prompt: prompt.trim() })
          setText('')
        }
      } finally {
        setSending(false)
      }
    },
    [sessionId, sending],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (composingRef.current) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(text)
    }
  }

  return (
    <div className="send-message-container">
      <textarea
        ref={textareaRef}
        className="send-message-input"
        placeholder={disabled ? 'Session not active...' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { composingRef.current = true }}
        onCompositionEnd={() => { composingRef.current = false }}
        disabled={disabled}
        rows={1}
      />
      <button
        className="send-button"
        disabled={!text.trim() || disabled || sending}
        onClick={() => sendMessage(text)}
        title="Send"
      >
        {sending ? (
          <span className="runtime-spinner" style={{ borderColor: 'var(--text-on-accent)', borderTopColor: 'transparent' }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        )}
      </button>
    </div>
  )
}
