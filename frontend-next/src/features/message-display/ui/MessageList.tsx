'use client'

import { useEffect, type ReactNode, type RefObject } from 'react'
import { MessageItem } from './MessageItem'
import { MessageScrollButton } from './MessageScrollButton'
import { useMessageListScroll } from '../model/useMessageListScroll'
import type { Message } from '@/shared/types/api'

interface MessageListProps {
  messages: Message[]
  status: string
  hasMore?: boolean
  agentProvider?: string
  footer?: ReactNode
  onLoadMore?: () => void | Promise<void>
}

function emptyDescription(provider?: string): string {
  return provider === 'cursor'
    ? 'Send a prompt to start interacting with Cursor Agent'
    : 'Send a prompt to start interacting with Claude Code'
}

function LoadMoreObserver({
  rootRef,
  sentinelRef,
  enabled,
  onIntersect,
}: {
  rootRef: RefObject<HTMLDivElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
  enabled: boolean
  onIntersect: () => void
}) {
  useEffect(() => {
    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect()
      },
      { root, threshold: 0, rootMargin: '300px 0px 0px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [rootRef, sentinelRef, enabled, onIntersect])

  return null
}

export function MessageList({
  messages,
  status,
  hasMore = false,
  agentProvider = 'claude',
  footer,
  onLoadMore,
}: MessageListProps) {
  const {
    containerRef,
    sentinelRef,
    showScrollBtn,
    loadingMore,
    setLoadingMore,
    checkNearBottom,
    scrollToBottom,
  } = useMessageListScroll(messages.length)

  async function handleLoadMore() {
    if (!hasMore || loadingMore || !onLoadMore) return
    const el = containerRef.current
    if (!el) return

    setLoadingMore(true)
    const prevScrollHeight = el.scrollHeight
    await onLoadMore()
    requestAnimationFrame(() => {
      const newScrollHeight = el.scrollHeight
      if (newScrollHeight !== prevScrollHeight) {
        el.scrollTop += newScrollHeight - prevScrollHeight
      }
      setLoadingMore(false)
    })
  }

  return (
    <div className="messages-shell">
      <div
        ref={containerRef}
        className="messages-area message-list"
        onScroll={checkNearBottom}
      >
        <div className="messages-content">
          <div ref={sentinelRef} className="load-more-sentinel">
            {loadingMore && <div className="load-more-indicator">Loading...</div>}
          </div>

          {messages.length === 0 ? (
            <div className="message-empty messages-empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="empty-title">Velpos</div>
              <div className="empty-desc">{emptyDescription(agentProvider)}</div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageItem key={msg._id ?? msg.id ?? `msg-${i}`} message={msg} />
            ))
          )}

          {footer}
          {status === 'running' && messages.length > 0 && (
            <div className="message-list-running-footer" aria-hidden="true" />
          )}
        </div>
      </div>

      <MessageScrollButton visible={showScrollBtn} onClick={scrollToBottom} />

      {hasMore && onLoadMore && (
        <LoadMoreObserver
          rootRef={containerRef}
          sentinelRef={sentinelRef}
          enabled={!loadingMore}
          onIntersect={() => { void handleLoadMore() }}
        />
      )}
    </div>
  )
}
