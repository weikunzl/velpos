import { get, post, put } from '@/shared/api/httpClient'

export interface GitConfig {
  user_name: string
  user_email: string
}

export function getGitConfig(): Promise<GitConfig> {
  return get<GitConfig>('/git/config')
}

export function setGitConfig(userName: string, userEmail: string): Promise<GitConfig> {
  return put<GitConfig>('/git/config', { user_name: userName, user_email: userEmail })
}

export interface SshKey {
  name: string
  type: string
  fingerprint: string
  public_key: string
}

export interface SshKeyList {
  keys: SshKey[]
}

export function listSshKeys(): Promise<SshKeyList> {
  return get<SshKeyList>('/git/ssh/keys')
}

export function generateSshKey(keyType = 'ed25519', comment = ''): Promise<void> {
  return post<void>('/git/ssh/keys', { key_type: keyType, comment })
}
