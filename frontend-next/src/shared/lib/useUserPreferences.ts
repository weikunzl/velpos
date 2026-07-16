import { useState, useCallback } from 'react'

const ENTER_BEHAVIOR_KEY = 'pf_enter_behavior'
const ENTER_BEHAVIORS = ['enter-send', 'ctrl-enter-send'] as const

type EnterBehavior = (typeof ENTER_BEHAVIORS)[number]

function getStoredEnterBehavior(): EnterBehavior {
  /* v8 ignore next 6 */ if (typeof window === 'undefined') return 'enter-send'
  try {
    const stored = localStorage.getItem(ENTER_BEHAVIOR_KEY)
    if (stored && ENTER_BEHAVIORS.includes(stored as EnterBehavior)) return stored as EnterBehavior
  } catch { /* ignore */ }
  return 'enter-send'
}

export function useUserPreferences() {
  const [enterBehavior, setEnterBehaviorState] = useState<EnterBehavior>(getStoredEnterBehavior)

  const setEnterBehavior = useCallback((behavior: string) => {
    if (ENTER_BEHAVIORS.includes(behavior as EnterBehavior)) {
      setEnterBehaviorState(behavior as EnterBehavior)
      try { localStorage.setItem(ENTER_BEHAVIOR_KEY, behavior) } catch { /* ignore */ }
    }
  }, [])

  const shouldEnterSend = useCallback((): boolean => {
    return enterBehavior === 'enter-send'
  }, [enterBehavior])

  const shouldCtrlEnterSend = useCallback((): boolean => {
    return enterBehavior === 'ctrl-enter-send'
  }, [enterBehavior])

  return { enterBehavior, enterBehaviors: ENTER_BEHAVIORS, setEnterBehavior, shouldEnterSend, shouldCtrlEnterSend }
}
