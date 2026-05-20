import { ref } from 'vue'
import {
  getWorkspaceDiff,
  listWorkspaceFileHistory,
  listWorkspaceFiles,
  readWorkspaceFile,
  readWorkspaceFileAtRef,
} from '@entities/project/api/projectApi'
import { useCancellableAsync } from '@shared/lib/useCancellableAsync'

export function useWorkspace() {
  const files = ref([])
  const selectedFile = ref(null)
  const selectedDiff = ref(null)
  const fileHistory = ref([])
  const historicalFile = ref(null)
  const loading = ref(false)
  const reading = ref(false)
  const historyLoading = ref(false)
  const error = ref('')
  const openFileTracker = useCancellableAsync()
  const historyFileTracker = useCancellableAsync()

  async function loadFiles(projectId, options = {}) {
    if (!projectId) return
    loading.value = true
    error.value = ''
    try {
      const data = await listWorkspaceFiles(projectId, options)
      files.value = data.files || []
    } catch (e) {
      files.value = []
      error.value = e.message || 'Failed to load files'
    } finally {
      loading.value = false
    }
  }

  async function openFile(projectId, path) {
    if (!projectId || !path) return
    const version = openFileTracker.start()
    reading.value = true
    error.value = ''
    historicalFile.value = null
    fileHistory.value = []
    try {
      const [file, diff] = await Promise.all([
        readWorkspaceFile(projectId, path),
        getWorkspaceDiff(projectId, path),
      ])
      if (!openFileTracker.isCurrent(version)) return
      selectedFile.value = file
      selectedDiff.value = diff
    } catch (e) {
      if (!openFileTracker.isCurrent(version)) return
      selectedFile.value = null
      selectedDiff.value = null
      error.value = e.message || 'Failed to read file'
    } finally {
      if (openFileTracker.isCurrent(version)) reading.value = false
    }
  }

  async function loadFileHistory(projectId, path) {
    if (!projectId || !path) return
    historyLoading.value = true
    try {
      const data = await listWorkspaceFileHistory(projectId, path, 20)
      fileHistory.value = data.commits || []
      return fileHistory.value
    } catch (e) {
      fileHistory.value = []
      error.value = e.message || 'Failed to load file history'
      return []
    } finally {
      historyLoading.value = false
    }
  }

  async function openHistoricalFile(projectId, path, ref) {
    if (!projectId || !path || !ref) return null
    const version = historyFileTracker.start()
    historyLoading.value = true
    try {
      const file = await readWorkspaceFileAtRef(projectId, path, ref)
      if (!historyFileTracker.isCurrent(version)) return null
      historicalFile.value = file
      return file
    } catch (e) {
      if (!historyFileTracker.isCurrent(version)) return null
      historicalFile.value = null
      error.value = e.message || 'Failed to read historical file'
      return null
    } finally {
      if (historyFileTracker.isCurrent(version)) historyLoading.value = false
    }
  }

  function clearSelection() {
    selectedFile.value = null
    selectedDiff.value = null
    historicalFile.value = null
    fileHistory.value = []
  }

  return {
    files,
    selectedFile,
    selectedDiff,
    fileHistory,
    loading,
    reading,
    historyLoading,
    error,
    loadFiles,
    openFile,
    loadFileHistory,
    openHistoricalFile,
    clearSelection,
  }
}
