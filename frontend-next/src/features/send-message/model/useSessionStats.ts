'use client'

import { useState, useEffect, useMemo } from 'react'
import { sessionStore } from '@/entities/session'
import { listModelsApi } from '@/entities/session'
import { getProjectUsageApi } from '@/entities/session/api/usageApi'

const DEFAULT_CONTEXT_SIZE = 200000

interface ModelContextSizes {
  [model: string]: number
}

interface ContextUsage {
  current: number
  max: number
  ratio: number
  percent: number
}

interface ToolStat {
  name: string
  count: number
}

interface SessionStats {
  gitBranch: string
  contextUsage: ContextUsage
  toolStats: ToolStat[]
  projectUsage: {
    total_sessions: number
    total_input_tokens: number
    total_output_tokens: number
    total_cost_usd: number
  } | null
}

let modelContextSizesPromise: Promise<ModelContextSizes> | null = null

interface ModelInfo {
  value?: string
  context_window?: number
}

async function fetchModelContextSizes(): Promise<ModelContextSizes> {
  if (modelContextSizesPromise) return modelContextSizesPromise
  modelContextSizesPromise = (async () => {
    try {
      const res = await listModelsApi()
      const models = (res as ModelInfo[]) || []
      const sizes: ModelContextSizes = {}
      for (const m of models) {
        if (m.value && m.context_window) {
          sizes[m.value] = m.context_window
        }
      }
      return sizes
    } catch {
      modelContextSizesPromise = null
      return {}
    }
  })()
  return modelContextSizesPromise
}

export function useSessionStats(sessionId: string | null): SessionStats {
  const [modelSizes, setModelSizes] = useState<ModelContextSizes>({})

  // Fetch model context sizes once
  useEffect(() => {
    fetchModelContextSizes().then(setModelSizes)
  }, [])

  // Subscribe to session state
  const [state, setState] = useState(() =>
    sessionId ? sessionStore.getSessionState(sessionId) : null,
  )

  useEffect(() => {
    if (!sessionId) {
      setState(null)
      return
    }

    setState(sessionStore.getSessionState(sessionId))
    const sub = sessionStore.getSessionState$(sessionId).subscribe((s) => {
      setState(s)
    })
    return () => sub.unsubscribe()
  }, [sessionId])

  // Fetch project usage
  const [projectUsage, setProjectUsage] = useState<SessionStats['projectUsage']>(null)

  useEffect(() => {
    if (!sessionId) return
    const current = sessionStore.getSessionState(sessionId)?.session
    if (!current?.project_id) return

    let cancelled = false
    getProjectUsageApi(current.project_id).then((data) => {
      if (!cancelled) setProjectUsage(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [sessionId, state?.session?.project_id, state?.session?.usage?.input_tokens, state?.session?.usage?.output_tokens])

  // Derived values
  const stats = useMemo(() => {
    const session = state?.session
    const messages = state?.messages ?? []
    const queryHistory = state?.queryHistory ?? []

    const gitBranch = session?.git_branch || ''

    // Context usage ratio
    const model = session?.model || ''
    const maxTokens = modelSizes[model] || DEFAULT_CONTEXT_SIZE

    const lastInputTokens = ((session as unknown as Record<string, number>)?.last_input_tokens) || 0

    let currentContextTokens = 0

    if (queryHistory.length > 0) {
      const lastQuery = queryHistory[queryHistory.length - 1]
      const lastQueryInput = (lastQuery as unknown as Record<string, unknown>)?.usage
        ? ((lastQuery as unknown as Record<string, Record<string, unknown>>).usage?.input_tokens as number) || 0
        : 0
      if (lastQueryInput > 0) {
        currentContextTokens = lastQueryInput
      }
    }

    if (lastInputTokens > 0) {
      currentContextTokens = lastInputTokens
    }

    const ratio = maxTokens > 0 ? currentContextTokens / maxTokens : 0
    const contextUsage: ContextUsage = {
      current: currentContextTokens,
      max: maxTokens,
      ratio: Math.min(ratio, 1),
      percent: Math.min(Math.round(ratio * 100), 100),
    }

    // Tool stats
    const counts: Record<string, number> = {}
    for (const msg of messages) {
      if (msg.type === 'assistant' && (msg.content as Record<string, unknown>)?.blocks) {
        const blocks = (msg.content as Record<string, Array<Record<string, unknown>>>).blocks || []
        for (const block of blocks) {
          if (block.type === 'tool_use' && block.name) {
            counts[block.name as string] = (counts[block.name as string] || 0) + 1
          }
        }
      }
    }
    const toolStats: ToolStat[] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    return { gitBranch, contextUsage, toolStats }
  }, [state, modelSizes])

  return {
    ...stats,
    projectUsage,
  }
}
