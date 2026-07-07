import { get, put } from '@shared/api/httpClient'

export function fetchCommands(projectDir, provider = '') {
  const params = new URLSearchParams({ project_dir: projectDir })
  if (provider) params.set('provider', provider)
  return get(`/commands?${params.toString()}`)
}

export function fetchCommandPolicies(projectDir) {
  return get(`/commands/policies?project_dir=${encodeURIComponent(projectDir)}`)
}

export function saveCommandPolicy(projectDir, policy) {
  return put('/commands/policies', { project_dir: projectDir, ...policy })
}
