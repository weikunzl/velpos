import { get } from '@/shared/api/httpClient'

export interface RunStep {
  id: string
  type: string
  description: string
  status: string
  started_at: string | null
  completed_at: string | null
  error: string | null
}

export function fetchSessionRunSteps(sessionId: string, runId = 'latest'): Promise<RunStep[]> {
  return get(`/sessions/${encodeURIComponent(sessionId)}/runs/${encodeURIComponent(runId)}/steps`)
}
