import { Observable, Subject, timer, Subscription } from 'rxjs'
import { retryWhen, delayWhen, tap, takeWhile, filter, share } from 'rxjs/operators'
import { WS_CLOSE_NORMAL, WS_CLOSE_NOT_FOUND } from '@/shared/lib/constants'
import type { WsEvent } from '@/shared/types/api'

export interface WsConnection {
  events$: Observable<WsEvent>
  send: (data: unknown) => boolean
  close: () => void
  getReadyState: () => number
}

/**
 * Creates an RxJS WebSocket connection with exponential backoff reconnection.
 *
 * Returns an Observable that emits parsed WsEvent objects.
 * The observable auto-reconnects on abnormal close and completes on destroy().
 */
function createWsObservable(url: string): { observable: Observable<WsEvent>; destroy: () => void } {
  const destroy$ = new Subject<void>()
  const eventSubject = new Subject<WsEvent>()
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  const BACKOFF_BASE = 1000
  const BACKOFF_MAX = 30000
  const JITTER_MAX = 500

  function getReconnectDelay(): number {
    const delay = Math.min(BACKOFF_BASE * Math.pow(2, reconnectAttempt), BACKOFF_MAX)
    const jitter = Math.random() * JITTER_MAX * 2 - JITTER_MAX
    return Math.max(delay + jitter, 500)
  }

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempt = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WsEvent
        eventSubject.next(data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = (closeEvent: CloseEvent) => {
      // Emit disconnect event for UI state cleanup
      eventSubject.next({ event: 'ws_disconnected' as const, code: closeEvent.code })

      if (closeEvent.code === WS_CLOSE_NORMAL || closeEvent.code === WS_CLOSE_NOT_FOUND) {
        // clean close — do not reconnect
        return
      }

      // Try reconnect after delay
      const delay = getReconnectDelay()
      reconnectAttempt++
      timer(delay)
        .pipe(takeWhile(() => !destroy$.closed))
        .subscribe(() => {
          connect()
        })
    }

    ws.onerror = () => {
      eventSubject.next({ event: 'error' as const, message: 'WebSocket connection failed' })
    }
  }

  connect()

  const destroy = () => {
    destroy$.next()
    destroy$.complete()
    if (ws) {
      ws.close(WS_CLOSE_NORMAL)
      ws = null
    }
  }

  const observable = eventSubject.asObservable().pipe(
    takeWhile(() => !destroy$.closed),
    share(),
  )

  return { observable, destroy }
}

/**
 * Creates a session-specific WebSocket connection.
 */
export function createWsConnection(sessionId: string): WsConnection {
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8083'
  const url = `${protocol}//${host}/ws/${sessionId}`

  const { observable, destroy } = createWsObservable(url)

  let ws: WebSocket | null = null

  // We need to track the underlying WebSocket for send()
  // Re-create observable to expose send capability
  const wsSubject = new Subject<WsEvent>()

  function connectWithSend() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempt = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WsEvent
        wsSubject.next(data)
      } catch {
        // ignore
      }
    }

    ws.onclose = (closeEvent: CloseEvent) => {
      wsSubject.next({ event: 'ws_disconnected' as const, code: closeEvent.code })
      if (closeEvent.code === WS_CLOSE_NORMAL || closeEvent.code === WS_CLOSE_NOT_FOUND) return
      const delay = getReconnectDelay()
      reconnectAttempt++
      timer(delay).pipe(takeWhile(() => !destroyed)).subscribe(() => connectWithSend())
    }

    ws.onerror = () => {
      wsSubject.next({ event: 'error' as const, message: 'WebSocket connection failed' })
    }

    return ws
  }

  let reconnectAttempt = 0
  const BACKOFF_BASE = 1000
  const BACKOFF_MAX = 30000
  const JITTER_MAX = 500

  function getReconnectDelay(): number {
    const delay = Math.min(BACKOFF_BASE * Math.pow(2, reconnectAttempt), BACKOFF_MAX)
    const jitter = Math.random() * JITTER_MAX * 2 - JITTER_MAX
    return Math.max(delay + jitter, 500)
  }

  let destroyed = false
  connectWithSend()

  const events$ = wsSubject.asObservable().pipe(share())

  return {
    events$,
    send(data: unknown): boolean {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data))
        return true
      }
      return false
    },
    close() {
      destroyed = true
      if (ws) {
        ws.close(WS_CLOSE_NORMAL)
        ws = null
      }
    },
    getReadyState() {
      return ws ? ws.readyState : WebSocket.CLOSED
    },
  }
}

/**
 * Creates a global events WebSocket connection.
 */
export function createGlobalEventConnection(): WsConnection {
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8083'
  const url = `${protocol}//${host}/ws/events`

  let ws: WebSocket | null = null
  const wsSubject = new Subject<WsEvent>()
  let destroyed = false
  let reconnectAttempt = 0

  const BACKOFF_BASE = 1000
  const BACKOFF_MAX = 30000

  function connect() {
    ws = new WebSocket(url)

    ws.onopen = () => {
      reconnectAttempt = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WsEvent
        wsSubject.next(data)
      } catch {
        // ignore
      }
    }

    ws.onclose = () => {
      if (destroyed) return
      const delay = Math.min(BACKOFF_BASE * Math.pow(2, reconnectAttempt), BACKOFF_MAX)
      reconnectAttempt++
      timer(delay).pipe(takeWhile(() => !destroyed)).subscribe(() => connect())
    }
  }

  connect()

  const events$ = wsSubject.asObservable().pipe(share())

  return {
    events$,
    send(_data: unknown): boolean {
      return false
    },
    close() {
      destroyed = true
      if (ws) {
        ws.close(WS_CLOSE_NORMAL)
        ws = null
      }
    },
    getReadyState() {
      return ws ? ws.readyState : WebSocket.CLOSED
    },
  }
}
