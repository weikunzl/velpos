'use client'

import { useState, useCallback } from 'react'
import {
  getSettings,
  updateSettings,
  listChannelProfiles,
  createChannelProfile,
  updateChannelProfile,
  deleteChannelProfile,
  activateChannelProfile,
  fetchModelsForChannel,
  type SettingsData,
  type ChannelProfile,
} from '../api/settingsApi'

export function useSettingsManager() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [profiles, setProfiles] = useState<ChannelProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [operating, setOperating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetchedModels, setFetchedModels] = useState<Record<string, string[]>>({})
  const [fetchingModels, setFetchingModels] = useState<string | null>(null)

  let _loadSeq = 0

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const seq = ++_loadSeq
    try {
      const [settingsData, profilesData] = await Promise.all([
        getSettings(),
        listChannelProfiles(),
      ])
      if (seq !== _loadSeq) return
      setSettings(settingsData)
      setProfiles(profilesData.profiles || [])
    } catch (err: unknown) {
      if (seq !== _loadSeq) return
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (seq === _loadSeq) setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (data: Partial<SettingsData>) => {
    setSaving(true)
    setError(null)
    try {
      const result = await updateSettings(data)
      setSettings(result)
      return result
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleCreate = useCallback(async (form: Partial<ChannelProfile>) => {
    setError(null)
    try {
      await createChannelProfile(form)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create channel profile')
    }
  }, [loadData])

  const handleUpdate = useCallback(async (profileId: string, form: Partial<ChannelProfile>) => {
    setError(null)
    try {
      await updateChannelProfile(profileId, form)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update channel profile')
    }
  }, [loadData])

  const handleDelete = useCallback(async (profileId: string) => {
    setOperating(profileId)
    setError(null)
    try {
      await deleteChannelProfile(profileId)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel profile')
    } finally {
      setOperating(null)
    }
  }, [loadData])

  const handleActivate = useCallback(async (profileId: string) => {
    setOperating(profileId)
    setError(null)
    try {
      await activateChannelProfile(profileId)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate channel profile')
    } finally {
      setOperating(null)
    }
  }, [loadData])

  const handleFetchModels = useCallback(async (key: string, host: string, apiKey: string) => {
    setFetchingModels(key)
    setError(null)
    try {
      const models = await fetchModelsForChannel(host, apiKey)
      setFetchedModels((prev) => ({ ...prev, [key]: models || [] }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models')
    } finally {
      setFetchingModels(null)
    }
  }, [])

  return {
    settings,
    profiles,
    loading,
    saving,
    operating,
    error,
    fetchedModels,
    fetchingModels,
    loadData,
    saveSettings,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handleFetchModels,
  }
}
