'use client'

import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs'
import { createWsConnection, createGlobalEventConnection } from '@/shared/api/wsClient'
import type {
  WsEvent,
  WsConnectedEvent,
  WsMessagesSyncEvent,
  WsMessageEvent,
  WsStatusChangeEvent,
  WsErrorEvent,
  WsMessageQueuedEvent,
  WsAutoContinueEvent,
  WsRunStepEvent,
  WsTimelineEvent,
  WsStatusInfoEvent,
  WsCancelRewindEvent,
  Session,
  SessionSummary,
  Message,
  SessionState,
  RunStep,
  TimelineEvent,
  QueryHistoryEntry,
} from '@/shared/types/api'

// ── Internal per-session state factory ──

function createEmptyState(): SessionState {
  return {
    session: null,
    messages: [],
    status: 'disconnected',
    error: null,
    queryHistory: [],
    runSteps: [],
    timelineEvents: [],
    queued: false,
    queuedPrompt: '',
    canceling: false,
    cancelledHint: false,
    queryStartedAt: null,
    interactiveAnsweredKey: null,
    queuedCommand: null,
    restoredPrompt: '',
  }
}

// ── Session Store (RxJS-based, singleton) ──

class SessionStore {
  // Per-session reactive state
  private _stateMap = new Map<string, BehaviorSubject<SessionState>>()

  // Session list (global)
  private _sessionsSubject = new BehaviorSubject<SessionSummary[]>([])
  readonly sessions$ = this._sessionsSubject.asObservable()

  // Current session ID
  private _currentSessionIdSubject = new BehaviorSubject<string | null>(null)
  readonly currentSessionId$ = this._currentSessionIdSubject.asObservable()

  // WS connections pool
  private _connections = new Map<string, ReturnType<typeof createWsConnection>>()

  // Global event connection
  private _globalEventConnection: ReturnType<typeof createGlobalEventConnection> | null = null
  private _globalEventSub: Subscription | null = null

  // Notifications subject for cross-component events
  private _globalEventsSubject = new Subject<WsEvent>()
  readonly globalEvents$ = this._globalEventsSubject.asObservable()

  // ── Session list management ──

  get sessions(): SessionSummary[] {
    return this._sessionsSubject.value
  }

  setSessions(list: SessionSummary[]) {
    this._sessionsSubject.next(list)
  }

  addSession(session: SessionSummary) {
    this._sessionsSubject.next([session, ...this._sessionsSubject.value])
  }

  removeSession(sessionId: string) {
    this._sessionsSubject.next(
      this._sessionsSubject.value.filter((s) => s.session_id !== sessionId),
    )
  }

  updateSessionInList(sessionId: string, data: Partial<SessionSummary>) {
    this._sessionsSubject.next(
      this._sessionsSubject.value.map((s) =>
        s.session_id === sessionId ? { ...s, ...data } : s,
      ),
    )
  }

  // ── Current session ──

  get currentSessionId(): string | null {
    return this._currentSessionIdSubject.value
  }

  setCurrentSessionId(id: string | null) {
    const oldId = this._currentSessionIdSubject.value
    if (oldId === id) return
    this._currentSessionIdSubject.next(id)
    if (id) {
      this.ensureConnection(id)
    }
    if (oldId && oldId !== id) {
      this.maybeCloseConnection(oldId)
    }
  }

  // ── Per-session state access ──

  private ensureState(sessionId: string): BehaviorSubject<SessionState> {
    if (!this._stateMap.has(sessionId)) {
      this._stateMap.set(sessionId, new BehaviorSubject(createEmptyState()))
    }
    return this._stateMap.get(sessionId)!
  }

  getSessionState$(sessionId: string): Observable<SessionState> {
    return this.ensureState(sessionId).asObservable()
  }

  getSessionState(sessionId: string): SessionState {
    return this.ensureState(sessionId).value
  }

  private patchState(sessionId: string, patch: Partial<SessionState>) {
    const subject = this.ensureState(sessionId)
    subject.next({ ...subject.value, ...patch })
  }

  // ── State update methods ──

