import { get, post, del, put } from '@/shared/api/httpClient'

export interface SettingsData {
  permissions?: { defaultMode?: string }
  hasCompletedOnboarding?: boolean
  effortLevel?: string
  skipDangerousPrompt?: boolean
  disableNonEssential?: boolean
  agentTeams?: boolean
  toolSearch?: boolean
  attribution?: string
}

export interface ChannelProfile {
  id: string
  name: string
  host: string
  api_key: string
  auth_env_name: string
  model_config: Record<string, string>
  is_active: boolean
  models?: string[]
}

export function getSettings(): Promise<SettingsData> {
  return get('/settings')
}

export function updateSettings(data: Partial<SettingsData>): Promise<SettingsData> {
  return put('/settings', data)
}

export function listChannelProfiles(): Promise<{ profiles: ChannelProfile[] }> {
  return get('/channel-profiles')
}

export function createChannelProfile(data: Partial<ChannelProfile>): Promise<ChannelProfile> {
  return post('/channel-profiles', data)
}

export function updateChannelProfile(profileId: string, data: Partial<ChannelProfile>): Promise<ChannelProfile> {
  return put(`/channel-profiles/${profileId}`, data)
}

export function deleteChannelProfile(profileId: string): Promise<void> {
  return del(`/channel-profiles/${profileId}`)
}

export function activateChannelProfile(profileId: string): Promise<void> {
  return post(`/channel-profiles/${profileId}/activate`)
}

export function fetchModelsForChannel(host: string, apiKey: string): Promise<string[]> {
  return post('/settings/fetch-models', { host, api_key: apiKey })
}
