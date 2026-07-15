import { get, post, del, patch } from '@/shared/api/httpClient'
import type { SessionSummary, Session } from '@/shared/types/api'

export interface CreateSessionParams {
  name?: string
  projectId?: string
  projectDir?: string
  provider?: string
}

export function createSessionApi(params: CreateSessionParams = {}): Promise<Session> {
  return post('/sessions', {
    name: params.name || '',
    project_id: params.projectId || '',
    project_dir: params.projectDir || '',
    provider: params.provider || 'claude',
  })
}

export function listSessionsApi(): Promise<SessionSummary[]> {
  return get('/sessions')
}

export function getSessionApi(sessionId: string): Promise<Session> {
  return get(`/sessions/${sessionId}`)
}

export function deleteSessionApi(sessionId: string, cascade = false): Promise<void> {
  const query = cascade ? '?cascade=true' : ''
  return del(`/sessions/${sessionId}${query}`)
}

export function batchDeleteSessionsApi(sessionIds: string[]): Promise<void> {
  return post('/sessions/batch-delete', { session_ids: sessionIds })
}

export function clearContextApi(sessionId: string): Promise<void> {
  return post(`/sessions/${sessionId}/clear-context`)
}

export function renameSessionApi(sessionId: string, name: string): Promise<void> {
  return patch(`/sessions/${sessionId}/name`, { name })
}

export function importClaudeSessionApi(claudeSessionId: string, cwd: string, name = ''): Promise<Session> {
  return post('/sessions/import-claude', { claude_session_id: claudeSessionId, cwd, name })
}

export function listModelsApi(provider = ''): Promise<unknown[]> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : ''
  return get(`/sessions/meta/models${query}`)
}

export function compactSessionApi(sessionId: string): Promise<void> {
  return post(`/sessions/${sessionId}/compact`)
}

export function createSessionBranchApi(
  sessionId: string,
  messageIndex: number,
  name = '',
  branchCount = 1,
  worktreeEnabled = false,
): Promise<Session> {
  return post(`/sessions/${sessionId}/branches`, {
    message_index: messageIndex,
    name,
    branch_count: branchCount,
    worktree_enabled: worktreeEnabled,
  })
}

export function listSessionBranchesApi(sessionId: string): Promise<Session[]> {
  return get(`/sessions/${sessionId}/branches`)
}

export function compareSessionsApi(sessionId: string, rightSessionId: string): Promise<unknown> {
  return get(`/sessions/${sessionId}/compare?right=${encodeURIComponent(rightSessionId)}`)
}

export function convergeSessionBranchesApi(sessionId: string, targetSessionId: string): Promise<void> {
  return post(`/sessions/${sessionId}/branches/converge`, { target_session_id: targetSessionId })
}

export function applyVbReviewsApi(
  sessionId: string,
  payload: { projectId?: string; filePath: string; reviews: unknown[] },
): Promise<void> {
  return post(`/sessions/${sessionId}/vb/apply`, {
    project_id: payload.projectId || '',
    file_path: payload.filePath,
    reviews: payload.reviews,
  })
}
