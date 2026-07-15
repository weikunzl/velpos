'use client'

import { useEffect, useRef } from 'react'
import { useSessions } from '@/entities/session/api/useSessionQuery'
import { useProjects } from '@/entities/project/api/useProjectQuery'
import { useSessionContext, useCurrentSession } from '@/entities/session'
import { sessionStore } from '@/entities/session'

export default function Home() {
  const { data: sessions, isLoading } = useSessions()
  useProjects()
  const { currentSessionId, setCurrentSessionId, sessions: sessionList } = useSessionContext()
  const currentSession = useCurrentSession()

  // Sync session list to store
  useEffect(() => {
    if (sessions) {
      sessionStore.setSessions(sessions)
    }
  }, [sessions])

  // Auto-select first session on load
  useEffect(() => {
    if (sessions && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].session_id)
    }
  }, [sessions, currentSessionId, setCurrentSessionId])

  // Init global events
  useEffect(() => {
    sessionStore.initGlobalEvents()
    return () => {
      sessionStore.destroyGlobalEvents()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="header-left">
            <div className="skel-circle" />
            <div className="skel-bar" style={{ width: 80, height: 16 }} />
          </div>
          <div className="header-right">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skel-circle" />
            ))}
          </div>
        </header>
        <div className="app-body">
          <aside className="skel-sidebar">
            <div className="skel-sidebar-header">
              <div className="skel-bar" style={{ width: '60%', height: 12 }} />
            </div>
            <div className="skel-sidebar-list">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skel-session-item">
                  <div className="skel-bar" style={{ width: `${50 + i * 7}%`, height: 10 }} />
                  <div className="skel-bar" style={{ width: '40%', height: 8, marginTop: 6 }} />
                </div>
              ))}
            </div>
          </aside>
          <main className="app-main">
            <div className="empty-state">
              <span>Loading...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <AppLogo />
        </div>
        <div className="header-right">
          <span className="text-sm text-text-muted">
            {currentSession?.session?.name || 'No session selected'}
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="app-body">
        {/* Sidebar: will be replaced with SessionSidebar component */}
        <aside className="main-sidebar">
          <div className="p-4 border-b border-glass-border">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Sessions
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sessionList.map((s) => (
              <button
                key={s.session_id}
                onClick={() => setCurrentSessionId(s.session_id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                  s.session_id === currentSessionId
                    ? 'bg-layer-active text-accent'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <div className="font-medium truncate">{s.name || 'Unnamed'}</div>
                <div className="text-xs text-text-muted mt-0.5">{s.status}</div>
              </button>
            ))}
            {sessionList.length === 0 && (
              <div className="text-sm text-text-muted px-3 py-8 text-center">
                No sessions yet
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="app-main">
          {currentSessionId ? (
            <ChatPanelPlaceholder sessionId={currentSessionId} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="empty-text">Select or create a session to start</div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

/** Placeholder for the ChatPanelPage, to be replaced with full implementation */
function ChatPanelPlaceholder({ sessionId }: { sessionId: string }) {
  const currentSession = useCurrentSession()
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        {currentSession?.messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Start a conversation by sending a message below.
          </div>
        )}
        {currentSession?.messages.map((msg, i) => (
          <div key={msg._id ?? i} className={`mb-4 max-w-[65%] ${msg.type === 'result' || msg.type === 'text' ? 'ml-auto' : ''}`}>
            <div
              className={`px-4 py-3 rounded-lg text-sm ${
                msg.type === 'result' || msg.type === 'text'
                  ? 'bg-accent-dim text-text-primary'
                  : 'bg-bg-secondary text-text-primary'
              }`}
            >
              {JSON.stringify(msg.content).slice(0, 200)}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-glass-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const input = e.target as HTMLInputElement
                if (input.value.trim()) {
                  const ws = sessionStore.getWsConnection(sessionId)
                  if (ws) {
                    ws.send({
                      action: 'send_prompt',
                      prompt: input.value.trim(),
                    })
                  }
                  input.value = ''
                }
              }
            }}
          />
          <button
            className="bg-accent text-text-on-accent px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            onClick={() => {
              // TODO: implement send
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

/** Simple App Logo */
function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon fill="#4a9eff" points="256,56 108,200 148,400 256,296"/>
        <polygon fill="#a78bfa" points="256,56 404,200 364,400 256,296"/>
        <polygon fill="#3b5998" points="148,400 256,456 256,296"/>
        <polygon fill="#7c3aed" opacity="0.8" points="364,400 256,456 256,296"/>
        <polygon fill="#c4b5fd" opacity="0.5" points="256,56 200,148 256,180 312,148"/>
      </svg>
      <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Velpos</span>
    </div>
  )
}
