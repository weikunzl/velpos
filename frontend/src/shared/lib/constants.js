export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const WS_CLOSE_NORMAL = 1000

export const WS_CLOSE_NOT_FOUND = 4004

export const LAST_SESSION_ID_KEY = 'pf_last_session_id'

export const LAST_AGENT_PROVIDER_KEY = 'pf_last_agent_provider'

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const AGENT_PROVIDERS = Object.freeze([
  { id: 'claude', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor ACP' },
])

export function resolveSessionProvider(session) {
  return session?.provider || 'claude'
}
