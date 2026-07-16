import { messageKey } from './runtimeDockState'
import type { Message } from '@/shared/types/api'

/**
 * Send a permission / user-choice response over the session WebSocket.
 * Marks the pending interactive message as answered only after a successful send.
 */
export function submitInteractiveResponse({
  wsConnection,
  sessionId,
  pendingMessage,
  data,
  markAnswered,
  showToast,
  setError,
}: {
  wsConnection: { getReadyState(): number; send(data: Record<string, unknown>): boolean } | null
  sessionId: string
  pendingMessage: Message | null
  data: Record<string, unknown>
  markAnswered?: (sessionId: string, key: string) => void
  showToast?: (msg: string, type?: string) => void
  setError?: (msg: string) => void
}): boolean {
  const conn = wsConnection
  if (!conn || conn.getReadyState() !== WebSocket.OPEN) {
    const msg = 'Not connected'
    setError?.(msg)
    showToast?.(msg, 'error')
    return false
  }
  if (!conn.send({ action: 'user_response', data })) {
    const msg = 'Connection lost, response not sent'
    setError?.(msg)
    showToast?.(msg, 'error')
    return false
  }
  if (pendingMessage && markAnswered && sessionId) {
    markAnswered(sessionId, messageKey(pendingMessage))
  }
  return true
}
