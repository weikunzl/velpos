'use client'

import { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'
import type { Message } from '@/shared/types/api'

interface MessageListProps {
  messages: Message[]
  status: string
}

export function MessageList({ messages, status }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight
      }
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="message-list" ref={listRef}>
        <div className="message-empty">
          Start a conversation by sending a message below.
        </div>
      </div>
    )
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map((msg, i) => (
        <MessageBubble key={msg._id ?? msg.id ?? i} message={msg} />
      ))}
      {status === 'running' && <ThinkingIndicator />}
    </div>
  )
}
