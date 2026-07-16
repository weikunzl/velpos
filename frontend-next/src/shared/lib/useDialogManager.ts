import { useCallback, useRef, useEffect } from 'react'

const dialogRegistry = new Map<string, React.MutableRefObject<boolean | undefined>>()

export function useDialogManager() {
  const registerDialog = useCallback((key: string, ref: React.MutableRefObject<boolean | undefined>) => {
    dialogRegistry.set(key, ref)
  }, [])

  const unregisterDialog = useCallback((key: string) => {
    dialogRegistry.delete(key)
  }, [])

  const closeTopmostDialog = useCallback((): boolean => {
    const keys = Array.from(dialogRegistry.keys()).reverse()
    for (const key of keys) {
      const ref = dialogRegistry.get(key)
      if (ref && ref.current === true) {
        ref.current = false
        return true
      }
    }
    return false
  }, [])

  const hasOpenDialogs = useCallback((): boolean => {
    for (const ref of dialogRegistry.values()) {
      if (ref && ref.current === true) return true
    }
    return false
  }, [])

  const useDialog = useCallback((key: string, ref: React.MutableRefObject<boolean | undefined>) => {
    registerDialog(key, ref)
    useEffect(() => {
      return () => unregisterDialog(key)
    }, [key, unregisterDialog])
  }, [registerDialog, unregisterDialog])

  return { registerDialog, unregisterDialog, closeTopmostDialog, hasOpenDialogs, useDialog, dialogRegistry }
}
