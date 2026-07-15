import { get, post, del, patch } from '@/shared/api/httpClient'

export interface ImChannel {
  id: string
  channel_type: string
  display_name?: string
  name?: string
  app_id?: string
  init_status?: string
  bound_session_id?: string
  instances?: ImChannel[]
}

export interface BindingState {
  binding_status: string
  channel_type?: string
  channel_id?: string
  ui_data?: { mode?: string }
  action?: string
}

export function getChannels(): Promise<ImChannel[]> {
  return get('/im/channels')
}

export function createChannel(channelType: string, name = ''): Promise<ImChannel> {
  return post('/im/channels', { channel_type: channelType, name })
}

export function deleteChannel(channelId: string): Promise<void> {
  return del(`/im/channels/${encodeURIComponent(channelId)}`)
}

export function renameChannel(channelId: string, name: string): Promise<void> {
  return patch(`/im/channels/${encodeURIComponent(channelId)}`, { name })
}

export function bindIm(sessionId: string, channelId: string, params: Record<string, unknown> = {}): Promise<BindingState> {
  return post('/im/bindings', { session_id: sessionId, channel_id: channelId, params })
}

export function completeBinding(sessionId: string, channelId: string, params: Record<string, unknown> = {}): Promise<BindingState> {
  return post('/im/bindings/complete', { session_id: sessionId, channel_id: channelId, ...params })
}

export function getBindingStatus(sessionId: string): Promise<BindingState> {
  return get(`/im/bindings/${encodeURIComponent(sessionId)}`)
}

export function unbindIm(sessionId: string): Promise<void> {
  return del(`/im/bindings/${encodeURIComponent(sessionId)}`)
}

export function initializeChannel(channelId: string, params: Record<string, unknown> = {}): Promise<{ init_status: string; error_message?: string }> {
  return post(`/im/channels/${encodeURIComponent(channelId)}/init`, { params })
}

export function resetChannel(channelId: string): Promise<void> {
  return del(`/im/channels/${encodeURIComponent(channelId)}/init`)
}

export function syncContext(sessionId: string): Promise<void> {
  return post(`/im/bindings/${encodeURIComponent(sessionId)}/sync-context`, {})
}
