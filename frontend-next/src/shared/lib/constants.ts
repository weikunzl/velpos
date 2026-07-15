export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const WS_CLOSE_NORMAL = 1000
export const WS_CLOSE_NOT_FOUND = 4004

export const LAST_SESSION_ID_KEY = 'pf_last_session_id'
export const LAST_AGENT_PROVIDER_KEY = 'pf_last_agent_provider'

export const AGENT_PROVIDERS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor ACP' },
] as const

export function resolveSessionProvider(session: { provider?: string }): string {
  return session?.provider || 'claude'
}
