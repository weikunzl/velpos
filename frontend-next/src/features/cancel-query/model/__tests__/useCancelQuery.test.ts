import { describe, it, expect, vi } from 'vitest'
import { useCancelQuery } from '../useCancelQuery'
import type { WsConnection } from '@/shared/api/wsClient'

function createMockConnection(readyState: number, sendResult = true): WsConnection {
  return {
    getReadyState: vi.fn(() => readyState),
    send: vi.fn(() => sendResult),
    close: vi.fn(),
    events$: null as unknown as WsConnection['events$'],
  }
}

describe('useCancelQuery', () => {
  it('sends cancel action when connection is open', () => {
    const conn = createMockConnection(WebSocket.OPEN)
    const { cancelQuery } = useCancelQuery(conn)

    const result = cancelQuery()

    expect(result).toBe(true)
    expect(conn.send).toHaveBeenCalledWith({ action: 'cancel' })
  })

  it('returns false when connection is null', () => {
    const { cancelQuery } = useCancelQuery(null)

    const result = cancelQuery()

    expect(result).toBe(false)
  })

  it('returns false when connection is not open', () => {
    const conn = createMockConnection(WebSocket.CLOSED)
    const { cancelQuery } = useCancelQuery(conn)

    const result = cancelQuery()

    expect(result).toBe(false)
    expect(conn.send).not.toHaveBeenCalled()
  })

  it('returns false when connection is connecting', () => {
    const conn = createMockConnection(WebSocket.CONNECTING)
    const { cancelQuery } = useCancelQuery(conn)

    const result = cancelQuery()

    expect(result).toBe(false)
    expect(conn.send).not.toHaveBeenCalled()
  })
})
