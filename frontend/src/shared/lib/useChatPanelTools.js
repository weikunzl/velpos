import { ref } from 'vue'

const DEBUG_KEY = 'pf_debug_mode'
const RUNTIME_KEY = 'pf_runtime_panel'

const debugMode = ref(localStorage.getItem(DEBUG_KEY) === 'true')
const runtimePanelVisible = ref(localStorage.getItem(RUNTIME_KEY) === 'true')

export function useChatPanelTools() {
  function toggleDebug() {
    debugMode.value = !debugMode.value
    localStorage.setItem(DEBUG_KEY, debugMode.value)
  }

  function toggleRuntimePanel() {
    runtimePanelVisible.value = !runtimePanelVisible.value
    localStorage.setItem(RUNTIME_KEY, runtimePanelVisible.value)
  }

  return {
    debugMode,
    runtimePanelVisible,
    toggleDebug,
    toggleRuntimePanel,
  }
}
