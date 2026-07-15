import { get, post } from '@/shared/api/httpClient'

export interface TeamTemplate {
  id: string
  name: string
  description?: string
  mode: string
  steps?: TeamStep[]
}

export interface TeamStep {
  role: string
  role_label?: string
  prompt_hint?: string
}

export interface TeamConfig {
  max_concurrent?: number
  worker_max_turns?: number
  worker_max_budget_usd?: number
  max_depth?: number
  file_checkpointing?: boolean
  mode?: string
  steps?: TeamStep[]
}

export interface TeamTask {
  task_id: string
  main_project_id: string
  coordinator_session_id: string
  target_project_id: string
  target_role: string
  worker_session_id?: string
  prompt: string
  status: string
  result_summary?: string
  error_message?: string
  parent_task_id?: string
  depth: number
  pipeline_step?: number
  trace_id?: string
  created_at?: string
  completed_at?: string
  duration_ms?: number
  cost_usd?: number
}

export interface WorkerSessionState {
  display_status: string
  task_status: string
  waiting_for_input: boolean
  agent_state?: string
  interaction_type?: string
}

export function listTeamTemplates(language = 'en', mode = ''): Promise<TeamTemplate[]> {
  const params = new URLSearchParams({ language })
  if (mode) params.set('mode', mode)
  return get(`/agents/teams/templates?${params.toString()}`)
}

export function createTeamProject(name: string, dirPath: string, teamConfig: TeamConfig): Promise<unknown> {
  return post('/projects/teams', { name, dir_path: dirPath, team_config: teamConfig })
}

export function getTeamTimeline(projectId: string, sessionId: string): Promise<TeamTask[]> {
  return get(`/teams/${projectId}/timeline/${sessionId}`)
}

export interface LinkedSession extends WorkerSessionState {
  session_id: string
}

export function getLinkedSessions(projectId: string, sessionId: string): Promise<LinkedSession[]> {
  return get(`/teams/${projectId}/linked-sessions/${sessionId}`)
}

export function getTeamTaskDetail(projectId: string, taskId: string): Promise<TeamTask> {
  return get(`/teams/${projectId}/tasks/${taskId}`)
}

export function getSessionArtifacts(sessionId: string): Promise<unknown[]> {
  return get(`/sessions/${sessionId}/artifacts`)
}

export function getWorkerContext(sessionId: string): Promise<{ coordinator_session_id: string; team_project_id: string; team_project_name: string; role: string }> {
  return get(`/teams/worker-context/${sessionId}`)
}

export function cancelTeamTask(projectId: string, taskId: string): Promise<void> {
  return post(`/teams/${projectId}/tasks/${taskId}/cancel`)
}

export function retryTeamTask(projectId: string, taskId: string): Promise<void> {
  return post(`/teams/${projectId}/tasks/${taskId}/retry`)
}
