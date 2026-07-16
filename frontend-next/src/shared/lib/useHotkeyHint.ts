import { useState, useCallback, useEffect, useRef } from 'react'

export function useHotkeyHint() {
  const [isModifierPressed, setIsModifierPressed] = useState(false)
  const keydownRef = useRef<((e: KeyboardEvent) => void) | null>(null)
  const keyupRef = useRef<((e: KeyboardEvent) => void) | null>(null)

  const startListening = useCallback(() => {
    if (keydownRef.current || keyupRef.current) return

    keydownRef.current = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Control') {
        setIsModifierPressed(true)
      }
    }

    keyupRef.current = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Control') {
        setIsModifierPressed(false)
      }
    }

    window.addEventListener('keydown', keydownRef.current)
    window.addEventListener('keyup', keyupRef.current)
  }, [])

  const stopListening = useCallback(() => {
    if (keydownRef.current) {
      window.removeEventListener('keydown', keydownRef.current)
      keydownRef.current = null
    }
    if (keyupRef.current) {
      window.removeEventListener('keyup', keyupRef.current)
      keyupRef.current = null
    }
    setIsModifierPressed(false)
  }, [])

  useEffect(() => {
    return () => stopListening()
  }, [stopListening])

  return { isModifierPressed, startListening, stopListening }
}
