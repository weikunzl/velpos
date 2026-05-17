import { ref } from 'vue'
import { listSchedules, createSchedule, updateSchedule, deleteSchedule, runScheduleNow } from '../api/schedulerApi'

const tasks = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const activeProjectId = ref('')

export function useScheduler() {
  async function loadSchedules(projectId = '') {
    activeProjectId.value = projectId
    loading.value = true
    error.value = ''
    try {
      const data = await listSchedules(projectId)
      tasks.value = data.tasks || []
    } catch (e) {
      error.value = e.message || 'Failed to load schedules'
    } finally {
      loading.value = false
    }
  }

  async function mutate(fn, fallbackMsg) {
    saving.value = true
    error.value = ''
    try {
      await fn()
      await loadSchedules(activeProjectId.value)
      window.dispatchEvent(new CustomEvent('vp-schedules-changed'))
    } catch (e) {
      error.value = e.message || fallbackMsg
    } finally {
      saving.value = false
    }
  }

  function saveNewSchedule(payload) {
    return mutate(() => createSchedule(payload), 'Failed to create schedule')
  }

  function toggleSchedule(task) {
    if (!task) return
    return mutate(() => updateSchedule(task.id, { enabled: !task.enabled }), 'Failed to update schedule')
  }

  function removeSchedule(taskId) {
    return mutate(() => deleteSchedule(taskId), 'Failed to delete schedule')
  }

  function runNow(taskId) {
    return mutate(() => runScheduleNow(taskId), 'Failed to run schedule')
  }

  return {
    tasks,
    loading,
    saving,
    error,
    loadSchedules,
    saveNewSchedule,
    toggleSchedule,
    removeSchedule,
    runNow,
  }
}
