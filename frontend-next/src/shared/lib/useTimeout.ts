import { useEffect, useRef, useCallback } from 'react'

export function useTimeout() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const set = useCallback((fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])

  const clear = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id)
    timers.current.delete(id)
  }, [])

  const clearAll = useCallback(() => {
    timers.current.forEach(id => clearTimeout(id))
    timers.current.clear()
  }, [])

  useEffect(() => {
    return () => clearAll()
  }, [clearAll])

  return { set, clear, clearAll }
}
