import { ref, computed } from 'vue'
import { fetchCommands, fetchCommandPolicies, saveCommandPolicy } from '../api/commandApi'

const commands = ref([])
const policies = ref([])
const loading = ref(false)
const visible = ref(false)
const error = ref(null)
const searchQuery = ref('')

let cachedProjectDir = null
let cachedProvider = null
let _loadCmdSeq = 0

const invokableCommands = computed(() => commands.value.filter((cmd) => (
  cmd.isUserInvocable !== false
  && cmd.type !== 'mcp'
  && cmd.type !== 'local'
  && cmd.type !== 'local-jsx'
  && cmd.enabled !== false
  && cmd.visible !== false
)))

const paletteCommands = computed(() => commands.value.filter((cmd) => (
  cmd.enabled !== false && cmd.visible !== false
)))

const policyRows = computed(() => {
  const rowsByKey = new Map()
  for (const cmd of commands.value) {
    const key = `${cmd.name}:${cmd.type}`
    rowsByKey.set(key, {
      command_name: cmd.name,
      command_type: cmd.type || 'unknown',
      description: cmd.description || '',
      enabled: cmd.enabled !== false,
      visible: cmd.visible !== false,
      default_args: cmd.default_args || {},
      source: 'command',
    })
  }
  for (const policy of policies.value) {
    const key = `${policy.command_name}:${policy.command_type}`
    const existing = rowsByKey.get(key) || {
      command_name: policy.command_name,
      command_type: policy.command_type || 'unknown',
      description: '',
      source: 'policy',
    }
    rowsByKey.set(key, {
      ...existing,
      policy_id: policy.id,
      enabled: policy.enabled !== false,
      visible: policy.visible !== false,
      default_args: policy.default_args || {},
    })
  }
  return Array.from(rowsByKey.values()).sort((a, b) => a.command_name.localeCompare(b.command_name))
})

export function useCommandPalette() {
  async function loadCommands(projectDir, provider = 'claude', force = false) {
    if (!projectDir) return
    if (!force && cachedProjectDir === projectDir && cachedProvider === provider && commands.value.length > 0) {
      return
    }
    loading.value = true
    error.value = null
    const seq = ++_loadCmdSeq
    try {
      const [commandData, policyData] = await Promise.all([
        fetchCommands(projectDir, provider),
        fetchCommandPolicies(projectDir),
      ])
      if (seq !== _loadCmdSeq) return
      commands.value = commandData.commands || []
      policies.value = policyData.policies || []
      cachedProjectDir = projectDir
      cachedProvider = provider
    } catch (e) {
      if (seq !== _loadCmdSeq) return
      error.value = e.message
    } finally {
      if (seq === _loadCmdSeq) loading.value = false
    }
  }

  async function updateCommandPolicy(projectDir, row, patch = {}) {
    if (!projectDir || !row?.command_name) return
    loading.value = true
    error.value = null
    try {
      await saveCommandPolicy(projectDir, {
        command_name: row.command_name,
        command_type: row.command_type || 'unknown',
        enabled: row.enabled !== false,
        visible: row.visible !== false,
        default_args: row.default_args || {},
        ...patch,
      })
      await loadCommands(projectDir, cachedProvider || 'claude', true)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  function togglePanel() {
    visible.value = !visible.value
    if (!visible.value) {
      searchQuery.value = ''
    }
  }

  function closePanel() {
    visible.value = false
    searchQuery.value = ''
  }

  function invalidateCache() {
    cachedProjectDir = null
    cachedProvider = null
    commands.value = []
    policies.value = []
  }

  function setRemoteCommands(remoteCommands, projectDir = null, providerName = null) {
    if (!Array.isArray(remoteCommands)) return
    const merged = new Map(commands.value.map((cmd) => [`${cmd.name}:${cmd.type}`, cmd]))
    for (const cmd of remoteCommands) {
      merged.set(`${cmd.name}:${cmd.type || 'unknown'}`, cmd)
    }
    commands.value = Array.from(merged.values())
    if (projectDir) cachedProjectDir = projectDir
    if (providerName) cachedProvider = providerName
  }

  return {
    commands,
    invokableCommands,
    paletteCommands,
    policies,
    policyRows,
    loading,
    visible,
    error,
    searchQuery,
    loadCommands,
    updateCommandPolicy,
    togglePanel,
    closePanel,
    invalidateCache,
    setRemoteCommands,
  }
}