  updateSessionFor(sessionId: string, data: Partial<Session>) {
    const current = this.getSessionState(sessionId)
    this.patchState(sessionId, {
      session: current.session ? { ...current.session, ...data } : (data as Session),
    })
  }

  addMessageTo(sessionId: string, msg: Message) {
    const state = this.getSessionState(sessionId)
    const updateLast = Boolean(msg.update_last)
    const updateIndex = msg.update_message_index

    const { update_last: _u, update_message_index: _i, ...stored } = msg
    if (!stored.timestamp) stored.timestamp = Date.now()

    const messages = [...state.messages]

    if (updateIndex != null && updateIndex >= 0 && updateIndex < messages.length) {
      messages[updateIndex] = { ...messages[updateIndex], content: stored.content }
      this.patchState(sessionId, { messages })
      return
    }

    if (updateLast && messages.length > 0) {
      const last = messages[messages.length - 1]
      if (last.type === stored.type) {
        messages[messages.length - 1] = { ...last, content: stored.content }
        this.patchState(sessionId, { messages })
        return
      }
    }

    stored._id = state.messages.length
    messages.push(stored)

    const queryHistory = [...state.queryHistory]
    if (stored.type === 'result' && stored.content) {
      queryHistory.push({
        timestamp: Date.now(),
        duration_ms: (stored.content.duration_ms as number) || 0,
        num_turns: (stored.content.num_turns as number) || 0,
        is_error: (stored.content.is_error as boolean) || false,
        usage: (stored.content.usage as QueryHistoryEntry['usage']) || { input_tokens: 0, output_tokens: 0 },
        total_cost_usd: (stored.content.total_cost_usd as number) || 0,
      })
    }

    this.patchState(sessionId, { messages, queryHistory })
  }

  setMessagesFor(sessionId: string, msgs: Message[], sessionData?: Session) {
    const messages = [...msgs].map((m, i) => {
      if (m._id == null) m._id = i
      return m
    })

    const queryHistory: QueryHistoryEntry[] = []
    for (const m of msgs) {
      if (m.type === 'result' && m.content) {
        queryHistory.push({
          timestamp: Date.now(),
          duration_ms: (m.content.duration_ms as number) || 0,
          num_turns: (m.content.num_turns as number) || 0,
          is_error: (m.content.is_error as boolean) || false,
          usage: (m.content.usage as QueryHistoryEntry['usage']) || { input_tokens: 0, output_tokens: 0 },
          total_cost_usd: (m.content.total_cost_usd as number) || 0,
        })
      }
    }

    this.patchState(sessionId, { messages, queryHistory })
  }

  setStatusFor(sessionId: string, status: string) {
    const prev = this.getSessionState(sessionId).status
    let queryStartedAt = this.getSessionState(sessionId).queryStartedAt

    if (status === 'running') {
      if (prev !== 'running' && prev !== 'reconnecting') {
        queryStartedAt = Date.now()
      } else if (queryStartedAt == null) {
        queryStartedAt = Date.now()
      }
    } else if (status === 'idle' || status === 'error') {
      queryStartedAt = null
    }

    const patch: Partial<SessionState> = { status, queryStartedAt }
    if (status === 'idle') {
      patch.queued = false
      patch.queuedPrompt = ''
    }
    this.patchState(sessionId, patch)
  }

  setErrorFor(sessionId: string, error: string) {
    this.patchState(sessionId, { error })
  }

  setRunStepsFor(sessionId: string, steps: RunStep[]) {
    this.patchState(sessionId, { runSteps: [...steps] })
  }

  upsertRunStepFor(sessionId: string, step: RunStep) {
    const steps = [...this.getSessionState(sessionId).runSteps]
    if (step.step_type === 'run' && !steps.some((s) => s.run_id === step.run_id)) {
      steps.length = 0
    }
    const index = steps.findIndex((s) => s.id === step.id)
    if (index >= 0) {
      steps[index] = { ...steps[index], ...step }
    } else {
      steps.push(step)
    }
    steps.sort((a, b) => String(a.started_time || '').localeCompare(String(b.started_time || '')))
    this.patchState(sessionId, { runSteps: steps })
  }

