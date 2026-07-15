import { get, post } from '@/shared/api/httpClient'

export interface Agent {
  id: string
  name: string
  description?: string
  category?: string
  version?: string
}

export function listAgents(language = 'en'): Promise<{ categories: Array<{ name: string; agents: Agent[] }> }> {
  return get(`/agents?language=${language}`)
}

export function loadAgent(projectId: string, agentId: string, language = 'en', sessionId = ''): Promise<void> {
  return post(`/agents/projects/${projectId}/load`, { agent_id: agentId, language, session_id: sessionId })
}

export function unloadAgent(projectId: string, sessionId = ''): Promise<void> {
  return post(`/agents/projects/${projectId}/unload`, { session_id: sessionId })
}

export function updateAgent(projectId: string): Promise<void> {
  return post(`/agents/projects/${projectId}/update`)
}
