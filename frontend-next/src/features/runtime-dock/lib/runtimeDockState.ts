/**
 * Pure helpers for runtime action dock visibility and message filtering.
 */

import type { Message } from '@/shared/types/api'

export function findLastUserMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.type === 'user') return messages[i]
  }
  return null
}

export function findPendingInteractive(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.type !== 'interactive') continue
    const content = msg.content || {}
    if (content.interaction_type === 'permission' || content.interaction_type === 'user_choice') {
      return msg
    }
  }
  return null
}

export function resolveQueuedPrompt({
  queued,
  isRunning,
  recoveryQueued,
  queuedPrompt,
  messages,
}: {
  queued: boolean
  isRunning: boolean
  recoveryQueued: { prompt?: string } | null
  queuedPrompt: string
  messages: Message[]
}): string {
  if (queuedPrompt) return queuedPrompt
  if (recoveryQueued?.prompt) return recoveryQueued.prompt
  if ((queued && isRunning) || (recoveryQueued && !isRunning)) {
    const lastUser = findLastUserMessage(messages)
    return String(lastUser?.content?.text ?? '')
  }
  return ''
}

export function shouldShowQueuedBlock({
  queued,
  isRunning,
  recoveryQueued,
  queuedPrompt,
  messages,
}: {
  queued: boolean
  isRunning: boolean
  recoveryQueued: { prompt?: string } | null
  queuedPrompt: string
  messages: Message[]
}): boolean {
  const text = resolveQueuedPrompt({ queued, isRunning, recoveryQueued, queuedPrompt, messages })
  if (!text) return false
  return !!((queued && isRunning) || (recoveryQueued && !isRunning))
}

export function queuedBlockMode({
  queued,
  isRunning,
  recoveryQueued,
}: {
  queued: boolean
  isRunning: boolean
  recoveryQueued: { prompt?: string } | null
}): 'active' | 'restored' | null {
  if (queued && isRunning) return 'active'
  if (recoveryQueued && !isRunning) return 'restored'
  return null
}

export function messageKey(msg: Message | null): string {
  if (!msg) return ''
  return String((msg as unknown as Record<string, unknown>)._id ?? (msg as unknown as Record<string, unknown>).id ?? '')
}

export function isInteractiveAnswered(
  msg: Message | null,
  opts?: { pendingInteractive?: Message | null; answeredKey?: string | null },
): boolean {
  if (!msg || msg.type !== 'interactive') return false
  const key = messageKey(msg)
  const { answeredKey, pendingInteractive } = opts || {}
  if (answeredKey && key === answeredKey) return true
  if (pendingInteractive && key !== messageKey(pendingInteractive)) return true
  return false
}

export function shouldHideMessageFromList(
  msg: Message | null,
  {
    queuedPrompt,
    queued,
    isRunning,
    recoveryQueued,
    pendingInteractive,
    dockInteractiveAnswered = false,
    messages,
  }: {
    queuedPrompt: string
    queued: boolean
    isRunning: boolean
    recoveryQueued: { prompt?: string } | null
    pendingInteractive: Message | null
    dockInteractiveAnswered?: boolean
    messages: Message[]
  },
): boolean {
  if (!msg) return false

  const resolvedQueuedPrompt = resolveQueuedPrompt({
    queued,
    isRunning,
    recoveryQueued,
    queuedPrompt,
    messages,
  })

  if (msg.type === 'user' && resolvedQueuedPrompt && shouldShowQueuedBlock({
    queued,
    isRunning,
    recoveryQueued,
    queuedPrompt,
    messages,
  })) {
    const text = String(msg.content?.text ?? '').trim()
    if (text === resolvedQueuedPrompt.trim()) {
      const lastUser = findLastUserMessage(messages)
      return messageKey(msg) === messageKey(lastUser)
    }
  }

  if (msg.type === 'interactive' && pendingInteractive && !dockInteractiveAnswered) {
    return messageKey(msg) === messageKey(pendingInteractive)
  }

  return false
}

export function buildInteractiveBlock(
  pendingInteractive: Message | null,
  recoveryPending: { interaction_type?: string; tool_name?: string; tool_input?: string; questions?: Array<{ question: string; choices: string[] }> } | null,
): {
  type: string
  tool_name?: string
  tool_input?: string
  input?: { questions: Array<{ question: string; choices: string[] }> }
} | null {
  if (pendingInteractive?.content) {
    const content = pendingInteractive.content
    if (content.interaction_type === 'user_choice') {
      return {
        type: 'user_choice',
        tool_name: content.tool_name as string,
        input: { questions: (content.questions as Array<{ question: string; choices: string[] }>) || [] },
      }
    }
    if (content.interaction_type === 'permission') {
      return {
        type: 'permission',
        tool_name: content.tool_name as string,
        tool_input: content.tool_input as string,
      }
    }
  }

  if (recoveryPending?.interaction_type === 'user_choice') {
    return {
      type: 'user_choice',
      tool_name: recoveryPending.tool_name,
      input: { questions: recoveryPending.questions || [] },
    }
  }

  if (recoveryPending?.interaction_type === 'permission') {
    return {
      type: 'permission',
      tool_name: recoveryPending.tool_name,
      tool_input: recoveryPending.tool_input,
    }
  }

  return null
}
