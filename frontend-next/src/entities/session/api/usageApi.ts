import { get } from '@/shared/api/httpClient'

export function getProjectUsageApi(projectId: string): Promise<{
  total_sessions: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost_usd: number
}> {
  return get(`/sessions/projects/${projectId}/usage`)
}
