'use client'

import { useState, useCallback, useRef } from 'react'
import { fetchCommands, fetchCommandPolicies, saveCommandPolicy, type CommandItem, type CommandPolicy } from '../api/commandApi'

export interface PolicyRow {
  command_name: string
  command_type: string
  description: string
  enabled: boolean
  visible: boolean
  default_args: Record<string, unknown>
  policy_id?: string
  source?: string
}

export function useCommandPalette(projectDir: string | null) {
  const [commands, setCommands] = useState<CommandItem[]>([])
  const [policies, setPolicies] = useState<CommandPolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const cachedProjectRef = useRef<string | null>(null)
  const cachedProviderRef = useRef<string | null>(null)
  const loadSeqRef = useRef(0)

  const invokableCommands = commands.filter(
    (cmd) =>
      cmd.isUserInvocable !== false &&
      cmd.type !== 'mcp' &&
      cmd.type !== 'local' &&
      cmd.type !== 'local-jsx' &&
      cmd.enabled !== false &&
      cmd.visible !== false
  )

  const paletteCommands = commands.filter(
    (cmd) => cmd.enabled !== false && cmd.visible !== false
  )

  const policyRows: PolicyRow[] = (() => {
    const rowsByKey = new Map<string, PolicyRow>()
    for (const cmd of commands) {
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
    for (const policy of policies) {
      const key = `${policy.command_name}:${policy.command_type}`
      const existing = rowsByKey.get(key) || {
        command_name: policy.command_name,
        command_type: policy.command_type || 'unknown',
        description: '',
        source: 'policy' as const,
      }
      rowsByKey.set(key, {
        ...existing,
        policy_id: policy.id,
        enabled: policy.enabled !== false,
        visible: policy.visible !== false,
        default_args: policy.default_args || {},
      })
    }
    return Array.from(rowsByKey.values()).sort((a, b) =>
      a.command_name.localeCompare(b.command_name)
    )
  })()

  const loadCommands = useCallback(
    async (provider = 'claude', force = false) => {
      if (!projectDir) return
      if (
        !force &&
        cachedProjectRef.current === projectDir &&
        cachedProviderRef.current === provider &&
        commands.length > 0
      ) {
        return
      }
      setLoading(true)
      setError(null)
      const seq = ++loadSeqRef.current
      try {
        const [commandData, policyData] = await Promise.all([
          fetchCommands(projectDir, provider),
          fetchCommandPolicies(projectDir),
        ])
        if (seq !== loadSeqRef.current) return
        setCommands(commandData.commands || [])
        setPolicies(policyData.policies || [])
        cachedProjectRef.current = projectDir
        cachedProviderRef.current = provider
      } catch (e: unknown) {
        if (seq !== loadSeqRef.current) return
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (seq === loadSeqRef.current) setLoading(false)
      }
    },
    [projectDir, commands.length]
  )

  const updateCommandPolicy = useCallback(
    async (row: { command_name: string; command_type?: string; enabled?: boolean; visible?: boolean; default_args?: Record<string, unknown> }, patch: Record<string, unknown> = {}) => {
      if (!projectDir || !row?.command_name) return
      setLoading(true)
      setError(null)
      try {
        await saveCommandPolicy(projectDir, {
          command_name: row.command_name,
          command_type: row.command_type || 'unknown',
          enabled: row.enabled !== false,
          visible: row.visible !== false,
          default_args: row.default_args || {},
          ...patch,
        })
        await loadCommands(cachedProviderRef.current || 'claude', true)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [projectDir, loadCommands]
  )

  const togglePanel = useCallback(() => {
    setVisible((v) => !v)
    if (visible) setSearchQuery('')
  }, [visible])

  const closePanel = useCallback(() => {
    setVisible(false)
    setSearchQuery('')
  }, [])

  const invalidateCache = useCallback(() => {
    cachedProjectRef.current = null
    cachedProviderRef.current = null
    setCommands([])
    setPolicies([])
  }, [])

  const setRemoteCommands = useCallback(
    (remoteCommands: CommandItem[], projectDirVal: string | null = null, providerName: string | null = null) => {
      if (!Array.isArray(remoteCommands)) return
      const merged = new Map(commands.map((cmd) => [`${cmd.name}:${cmd.type}`, cmd]))
      for (const cmd of remoteCommands) {
        merged.set(`${cmd.name}:${cmd.type || 'unknown'}`, cmd)
      }
      setCommands(Array.from(merged.values()))
      if (projectDirVal) cachedProjectRef.current = projectDirVal
      if (providerName) cachedProviderRef.current = providerName
    },
    [commands]
  )

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
    setSearchQuery,
    loadCommands,
    updateCommandPolicy,
    togglePanel,
    closePanel,
    invalidateCache,
    setRemoteCommands,
  }
}
