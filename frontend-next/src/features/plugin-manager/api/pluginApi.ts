import { get, post } from '@/shared/api/httpClient'

export interface Plugin {
  key: string
  name: string
  description: string
  installed: boolean
  version?: string
}

export function listPlugins(projectDir: string): Promise<{ plugins: Plugin[] }> {
  return get(`/plugins?project_dir=${encodeURIComponent(projectDir)}`)
}

export function installPlugin(plugin: string, projectDir: string): Promise<void> {
  return post('/plugins/install', { plugin, project_dir: projectDir })
}

export function uninstallPlugin(plugin: string, projectDir: string): Promise<void> {
  return post('/plugins/uninstall', { plugin, project_dir: projectDir })
}
