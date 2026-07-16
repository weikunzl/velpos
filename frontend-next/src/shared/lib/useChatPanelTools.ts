import { useState, useCallback } from 'react'

const DEBUG_KEY = 'pf_debug_mode'
const RUNTIME_KEY = 'pf_runtime_panel'

function getStoredBoolean(key: string): boolean {
  /* v8 ignore next 2 */ if (typeof window === 'undefined') return false
  return localStorage.getItem(key) === 'true'
}

export function useChatPanelTools() {
  const [debugMode, setDebugMode] = useState(() => getStoredBoolean(DEBUG_KEY))
  const [runtimePanelVisible, setRuntimePanelVisible] = useState(() => getStoredBoolean(RUNTIME_KEY))

  const toggleDebug = useCallback(() => {
    setDebugMode(prev => {
      const next = !prev
      localStorage.setItem(DEBUG_KEY, String(next))
      return next
    })
  }, [])

  const toggleRuntimePanel = useCallback(() => {
    setRuntimePanelVisible(prev => {
      const next = !prev
      localStorage.setItem(RUNTIME_KEY, String(next))
      return next
    })
  }, [])

  return { debugMode, runtimePanelVisible, toggleDebug, toggleRuntimePanel }
}
