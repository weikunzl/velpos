'use client'

import { QueryRuntimeBar } from '@/features/cancel-query'
import { sessionStore } from '@/entities/session'
import type { SessionState, Message } from '@/shared/types/api'

interface RuntimeActionDockProps {
  sessionId: string
  state: SessionState | null
}

export function RuntimeActionDock({ sessionId, state }: RuntimeActionDockProps) {
  if (!state) return null

  const { status, queued, queuedPrompt, queryStartedAt, error, messages } = state

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
  const interactiveMsg: Message | undefined = messages.find(
    (m: Message) =>
      m.type === 'interactive' &&
      (m.content?.interaction_type === 'permission' || m.content?.interaction_type === 'user_choice'),
  )
  const interactiveContent = interactiveMsg?.content as Record<string, unknown> | undefined
  const toolInput = interactiveContent?.tool_input

  return (
    <div className="runtime-dock">
      {/* Runtime bar (queued / running / error) */}
      <QueryRuntimeBar
        sessionId={sessionId}
        status={status}
        queryStartedAt={queryStartedAt}
        queued={queued}
        queuedPrompt={queuedPrompt}
        error={error}
      />

      {/* Interactive permission request */}
      {interactiveMsg && interactiveContent?.interaction_type === 'permission' && (
        <div className="interactive-block">
          <div className="interactive-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Permission Request: {String(interactiveContent?.tool_name || 'Tool')}
          </div>
          <div className="interactive-desc">
            This tool wants to execute with the following input.
          </div>
          {toolInput ? (
            <div className="interactive-input-preview">
              <pre>{JSON.stringify(toolInput, null, 2)}</pre>
            </div>
          ) : null}
          <div className="interactive-actions">
            <button
              className="interactive-btn interactive-btn-approve"
              onClick={() => handleInteractiveResponse('current', true)}
            >
              Approve
            </button>
            <button
              className="interactive-btn interactive-btn-deny"
              onClick={() => handleInteractiveResponse('current', false)}
            >
              Deny
            </button>
          </div>
        </div>
      )}

      {/* Interactive choice request */}
      {interactiveMsg && interactiveContent?.interaction_type === 'user_choice' && (
        <div className="interactive-block">
          <div className="interactive-title">Choice Required</div>
          <div className="interactive-actions">
            {((interactiveContent?.questions as Array<{ choices: string[] }>)?.flatMap((q) => q.choices) || []).map(
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
