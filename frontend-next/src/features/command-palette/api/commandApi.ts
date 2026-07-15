import { get, put } from '@/shared/api/httpClient'

export interface CommandItem {
  name: string
  type: string
  description?: string
  isUserInvocable?: boolean
  enabled?: boolean
  visible?: boolean
  default_args?: Record<string, unknown>
}

export interface CommandPolicy {
  id?: string
  command_name: string
  command_type: string
  description?: string
  enabled: boolean
  visible: boolean
  default_args: Record<string, unknown>
}

export function fetchCommands(projectDir: string, provider = ''): Promise<{ commands: CommandItem[] }> {
  const params = new URLSearchParams({ project_dir: projectDir })
  if (provider) params.set('provider', provider)
  return get(`/commands?${params.toString()}`)
}

export function fetchCommandPolicies(projectDir: string): Promise<{ policies: CommandPolicy[] }> {
  return get(`/commands/policies?project_dir=${encodeURIComponent(projectDir)}`)
}

export function saveCommandPolicy(projectDir: string, policy: Partial<CommandPolicy> & { command_name: string }): Promise<void> {
  return put('/commands/policies', { project_dir: projectDir, ...policy })
}
