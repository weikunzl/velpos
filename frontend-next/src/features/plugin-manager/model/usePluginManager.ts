import { useState, useCallback, useRef } from 'react'
import { listPlugins, installPlugin, uninstallPlugin } from '../api/pluginApi'
import type { Plugin } from '../api/pluginApi'

export function usePluginManager() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(false)
  const [operating, setOperating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadSeqRef = useRef(0)

  const loadAllPlugins = useCallback(async (projectDir: string) => {
    if (!projectDir) return
    setLoading(true)
    setError(null)
    const seq = ++loadSeqRef.current
    try {
      const data = await listPlugins(projectDir)
      if (seq !== loadSeqRef.current) return
      setPlugins(data.plugins || [])
    } catch (e: unknown) {
      if (seq !== loadSeqRef.current) return
      setError((e as Error).message)
    } finally {
      if (seq === loadSeqRef.current) setLoading(false)
    }
  }, [])

  const withPluginOp = useCallback(async (
    pluginKey: string,
    apiFn: (plugin: string, dir: string) => Promise<void>,
    projectDir: string,
  ) => {
    setOperating(pluginKey)
    setError(null)
    try {
      await apiFn(pluginKey, projectDir)
      await loadAllPlugins(projectDir)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setOperating(null)
    }
  }, [loadAllPlugins])

  const handleInstall = useCallback((pluginKey: string, projectDir: string) => {
    return withPluginOp(pluginKey, installPlugin, projectDir)
  }, [withPluginOp])

  const handleUninstall = useCallback((pluginKey: string, projectDir: string) => {
    return withPluginOp(pluginKey, uninstallPlugin, projectDir)
  }, [withPluginOp])

  return { plugins, loading, operating, error, loadAllPlugins, handleInstall, handleUninstall }
}
