import { describe, it, expect, vi } from 'vitest'
import { submitInteractiveResponse } from '../submitInteractiveResponse'

function createMockWs({ open = true, sendOk = true } = {}) {
  return {
    getReadyState: () => (open ? WebSocket.OPEN : WebSocket.CLOSED),
    send: () => sendOk,
  } as unknown as { getReadyState(): number; send(data: Record<string, unknown>): boolean }
}

describe('submitInteractiveResponse', () => {
  it('submits successfully and marks answered', () => {
    const marked: Array<[string, string]> = []
    const pending = { _id: 42, type: 'interactive' as const, content: {} }
    const ok = submitInteractiveResponse({
      wsConnection: createMockWs(),
      sessionId: 'sess-1',
      pendingMessage: pending,
      data: { decision: 'allow' },
      markAnswered: (sessionId, key) => marked.push([sessionId, key]),
    })
    expect(ok).toBe(true)
    expect(marked).toEqual([['sess-1', '42']])
  })

  it('fails when disconnected', () => {
    const toasts: string[] = []
    const errors: string[] = []
    const ok = submitInteractiveResponse({
      wsConnection: createMockWs({ open: false }),
      sessionId: 'sess-1',
      pendingMessage: { _id: 1, type: 'interactive' as const, content: {} },
      data: { decision: 'allow' },
      markAnswered: () => { throw new Error('should not mark answered') },
      showToast: (msg) => { toasts.push(msg) },
      setError: (msg) => { errors.push(msg) },
    })
    expect(ok).toBe(false)
    expect(toasts[0]).toBe('Not connected')
    expect(errors[0]).toBe('Not connected')
  })

  it('fails when send returns false', () => {
    const toasts: string[] = []
    const errors: string[] = []
    const ok = submitInteractiveResponse({
      wsConnection: createMockWs({ sendOk: false }),
      sessionId: 'sess-1',
      pendingMessage: { _id: 1, type: 'interactive' as const, content: {} },
      data: { decision: 'deny' },
      markAnswered: () => { throw new Error('should not mark answered') },
      showToast: (msg) => { toasts.push(msg) },
      setError: (msg) => { errors.push(msg) },
    })
    expect(ok).toBe(false)
    expect(toasts[0]).toBe('Connection lost, response not sent')
    expect(errors[0]).toBe('Connection lost, response not sent')
  })

  it('returns false when wsConnection is null', () => {
    const ok = submitInteractiveResponse({
      wsConnection: null,
      sessionId: 'sess-1',
      pendingMessage: null,
      data: { decision: 'allow' },
    })
    expect(ok).toBe(false)
  })

  it('does not call markAnswered when pendingMessage is null', () => {
    const markAnswered = vi.fn()
    const ok = submitInteractiveResponse({
      wsConnection: createMockWs(),
      sessionId: 'sess-1',
      pendingMessage: null,
      data: { decision: 'allow' },
      markAnswered,
    })
    expect(ok).toBe(true)
    expect(markAnswered).not.toHaveBeenCalled()
  })
})
