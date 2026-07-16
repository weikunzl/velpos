'use client'

import { useRef, useEffect } from 'react'
import { formatDuration } from '@/shared/lib/formatTime'
import type { QueryHistoryEntry } from '@/shared/types/api'

interface UsagePanelProps {
  open: boolean
  queryHistory: QueryHistoryEntry[]
  totalInputTokens: number
  totalOutputTokens: number
  isRunning: boolean
  runningDuration: string
  runningStatusText: string
  onClose: () => void
  anchorRect?: DOMRect
}

export function UsagePanel({
  open,
  queryHistory,
  totalInputTokens,
  totalOutputTokens,
  isRunning,
  runningDuration,
  runningStatusText,
  onClose,
  anchorRect,
}: UsagePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to allow event propagation
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [open, onClose])

  if (!open) return null

  const panelStyle: React.CSSProperties = {}
  if (anchorRect) {
    panelStyle.position = 'fixed'
    panelStyle.top = `${anchorRect.bottom + 4}px`
    panelStyle.right = `${window.innerWidth - anchorRect.right}px`
  }

  return (
    <div className="history-panel" ref={panelRef} style={panelStyle}>
      <div className="history-header">
        <div className="history-header-main">
          <span className="history-title">Query History</span>
          <span className="history-total">
            Context: {formatTokens(totalInputTokens)} / Output: {formatTokens(totalOutputTokens)}
          </span>
        </div>
      </div>
      <div className="history-list">
        {/* Running query indicator */}
        {isRunning && (
          <div className="history-item history-item--active">
            <div className="history-item-row">
              <span className="history-index">●</span>
              <span className="history-duration">{runningDuration || '0s'}</span>
              <span className="history-turns">{runningStatusText}</span>
            </div>
            <div className="history-item-tokens history-item-live">Running</div>
          </div>
        )}

        {queryHistory.length === 0 && !isRunning && (
          <div className="history-empty">No queries yet</div>
        )}

        {[...queryHistory].reverse().map((q, i) => (
          <div
            key={i}
            className={`history-item ${q.is_error ? 'history-item--error' : ''}`}
          >
            <div className="history-item-row">
              <span className="history-index">#{queryHistory.length - i}</span>
              <span className="history-duration">{formatDuration(q.duration_ms)}</span>
              <span className="history-turns">{q.num_turns || 0} turns</span>
              {q.is_error && <span className="history-error-tag">Error</span>}
            </div>
            <div className="history-item-tokens">
              <span>Input {formatTokens(q.usage?.input_tokens)}</span>
              <span>Output {formatTokens(q.usage?.output_tokens)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTokens(n: number | undefined | null): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
