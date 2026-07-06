/**
 * Pure helpers for runtime action dock visibility and message filtering.
 */

export function findLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.type === 'user') return messages[i]
  }
  return null
}

export function findPendingInteractive(messages) {
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

export function resolveQueuedPrompt({ queued, isRunning, recoveryQueued, queuedPrompt, messages }) {
  if (queuedPrompt) return queuedPrompt
  if (recoveryQueued?.prompt) return recoveryQueued.prompt
  if ((queued && isRunning) || (recoveryQueued && !isRunning)) {
    const lastUser = findLastUserMessage(messages)
    return lastUser?.content?.text || ''
  }
  return ''
}

export function shouldShowQueuedBlock({ queued, isRunning, recoveryQueued, queuedPrompt, messages }) {
  const text = resolveQueuedPrompt({ queued, isRunning, recoveryQueued, queuedPrompt, messages })
  if (!text) return false
  return (queued && isRunning) || (recoveryQueued && !isRunning)
}

export function queuedBlockMode({ queued, isRunning, recoveryQueued }) {
  if (queued && isRunning) return 'active'
  if (recoveryQueued && !isRunning) return 'restored'
  return null
}

export function messageKey(msg) {
  if (!msg) return ''
  return String(msg._id ?? msg.id ?? '')
}

export function shouldHideMessageFromList(msg, {
  queuedPrompt,
  queued,
  isRunning,
  recoveryQueued,
  pendingInteractive,
  dockInteractiveAnswered = false,
  messages,
}) {
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
    const text = (msg.content?.text || '').trim()
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

export function buildInteractiveBlock(pendingInteractive, recoveryPending) {
  if (pendingInteractive?.content) {
    const content = pendingInteractive.content
    if (content.interaction_type === 'user_choice') {
      return {
        type: 'user_choice',
        tool_name: content.tool_name,
        input: { questions: content.questions || [] },
      }
    }
    if (content.interaction_type === 'permission') {
      return {
        type: 'permission',
        tool_name: content.tool_name,
        tool_input: content.tool_input,
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
