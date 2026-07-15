'use client'

import { useEffect, useCallback } from 'react'

type HotkeyAction =
  | { type: 'previous_session' }
  | { type: 'next_session' }
  | { type: 'toggle_settings' }
  | { type: 'toggle_sidebar' }
  | { type: 'toggle_terminal' }
  | { type: 'toggle_workspace' }
  | { type: 'toggle_git_manager' }
  | { type: 'toggle_notifications' }
  | { type: 'toggle_working_sessions' }
  | { type: 'escape' }
  | { type: 'cycle_permission' }

interface GlobalHotkeyConfig {
  onAction: (action: HotkeyAction) => void
  /** Set to true when a dialog is open (disables some global shortcuts) */
  dialogOpen?: boolean
  /** IME composition state — if composing, ignore Enter-based hotkeys */
  isComposing?: boolean
}

const META_KEYS = ['Meta', 'Control'] as const
const isMeta = (e: KeyboardEvent) => e.metaKey || e.ctrlKey

function hotkeyMatches(e: KeyboardEvent): HotkeyAction | null {
  // Cmd/Ctrl + ArrowUp → previous session
  if (isMeta(e) && e.key === 'ArrowUp') return { type: 'previous_session' }
  // Cmd/Ctrl + ArrowDown → next session
  if (isMeta(e) && e.key === 'ArrowDown') return { type: 'next_session' }
  // Cmd/Ctrl + P → settings
  if (isMeta(e) && e.key === 'p') return { type: 'toggle_settings' }
  // Cmd/Ctrl + B → toggle sidebar
  if (isMeta(e) && e.key === 'b') return { type: 'toggle_sidebar' }
  // Cmd/Ctrl + K → command palette / toggle
  if (isMeta(e) && e.key === 'k') return { type: 'toggle_notifications' }
  // Escape → close/cancel
  if (e.key === 'Escape' && !e.shiftKey && !isMeta(e)) return { type: 'escape' }
  // Shift + Tab → cycle permission mode
  if (e.shiftKey && e.key === 'Tab') return { type: 'cycle_permission' }

  return null
}

export function useGlobalHotkeys(config: GlobalHotkeyConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const action = hotkeyMatches(e)
      if (!action) return

      e.preventDefault()
      e.stopPropagation()
      config.onAction(action)
    },
    [config],
  )

  useEffect(() => {
    // Don't attach handler if a dialog is open (dialog should handle its own escape)
    // We still attach but the consumer decides based on dialogOpen
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])
}