  setTimelineEventsFor(sessionId: string, events: TimelineEvent[]) {
    this.patchState(sessionId, { timelineEvents: [...events] })
  }

  upsertTimelineEventFor(sessionId: string, event: TimelineEvent) {
    const events = [...this.getSessionState(sessionId).timelineEvents]
    const index = events.findIndex((e) => e.id === event.id)
    if (index >= 0) {
      events[index] = { ...events[index], ...event }
    } else {
      events.push(event)
    }
    events.sort((a, b) => {
      const rc = String(a.run_id || '').localeCompare(String(b.run_id || ''))
      if (rc !== 0) return rc
      return (a.seq || 0) - (b.seq || 0)
    })
    this.patchState(sessionId, { timelineEvents: events })
  }

  setQueuedFor(sessionId: string, val: boolean) {
    this.patchState(sessionId, {
      queued: val,
      ...(val ? {} : { queuedPrompt: '' }),
    })
  }

  setQueuedPromptFor(sessionId: string, prompt: string) {
    this.patchState(sessionId, { queuedPrompt: prompt || '' })
  }

  setCancelingFor(sessionId: string, val: boolean) {
    this.patchState(sessionId, { canceling: val })
  }

  getCancelingFor(sessionId: string): boolean {
    return this.getSessionState(sessionId).canceling
  }

  removeState(sessionId: string) {
    this._stateMap.delete(sessionId)
  }

  // ── WebSocket connection management ──

  private handleWsEvent(sessionId: string, data: WsEvent) {
    switch (data.event) {
      case 'connected': {
        const ev = data as WsConnectedEvent
        this.updateSessionFor(sessionId, ev.session as unknown as Session)
        if (ev.messages) this.setMessagesFor(sessionId, ev.messages, ev.session)
        this.setStatusFor(sessionId, ev.session.status || 'idle')
        const recovery = ev.session.recovery
        const hasQueued = Boolean(recovery?.queued_command)
        const status = ev.session.status || 'idle'
        if (hasQueued && status === 'running') {
          this.setQueuedFor(sessionId, true)
          if (recovery?.queued_command?.prompt) {
            this.setQueuedPromptFor(sessionId, recovery.queued_command.prompt)
          }
        }
        break
      }

      case 'message': {
        const ev = data as WsMessageEvent
        if (
          this.getCancelingFor(sessionId) &&
          ev.data?.type === 'result' &&
          ev.data?.content?.is_error
        ) {
          break
        }
        this.addMessageTo(sessionId, ev.data)
        break
      }

      case 'status_change': {
        const ev = data as WsStatusChangeEvent
        this.setStatusFor(sessionId, ev.status)
        this.updateSessionInList(sessionId, { status: ev.status })
        break
      }

      case 'messages_sync': {
        const ev = data as WsMessagesSyncEvent
        if (Array.isArray(ev.messages)) {
          this.setMessagesFor(sessionId, ev.messages, ev.session)
        }
        break
      }

      case 'error': {
        const ev = data as WsErrorEvent
        if (!this.getCancelingFor(sessionId)) {
          this.setErrorFor(sessionId, ev.message)
        }
        break
      }

      case 'ws_disconnected': {
        const sess = this._sessionsSubject.value.find((s) => s.session_id === sessionId)
        if (sess?.status === 'running') {
          this.setStatusFor(sessionId, 'reconnecting')
        }
        break
      }

      case 'message_queued': {
        const ev = data as WsMessageQueuedEvent
        this.setQueuedFor(sessionId, true)
        if (ev.prompt) {
          this.setQueuedPromptFor(sessionId, ev.prompt)
        }
        break
      }

      case 'resource_waiting': {
        this.updateSessionFor(sessionId, { waiting_for_slot: true })
        break
      }

      case 'stream_waiting': {
        this.setStatusFor(sessionId, 'running')
        this.updateSessionInList(sessionId, { status: 'running' })
        break
      }

      case 'auto_continue': {
        const ev = data as WsAutoContinueEvent
        this.setStatusFor(sessionId, 'running')
        this.updateSessionInList(sessionId, { status: 'running' })
        this.addMessageTo(sessionId, {
          type: 'system',
          content: {
            subtype: 'auto_continue',
            attempt: ev.attempt,
            max: ev.max,
          },
        })
        break
      }

      case 'run_step_started':
      case 'run_step_progress':
      case 'run_step_completed':
      case 'run_step_failed': {
        const ev = data as WsRunStepEvent
        this.upsertRunStepFor(sessionId, ev.step)
        break
      }

      case 'timeline_event': {
        const ev = data as WsTimelineEvent
        this.upsertTimelineEventFor(sessionId, ev.timeline_event)
        break
      }

      case 'cancel_rewind': {
        const ev = data as WsCancelRewindEvent
        this.setCancelingFor(sessionId, false)
        this.updateSessionFor(sessionId, ev.session)
        if (ev.messages) this.setMessagesFor(sessionId, ev.messages, ev.session)
        this.setStatusFor(sessionId, ev.session.status || 'idle')
        const s = this.getSessionState(sessionId)
        if (s.session) {
          s.session.waiting_for_slot = false
        }
        this.setQueuedFor(sessionId, false)
        this.updateSessionInList(sessionId, ev.session)
        break
      }

      case 'status': {
        const ev = data as WsStatusInfoEvent
        const sessionUpdate = { ...ev.session }
        if (!sessionUpdate.git_branch) {
          delete sessionUpdate.git_branch
        }
        this.updateSessionFor(sessionId, sessionUpdate as Session)
        if (ev.session.status === 'running' || ev.session.status === 'idle') {
          this.updateSessionFor(sessionId, { waiting_for_slot: false })
        }
        this.setStatusFor(sessionId, ev.session.status || 'idle')
        this.updateSessionInList(sessionId, ev.session)
        break
      }

      default: {
        // Forward other events to global subject
        this._globalEventsSubject.next(data)
        break
      }
    }
  }

