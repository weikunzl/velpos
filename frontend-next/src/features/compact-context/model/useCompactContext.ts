import { useState, useCallback } from 'react'
import { compactSessionApi } from '@/entities/session'

export function useCompactContext() {
  const [compacting, setCompacting] = useState(false)

  const compactContext = useCallback(async (sessionId: string) => {
    if (!sessionId) return
    setCompacting(true)
    try {
      await compactSessionApi(sessionId)
    } finally {
      setCompacting(false)
    }
  }, [])

  return { compacting, compactContext }
}
