import { useState, useCallback, useRef } from 'react'
import { listSchedulesApi, createScheduleApi, deleteScheduleApi, toggleScheduleApi } from '../api/schedulerApi'
import type { ScheduleTask } from '../api/schedulerApi'

export function useScheduler() {
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeProjectId = useRef('')
  const loadSeqRef = useRef(0)

  const loadSchedules = useCallback(async (projectId = '') => {
    activeProjectId.current = projectId
    setLoading(true)
    setError('')
    const seq = ++loadSeqRef.current
    try {
      const data = await listSchedulesApi()
      if (seq !== loadSeqRef.current) return
      const filtered = projectId ? (data.tasks || []).filter(t => t.project_id === projectId) : (data.tasks || [])
      setTasks(filtered)
    } catch (e: unknown) {
      if (seq !== loadSeqRef.current) return
      setError((e as Error).message || 'Failed to load schedules')
    } finally {
      if (seq === loadSeqRef.current) setLoading(false)
    }
  }, [])

  const mutate = useCallback(async (fn: () => Promise<void>, fallbackMsg: string) => {
    setSaving(true)
    setError('')
    try {
      await fn()
      await loadSchedules(activeProjectId.current)
    } catch (e: unknown) {
      setError((e as Error).message || fallbackMsg)
    } finally {
      setSaving(false)
    }
  }, [loadSchedules])

  const saveNewSchedule = useCallback((payload: {
    project_id: string
    name: string
    prompt: string
    cron_expression: string
    auto_unbind?: boolean
    delete_on_success?: boolean
  }) => {
    return mutate(() => createScheduleApi(payload).then(() => {}), 'Failed to create schedule')
  }, [mutate])

  const toggleSchedule = useCallback((task: ScheduleTask) => {
    if (!task) return Promise.resolve()
    return mutate(() => toggleScheduleApi(task.id, !task.enabled), 'Failed to update schedule')
  }, [mutate])

  const removeSchedule = useCallback((taskId: string) => {
    return mutate(() => deleteScheduleApi(taskId), 'Failed to delete schedule')
  }, [mutate])

  const runNow = useCallback((_taskId: string) => {
    return Promise.resolve()
  }, [])

  return { tasks, loading, saving, error, loadSchedules, saveNewSchedule, toggleSchedule, removeSchedule, runNow }
}
