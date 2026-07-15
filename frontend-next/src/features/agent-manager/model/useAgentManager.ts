import { useState, useCallback, useRef } from 'react'
import { listAgents, loadAgent, unloadAgent, updateAgent } from '../api/agentApi'
import type { Agent } from '../api/agentApi'

export function useAgentManager() {
  const [categories, setCategories] = useState<Array<{ name: string; agents: Agent[] }>>([])
  const [loading, setLoading] = useState(false)
  const [operating, setOperating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchSeqRef = useRef(0)

  const fetchAgents = useCallback(async (language = 'zh') => {
    setLoading(true)
    setError(null)
    const seq = ++fetchSeqRef.current
    try {
      const data = await listAgents(language)
      if (seq !== fetchSeqRef.current) return
      setCategories(data.categories || [])
    } catch (e: unknown) {
      if (seq !== fetchSeqRef.current) return
      setError((e as Error).message)
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false)
    }
  }, [])

  const withOperating = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setOperating(true)
    setError(null)
    try {
      return await fn()
    } catch (e: unknown) {
      setError((e as Error).message)
      return null
    } finally {
      setOperating(false)
    }
  }, [])

  const handleLoad = useCallback((projectId: string, agentId: string, language = 'zh', sessionId = '') => {
    return withOperating(() => loadAgent(projectId, agentId, language, sessionId))
  }, [withOperating])

  const handleUnload = useCallback((projectId: string, sessionId = '') => {
    return withOperating(() => unloadAgent(projectId, sessionId))
  }, [withOperating])

  const handleUpdate = useCallback((projectId: string) => {
    return withOperating(() => updateAgent(projectId))
  }, [withOperating])

  return { categories, loading, operating, error, fetchAgents, handleLoad, handleUnload, handleUpdate }
}
