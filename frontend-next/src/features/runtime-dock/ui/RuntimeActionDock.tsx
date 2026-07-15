'use client'

import { QueryRuntimeBar } from '@/features/cancel-query'
import { sessionStore } from '@/entities/session'
import type { SessionState } from '@/shared/types/api'

interface RuntimeActionDockProps {
  sessionId: string
  state: SessionState | null
}

export function RuntimeActionDock({ sessionId, state }: RuntimeActionDockProps) {
  if (!state) return null

  const { status, queued, queuedPrompt, queryStartedAt } = state

  function handleInteractiveResponse(toolUseId: string, isApproved: boolean, feedback?: string) {
    const ws = sessionStore.getWsConnection(sessionId)
    if (ws) {
      ws.send({
        action: 'user_response',
        tool_use_id: toolUseId,
        is_approved: isApproved,
        feedback: feedback || '',
      })
    }
  }

  function handleChoiceResponse(choice: string) {
    const ws = sessionStore.getWsConnection(sessionId)
    if (ws) {
      ws.send({ action: 'user_response', response: choice })
    }
  }

  // Find pending interactive message
  const interactiveMsg = state.messages.find(
    (m) =>
      m.type === 'interactive' &&
      (m.content?.interaction_type === 'permission' || m.content?.interaction_type === 'user_choice'),
  )

  return (
    <div className="runtime-dock">
      {/* Queued state */}
      {queued && (
        <div className="queued-block">
          <div className="queued-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="queued-text">
            {queuedPrompt || 'Waiting in queue...'}
          </div>
        </div>
      )}

      {/* Running bar */}
      <QueryRuntimeBar
        sessionId={sessionId}
        status={status}
        queryStartedAt={queryStartedAt}
      />

      {/* Interactive permission block */}
      {interactiveMsg && interactiveMsg.content?.interaction_type === 'permission' && (
        <div className="interactive-block">
          <div className="interactive-title">
            Permission Request: {String(interactiveMsg.content?.tool_name || '')}
          </div>
          <div className="interactive-desc">
            This tool wants to execute with the following input.
          </div>
          <div className="interactive-actions">
            <button
              className="interactive-btn interactive-btn-primary"
              onClick={() => handleInteractiveResponse('current', true)}
            >
              Approve
            </button>
            <button
              className="interactive-btn"
              onClick={() => handleInteractiveResponse('current', false)}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Interactive choice block */}
      {interactiveMsg && interactiveMsg.content?.interaction_type === 'user_choice' && (
        <div className="interactive-block">
          <div className="interactive-title">Choice Required</div>
          <div className="interactive-actions">
            {((interactiveMsg.content?.questions as Array<{ choices: string[] }>)?.flatMap((q) => q.choices) || []).map(
              (choice: string, i: number) => (
                <button
                  key={i}
                  className="interactive-btn interactive-btn-primary"
                  onClick={() => handleChoiceResponse(choice)}
                >
                  {choice}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
