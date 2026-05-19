import { ref } from 'vue'
import { listAgents, loadAgent, unloadAgent, updateAgent } from '../api/agentApi'

// Module-level singleton state
const categories = ref([])
const loading = ref(false)
const operating = ref(false)
const error = ref(null)
const language = ref(localStorage.getItem('pf_agent_lang') || 'zh')
let _fetchSeq = 0

export function useAgentManager() {
  async function fetchAgents() {
    loading.value = true
    error.value = null
    const seq = ++_fetchSeq
    try {
      const data = await listAgents(language.value)
      if (seq !== _fetchSeq) return
      categories.value = data.categories || []
    } catch (e) {
      if (seq !== _fetchSeq) return
      error.value = e.message
    } finally {
      if (seq === _fetchSeq) loading.value = false
    }
  }

  async function withOperating(fn) {
    operating.value = true
    error.value = null
    try {
      return await fn()
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      operating.value = false
    }
  }

  function handleLoad(projectId, agentId, sessionId = '') {
    return withOperating(() => loadAgent(projectId, agentId, language.value, sessionId))
  }

  function handleUnload(projectId, sessionId = '') {
    return withOperating(() => unloadAgent(projectId, sessionId))
  }

  function handleUpdate(projectId) {
    return withOperating(() => updateAgent(projectId))
  }

  function setLanguage(lang) {
    language.value = lang
    localStorage.setItem('pf_agent_lang', lang)
    fetchAgents()
  }

  return {
    categories,
    loading,
    operating,
    error,
    language,
    fetchAgents,
    handleLoad,
    handleUnload,
    handleUpdate,
    setLanguage,
  }
}
