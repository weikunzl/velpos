import { post } from '@/shared/api/httpClient'

export function terminalExecuteApi(sessionId: string, command: string): Promise<{ output: string }> {
  return post(`/sessions/${sessionId}/terminal/exec`, { command })
}

export function openPathApi(path: string): Promise<void> {
  return post('/terminal/open', { path })
}

export function listApplicationsApi(): Promise<Array<{ name: string; path: string }>> {
  return post('/terminal/apps', {})
}
