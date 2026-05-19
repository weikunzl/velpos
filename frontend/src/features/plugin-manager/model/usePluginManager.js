import { ref } from 'vue'
import { listPlugins, installPlugin, uninstallPlugin } from '../api/pluginApi'

export function usePluginManager() {
  const plugins = ref([])
  const loading = ref(false)
  const operating = ref(null) // plugin key currently being operated on
  const error = ref(null)
  let _loadSeq = 0

  async function loadPlugins(projectDir) {
    if (!projectDir) return
    loading.value = true
    error.value = null
    const seq = ++_loadSeq
    try {
      const data = await listPlugins(projectDir)
      if (seq !== _loadSeq) return
      plugins.value = data.plugins || []
    } catch (e) {
      if (seq !== _loadSeq) return
      error.value = e.message
    } finally {
      if (seq === _loadSeq) loading.value = false
    }
  }

  async function withPluginOp(pluginKey, apiFn, projectDir) {
    operating.value = pluginKey
    error.value = null
    try {
      await apiFn(pluginKey, projectDir)
      await loadPlugins(projectDir)
    } catch (e) {
      error.value = e.message
    } finally {
      operating.value = null
    }
  }

  function handleInstall(pluginKey, projectDir) {
    return withPluginOp(pluginKey, installPlugin, projectDir)
  }

  function handleUninstall(pluginKey, projectDir) {
    return withPluginOp(pluginKey, uninstallPlugin, projectDir)
  }

  return {
    plugins,
    loading,
    operating,
    error,
    loadPlugins,
    handleInstall,
    handleUninstall,
  }
}
