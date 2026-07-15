import { get, post } from '@/shared/api/httpClient'

export interface AppSettings {
  permission_mode?: string
  completed_onboarding?: boolean
  effort_level?: string
  skip_dangerous_mode_prompt?: boolean
  disable_non_essential_traffic?: boolean
  agent_teams?: boolean
  tool_search?: boolean
  attribution?: string
  default_model?: string
}

export function getSettingsApi(): Promise<AppSettings> {
  return get('/settings')
}

export function updateSettingsApi(settings: AppSettings): Promise<void> {
  return post('/settings', settings)
}

export function getChannelProfilesApi(): Promise<
  Array<{ id: string; name: string; host: string; provider: string; active: boolean }>
> {
  return get('/settings/channel-profiles')
}

export function createChannelProfileApi(data: {
  name: string
  host: string
  api_key: string
}): Promise<{ id: string }> {
  return post('/settings/channel-profiles', data)
}

export function deleteChannelProfileApi(id: string): Promise<void> {
  return post('/settings/channel-profiles/delete', { id })
}

export function activateChannelProfileApi(id: string): Promise<void> {
  return post('/settings/channel-profiles/activate', { id })
}
