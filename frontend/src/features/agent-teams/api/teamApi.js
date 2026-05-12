import { get, post, patch } from '@shared/api/httpClient'

export async function listTeamTemplates(language = 'en', mode = '') {
  const params = new URLSearchParams({ language })
  if (mode) params.set('mode', mode)
  return get(`/agents/teams/templates?${params.toString()}`)
}

export async function createTeamProject(name, dirPath, teamConfig) {
  return post('/projects/teams', {
    name,
    dir_path: dirPath,
    team_config: teamConfig,
  })
}

export async function getTeamOverview(projectId) {
  return get(`/projects/${projectId}/team-overview`)
}

export async function getTeamTimeline(projectId, sessionId) {
  return get(`/teams/${projectId}/timeline/${sessionId}`)
}

export async function getLinkedSessions(projectId, sessionId) {
  return get(`/teams/${projectId}/linked-sessions/${sessionId}`)
}

export async function getWorkerContext(sessionId) {
  return get(`/teams/worker-context/${sessionId}`)
}

export async function updateTeamConfig(projectId, teamConfig) {
  return patch(`/projects/${projectId}/team-config`, {
    team_config: teamConfig,
  })
}
