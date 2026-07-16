import { describe, it, expect } from 'vitest'
import {
  findLastUserMessage,
  findPendingInteractive,
  resolveQueuedPrompt,
  shouldShowQueuedBlock,
  queuedBlockMode,
  shouldHideMessageFromList,
  buildInteractiveBlock,
  isInteractiveAnswered,
} from '../runtimeDockState'
import type { Message } from '@/shared/types/api'

const baseAssistant = { type: 'assistant' as const, content: { text: 'ok' } }
const userMsg = (text: string, id?: number): Message =>
  ({ _id: id ?? 0, type: 'user' as const, content: { text } }) as unknown as Message
const interactive = (type: string, overrides: Record<string, unknown> = {}): Message =>
  ({ _id: 9, type: 'interactive' as const, content: { interaction_type: type, tool_name: 'Bash', ...overrides } }) as unknown as Message

describe('runtimeDockState', () => {
  describe('findLastUserMessage', () => {
    it('returns the last user message', () => {
      const messages = [
        baseAssistant as Message,
        userMsg('first'),
        userMsg('queued follow-up'),
      ]
      expect(findLastUserMessage(messages)?.content?.text).toBe('queued follow-up')
    })

    it('returns null when no user messages', () => {
      expect(findLastUserMessage([baseAssistant as Message])).toBeNull()
    })

    it('returns null for empty array', () => {
      expect(findLastUserMessage([])).toBeNull()
    })
  })

  describe('findPendingInteractive', () => {
    it('finds permission message', () => {
      const msg = interactive('permission')
      const pending = findPendingInteractive([baseAssistant as Message, msg])
      expect(pending?.content?.tool_name).toBe('Bash')
    })

    it('finds user_choice message', () => {
      const msg = interactive('user_choice', { questions: [] })
      const pending = findPendingInteractive([msg])
      expect(pending?.content?.interaction_type).toBe('user_choice')
    })

    it('skips non-interactive messages', () => {
      expect(findPendingInteractive([baseAssistant as Message, userMsg('hi')])).toBeNull()
    })

    it('returns null for empty array', () => {
      expect(findPendingInteractive([])).toBeNull()
    })
  })

  describe('resolveQueuedPrompt', () => {
    const messages = [userMsg('fix tests')]

    it('returns queuedPrompt when set', () => {
      expect(resolveQueuedPrompt({ queued: true, isRunning: true, recoveryQueued: null, queuedPrompt: 'hello', messages }))
        .toBe('hello')
    })

    it('returns recovery queued prompt', () => {
      expect(resolveQueuedPrompt({ queued: false, isRunning: false, recoveryQueued: { prompt: 'recovery' }, queuedPrompt: '', messages }))
        .toBe('recovery')
    })

    it('falls back to last user message when queued and running', () => {
      expect(resolveQueuedPrompt({ queued: true, isRunning: true, recoveryQueued: null, queuedPrompt: '', messages }))
        .toBe('fix tests')
    })

    it('returns empty string when no conditions met', () => {
      expect(resolveQueuedPrompt({ queued: false, isRunning: false, recoveryQueued: null, queuedPrompt: '', messages }))
        .toBe('')
    })
  })

  describe('shouldShowQueuedBlock', () => {
    const messages = [userMsg('fix tests')]

    it('shows when queued and running with prompt', () => {
      expect(shouldShowQueuedBlock({ queued: true, isRunning: true, recoveryQueued: null, queuedPrompt: 'fix tests', messages })).toBe(true)
    })

    it('shows when recovery queued and not running', () => {
      expect(shouldShowQueuedBlock({ queued: false, isRunning: false, recoveryQueued: { prompt: 'fix' }, queuedPrompt: '', messages })).toBe(true)
    })

    it('hides when no prompt source available', () => {
      expect(shouldShowQueuedBlock({ queued: true, isRunning: true, recoveryQueued: null, queuedPrompt: '', messages: [] })).toBe(false)
    })
  })

  describe('queuedBlockMode', () => {
    it('returns active when queued and running', () => {
      expect(queuedBlockMode({ queued: true, isRunning: true, recoveryQueued: null })).toBe('active')
    })

    it('returns restored when recovery queued and not running', () => {
      expect(queuedBlockMode({ queued: false, isRunning: false, recoveryQueued: { prompt: 'fix' } })).toBe('restored')
    })

    it('returns null otherwise', () => {
      expect(queuedBlockMode({ queued: false, isRunning: true, recoveryQueued: null })).toBeNull()
    })
  })

  describe('isInteractiveAnswered', () => {
    it('returns false for non-interactive message', () => {
      expect(isInteractiveAnswered(userMsg('hi'), { pendingInteractive: null, answeredKey: null })).toBe(false)
    })

    it('returns true when answered by key', () => {
      const msg = { _id: 5, type: 'interactive' as const, content: { interaction_type: 'permission', tool_name: 'Bash' } } as unknown as Message
      expect(isInteractiveAnswered(msg, { pendingInteractive: msg, answeredKey: '5' })).toBe(true)
    })

    it('returns true for historical interactive (different from pending)', () => {
      const old = { _id: 1, type: 'interactive' as const, content: { interaction_type: 'permission', tool_name: 'Bash' } } as unknown as Message
      const pending = { _id: 2, type: 'interactive' as const, content: { interaction_type: 'permission', tool_name: 'Bash' } } as unknown as Message
      expect(isInteractiveAnswered(old, { pendingInteractive: pending, answeredKey: null })).toBe(true)
    })

    it('returns false for current pending interactive', () => {
      const pending = interactive('permission', { _id: 2 })
      expect(isInteractiveAnswered(pending, { pendingInteractive: pending, answeredKey: null })).toBe(false)
    })
  })

  describe('shouldHideMessageFromList', () => {
    const messages = [userMsg('fix tests', 1)]

    it('hides last user message matching queued prompt', () => {
      expect(shouldHideMessageFromList(messages[0], {
        queuedPrompt: 'fix tests',
        queued: true,
        isRunning: true,
        recoveryQueued: null,
        pendingInteractive: null,
        dockInteractiveAnswered: false,
        messages,
      })).toBe(true)
    })

    it('does not hide non-matching user message', () => {
      const other = userMsg('different', 2)
      expect(shouldHideMessageFromList(other, {
        queuedPrompt: 'fix tests',
        queued: true,
        isRunning: true,
        recoveryQueued: null,
        pendingInteractive: null,
        dockInteractiveAnswered: false,
        messages: [userMsg('fix tests', 1), other],
      })).toBe(false)
    })

    it('hides pending interactive when not answered', () => {
      const msg = interactive('permission', { _id: 9 })
      expect(shouldHideMessageFromList(msg, {
        queuedPrompt: '',
        queued: false,
        isRunning: true,
        recoveryQueued: null,
        pendingInteractive: msg,
        dockInteractiveAnswered: false,
        messages: [msg],
      })).toBe(true)
    })

    it('shows interactive when answered', () => {
      const msg = interactive('permission', { _id: 9 })
      expect(shouldHideMessageFromList(msg, {
        queuedPrompt: '',
        queued: false,
        isRunning: true,
        recoveryQueued: null,
        pendingInteractive: msg,
        dockInteractiveAnswered: true,
        messages: [msg],
      })).toBe(false)
    })

    it('returns false for null', () => {
      expect(shouldHideMessageFromList(null, {
        queuedPrompt: '', queued: false, isRunning: false, recoveryQueued: null, pendingInteractive: null, messages: [],
      })).toBe(false)
    })
  })

  describe('buildInteractiveBlock', () => {
    it('builds user_choice from pending message', () => {
      const msg = interactive('user_choice', { questions: [{ question: 'Go?', choices: ['yes', 'no'] }] })
      const block = buildInteractiveBlock(msg, null)
      expect(block).toEqual({ type: 'user_choice', tool_name: 'Bash', input: { questions: [{ question: 'Go?', choices: ['yes', 'no'] }] } })
    })

    it('builds permission from pending message', () => {
      const msg = interactive('permission', { tool_input: 'file.txt' })
      const block = buildInteractiveBlock(msg, null)
      expect(block).toEqual({ type: 'permission', tool_name: 'Bash', tool_input: 'file.txt' })
    })

    it('builds from recovery for user_choice', () => {
      const block = buildInteractiveBlock(null, { interaction_type: 'user_choice', tool_name: 'Write', questions: [] })
      expect(block).toEqual({ type: 'user_choice', tool_name: 'Write', input: { questions: [] } })
    })

    it('builds from recovery for permission', () => {
      const block = buildInteractiveBlock(null, { interaction_type: 'permission', tool_name: 'Write', tool_input: 'file.txt' })
      expect(block).toEqual({ type: 'permission', tool_name: 'Write', tool_input: 'file.txt' })
    })

    it('returns null when nothing matches', () => {
      expect(buildInteractiveBlock(null, null)).toBeNull()
    })
  })
})
