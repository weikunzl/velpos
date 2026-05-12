import { get, post } from '@shared/api/httpClient'

export function executeCommand(command, timeout = 30, cwd = null) {
  return post('/terminal/execute', { command, timeout, cwd })
}

export function openPath(path, app = null) {
  return post('/terminal/open-path', { path, app })
}

export function listApplications() {
  return get('/terminal/applications')
}
