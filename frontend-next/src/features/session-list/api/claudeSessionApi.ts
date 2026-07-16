import { get, del } from '@/shared/api/httpClient'

interface ClaudeSessionInfo {
  session_id: string
  cwd: string
  custom_title?: string
  first_prompt?: string
  summary?: string
  last_modified?: number
  status?: string
  git_branch?: string
}

interface ClaudeSessionsResponse {
  sessions: ClaudeSessionInfo[]
}

export function listClaudeSessions(directory: string | null = null, limit: number | null = null) {
  const params: Record<string, string> = {}
  if (directory) params.directory = directory
  if (limit !== null) params.limit = String(limit)
  const qs = new URLSearchParams(params).toString()
  return get<ClaudeSessionsResponse>(`/claude-sessions${qs ? '?' + qs : ''}`)
}

export function deleteClaudeSession(sessionId: string, directory: string | null = null) {
  const params: Record<string, string> = {}
  if (directory) params.directory = directory
  const qs = new URLSearchParams(params).toString()
  return del<void>(`/claude-sessions/${sessionId}${qs ? '?' + qs : ''}`)
}