  ensureConnection(sessionId: string) {
    if (this._connections.has(sessionId)) return
    const connection = createWsConnection(sessionId)
    this._connections.set(sessionId, connection)

    // Subscribe to WS events
    const sub = connection.events$.subscribe((event) => {
      this.handleWsEvent(sessionId, event)
    })
    // Store subscription for cleanup
    ;(connection as unknown as Record<string, unknown>)._sub = sub
  }

  private maybeCloseConnection(sessionId: string) {
    const sess = this._sessionsSubject.value.find((s) => s.session_id === sessionId)
    if (!sess || sess.status !== 'running') {
      this.forceCloseConnection(sessionId)
    }
  }

  forceCloseConnection(sessionId: string) {
    const conn = this._connections.get(sessionId)
    if (conn) {
      const sub = (conn as unknown as Record<string, unknown>)._sub as Subscription | undefined
      sub?.unsubscribe()
      conn.close()
      this._connections.delete(sessionId)
    }
  }

  getWsConnection(sessionId: string) {
    return this._connections.get(sessionId) ?? null
  }

  // ── Global event connection ──

  initGlobalEvents() {
    if (this._globalEventConnection) return
    this._globalEventConnection = createGlobalEventConnection()
    this._globalEventSub = this._globalEventConnection.events$.subscribe((event) => {
      this._globalEventsSubject.next(event)
    })
  }

  destroyGlobalEvents() {
    this._globalEventSub?.unsubscribe()
    this._globalEventConnection?.close()
    this._globalEventConnection = null
    this._globalEventSub = null
  }

  // ── Cleanup ──

  destroy() {
    this.destroyGlobalEvents()
    for (const [id, conn] of this._connections) {
      const sub = (conn as unknown as Record<string, unknown>)._sub as Subscription | undefined
      sub?.unsubscribe()
      conn.close()
    }
    this._connections.clear()
    this._stateMap.clear()
    this._sessionsSubject.complete()
    this._currentSessionIdSubject.complete()
    this._globalEventsSubject.complete()
  }
}

// Singleton instance
export const sessionStore = new SessionStore()
