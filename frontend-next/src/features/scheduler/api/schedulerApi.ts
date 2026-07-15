import { get, post, del } from '@/shared/api/httpClient'

export interface ScheduleTask {
  id: string
  project_id: string
  name: string
  cron_expression: string
  prompt: string
  enabled: boolean
  im_channel_id?: string
  auto_unbind?: boolean
  delete_on_success?: boolean
  last_run_at?: string
  next_run_at?: string
  runs?: Array<{ status: string; result_session_id?: string }>
}

export function listSchedulesApi(): Promise<{ tasks: ScheduleTask[] }> {
  return get('/scheduler/tasks')
}

export function createScheduleApi(data: {
  project_id: string
  name: string
  cron_expression: string
  prompt: string
  im_channel_id?: string
  auto_unbind?: boolean
  delete_on_success?: boolean
}): Promise<ScheduleTask> {
  return post('/scheduler/tasks', data)
}

export function deleteScheduleApi(taskId: string): Promise<void> {
  return del(`/scheduler/tasks/${taskId}`)
}

export function toggleScheduleApi(taskId: string, enabled: boolean): Promise<void> {
  return post(`/scheduler/tasks/${taskId}/toggle`, { enabled })
}
