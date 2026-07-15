import { useState, useCallback } from 'react'
import {
  getChannels, createChannel, deleteChannel, renameChannel,
  bindIm, completeBinding, getBindingStatus, unbindIm,
  initializeChannel, resetChannel, syncContext,
} from '../api/imApi'
import type { ImChannel, BindingState } from '../api/imApi'

export function useImBinding() {
  const [bindingState, setBindingState] = useState<BindingState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableChannels, setAvailableChannels] = useState<ImChannel[]>([])
  const [initRequired, setInitRequired] = useState<BindingState | null>(null)
  const [syncResult, setSyncResult] = useState<unknown | null>(null)
  const [activeSessionId, setActiveSessionId] = useState('')

  const isBound = bindingState?.binding_status === 'bound'
  const isBinding = bindingState?.binding_status === 'binding'

  const fetchChannels = useCallback(async () => {
    try {
      const data = await getChannels()
      setAvailableChannels(data || [])
    } catch {
      setAvailableChannels([])
    }
  }, [])

  const fetchStatus = useCallback(async (sessionId: string) => {
    if (!sessionId) return
    if (sessionId !== activeSessionId) {
      setBindingState(null)
      setError(null)
      setInitRequired(null)
      setSyncResult(null)
    }
    setActiveSessionId(sessionId)
    setLoading(true)
    setError(null)
    try {
      const data = await getBindingStatus(sessionId)
      if (sessionId === activeSessionId || !activeSessionId) {
        setBindingState(data || null)
      }
    } catch {
      if (sessionId === activeSessionId || !activeSessionId) {
        setBindingState(null)
        setError(null)
      }
    } finally {
      if (sessionId === activeSessionId || !activeSessionId) {
        setLoading(false)
      }
    }
  }, [activeSessionId])

  const handleCreateChannel = useCallback(async (channelType: string, name = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await createChannel(channelType, name)
      await fetchChannels()
      return data
    } catch (e: unknown) {
      setError((e as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    setError(null)
    try {
      await deleteChannel(channelId)
      await fetchChannels()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }, [fetchChannels])

  const handleRenameChannel = useCallback(async (channelId: string, name: string) => {
    setError(null)
    try {
      await renameChannel(channelId, name)
      await fetchChannels()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }, [fetchChannels])

  const handleBind = useCallback(async (sessionId: string, channelId: string, params: Record<string, unknown> = {}) => {
    if (!sessionId || !channelId) return null
    setActiveSessionId(sessionId)
    setLoading(true)
    setError(null)
    try {
      const data = await bindIm(sessionId, channelId, params)
      if (data?.action === 'init_required') {
        setInitRequired(data)
        return data
      }
      setBindingState(data)
      setInitRequired(null)
      await fetchChannels()
      return data
    } catch (e: unknown) {
      setError((e as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleComplete = useCallback(async (sessionId: string, channelId: string, params: Record<string, unknown> = {}) => {
    if (!sessionId || !channelId) return null
    setLoading(true)
    setError(null)
    try {
      const data = await completeBinding(sessionId, channelId, params)
      setBindingState(data)
      await fetchChannels()
      return data
    } catch (e: unknown) {
      setError((e as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleUnbind = useCallback(async (sessionId: string) => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      await unbindIm(sessionId)
      setBindingState(null)
      await fetchChannels()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleInitialize = useCallback(async (channelId: string, params: Record<string, unknown> = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await initializeChannel(channelId, params)
      if (data?.init_status === 'error' && data?.error_message) {
        setError(data.error_message)
      }
      await fetchChannels()
      return data
    } catch (e: unknown) {
      setError((e as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleResetChannel = useCallback(async (channelId: string) => {
    setLoading(true)
    setError(null)
    try {
      await resetChannel(channelId)
      await fetchChannels()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [fetchChannels])

  const handleSyncContext = useCallback(async (sessionId: string) => {
    if (!sessionId) return null
    setLoading(true)
    setError(null)
    setSyncResult(null)
    try {
      const data = await syncContext(sessionId)
      setSyncResult(data)
      return data
    } catch (e: unknown) {
      setError((e as Error).message)
      setSyncResult({ error: (e as Error).message })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    bindingState, loading, error, availableChannels, initRequired, syncResult,
    isBound, isBinding,
    fetchChannels, fetchStatus,
    handleCreateChannel, handleDeleteChannel, handleRenameChannel,
    handleBind, handleComplete, handleUnbind,
    handleInitialize, handleResetChannel, handleSyncContext,
    clearInitRequired: () => setInitRequired(null),
    clearSyncResult: () => setSyncResult(null),
    resetState: () => { setBindingState(null); setError(null); setInitRequired(null); setSyncResult(null) },
  }
}
