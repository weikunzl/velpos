import { useState, useCallback } from 'react'
import { post } from '@/shared/api/httpClient'

export function useClearContext() {
  const [clearing, setClearing] = useState(false)

  const clearContext = useCallback(async (sessionId: string) => {
    if (!sessionId) return
    setClearing(true)
    try {
      await post('/session/clear-context', { session_id: sessionId })
    } finally {
      setClearing(false)
    }
  }, [])

  return { clearing, clearContext }
}
