'use client'

import { useState, useEffect, useRef } from 'react'

export function useQueryElapsed(queryStartedAt: number | null): string {
  const [elapsed, setElapsed] = useState('0:00')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!queryStartedAt) {
      setElapsed('0:00')
      return
    }

    const started = queryStartedAt

    function update() {
      const ms = Date.now() - started
      const totalSec = Math.floor(ms / 1000)
      const min = Math.floor(totalSec / 60)
      const sec = totalSec % 60
      setElapsed(`${min}:${sec.toString().padStart(2, '0')}`)
    }

    update()
    intervalRef.current = setInterval(update, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [queryStartedAt])

  return elapsed
}
