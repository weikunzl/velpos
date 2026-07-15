'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { sessionStore } from './sessionStore'
import type { SessionSummary, SessionState, WsEvent } from '@/shared/types/api'

interface SessionContextValue {
  sessions: SessionSummary[]
  currentSessionId: string | null
  sessionStates: Map<string, SessionState>
  setCurrentSessionId: (id: string | null) => void
  setSessions: (list: SessionSummary[]) => void
  addSession: (session: SessionSummary) => void
  removeSession: (id: string) => void
  updateSessionInList: (id: string, data: Partial<SessionSummary>) => void
  ensureConnection: (sessionId: string) => void
  getWsConnection: (sessionId: string) => ReturnType<typeof sessionStore.getWsConnection>
  globalEvents$: import('rxjs').Observable<WsEvent>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessionsState] = useState<SessionSummary[]>([])
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null)
  const sessionStatesRef = useRef(new Map<string, SessionState>())
  const [, forceUpdate] = useState(0)

  // Subscribe to session list changes
  useEffect(() => {
    const sub = sessionStore.sessions$.subscribe((list) => {
      setSessionsState(list)
    })
    return () => sub.unsubscribe()
  }, [])

  // Subscribe to current session ID changes
  useEffect(() => {
    const sub = sessionStore.currentSessionId$.subscribe((id) => {
      setCurrentSessionIdState(id)
    })
    return () => sub.unsubscribe()
  }, [])

  // Subscribe to state changes for all tracked sessions
  useEffect(() => {
    // We track state changes by subscribing to individual session states
    // when the current session or list changes
    const subs: import('rxjs').Subscription[] = []

    const sub = sessionStore.sessions$.subscribe((list) => {
      // Clean up old subs and subscribe to new sessions
      subs.forEach((s) => s.unsubscribe())
      subs.length = 0

      for (const s of list) {
        const stateSub = sessionStore.getSessionState$(s.session_id).subscribe((state) => {
          sessionStatesRef.current.set(s.session_id, state)
          forceUpdate((n) => n + 1)
        })
        subs.push(stateSub)
      }
    })

    return () => {
      subs.forEach((s) => s.unsubscribe())
      sub.unsubscribe()
    }
  }, [])

  const setCurrentSessionId = useCallback((id: string | null) => {
    sessionStore.setCurrentSessionId(id)
  }, [])

  const setSessions = useCallback((list: SessionSummary[]) => {
    sessionStore.setSessions(list)
  }, [])

  const addSession = useCallback((session: SessionSummary) => {
    sessionStore.addSession(session)
  }, [])

  const removeSession = useCallback((id: string) => {
    sessionStore.removeSession(id)
  }, [])

  const updateSessionInList = useCallback((id: string, data: Partial<SessionSummary>) => {
    sessionStore.updateSessionInList(id, data)
  }, [])

  const ensureConnection = useCallback((sessionId: string) => {
    sessionStore.ensureConnection(sessionId)
  }, [])

  const getWsConnection = useCallback(
    (sessionId: string) => sessionStore.getWsConnection(sessionId),
    [],
  )

  const value: SessionContextValue = {
    sessions,
    currentSessionId,
    sessionStates: sessionStatesRef.current,
    setCurrentSessionId,
    setSessions,
    addSession,
    removeSession,
    updateSessionInList,
    ensureConnection,
    getWsConnection,
    globalEvents$: sessionStore.globalEvents$,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSessionContext must be used within a SessionProvider')
  }
  return ctx
}

/** Get state for the currently selected session */
export function useCurrentSession(): SessionState | null {
  const { currentSessionId, sessionStates } = useSessionContext()
  if (!currentSessionId) return null
  return sessionStates.get(currentSessionId) ?? null
}

/** Get state for a specific session */
export function useSessionState(sessionId: string | null): SessionState | null {
  const { sessionStates } = useSessionContext()
  if (!sessionId) return null
  return sessionStates.get(sessionId) ?? null
}
