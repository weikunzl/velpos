import { useEffect, useRef, useCallback } from 'react'

interface ClickOutsideOptions {
  event?: 'mousedown' | 'mouseup' | 'click'
}

export function useClickOutside<T extends HTMLElement>(
  callback: (e: MouseEvent) => void,
  options: ClickOutsideOptions = {},
) {
  const ref = useRef<T | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const { event = 'mousedown' } = options

  const handler = useCallback((e: MouseEvent) => {
    const el = ref.current
    if (!el || el.contains(e.target as Node)) return
    callbackRef.current(e)
  }, [])

  useEffect(() => {
    document.addEventListener(event, handler, true)
    return () => document.removeEventListener(event, handler, true)
  }, [event, handler])

  return ref
}
