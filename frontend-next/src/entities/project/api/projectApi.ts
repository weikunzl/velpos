import { get, post, del, patch } from '@/shared/api/httpClient'
import type { Project } from '@/shared/types/api'

export function createProjectApi(
  name: string,
  path: string,
  projectType?: string,
): Promise<Project> {
  return post('/projects', { name, path, project_type: projectType || '' })
}

export function listProjectsApi(): Promise<Project[]> {
  return get('/projects')
}

export function getProjectApi(projectId: string): Promise<Project> {
  return get(`/projects/${projectId}`)
}

export function deleteProjectApi(projectId: string): Promise<void> {
  return del(`/projects/${projectId}`)
}

export function reorderProjectsApi(projectIds: string[]): Promise<void> {
  return post('/projects/reorder', { project_ids: projectIds })
}

export function ensureProjectsByDirsApi(dirs: string[]): Promise<Project[]> {
  return post('/projects/ensure-by-dirs', { dirs })
}

export function pickProjectDirectoryApi(): Promise<{ path: string; name: string } | null> {
  return get('/projects/pick-directory')
}

export function getGitBranchesApi(projectId: string): Promise<string[]> {
  return get(`/projects/${projectId}/git-branches`)
}

export function checkoutGitBranchApi(projectId: string, branch: string): Promise<void> {
  return post(`/projects/${projectId}/git-checkout`, { branch })
}

export function updateProjectApi(projectId: string, data: Partial<Project>): Promise<Project> {
  return patch(`/projects/${projectId}`, data)
}
