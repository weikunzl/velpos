'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSessionsApi,
  getSessionApi,
  createSessionApi,
  deleteSessionApi,
  batchDeleteSessionsApi,
  renameSessionApi,
  clearContextApi,
  compactSessionApi,
  createSessionBranchApi,
  listSessionBranchesApi,
  compareSessionsApi,
  convergeSessionBranchesApi,
  listModelsApi,
} from './sessionApi'
import type { CreateSessionParams } from './sessionApi'
import type { SessionSummary, Session } from '@/shared/types/api'

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
  branches: (id: string) => [...sessionKeys.all, 'branches', id] as const,
  compare: (left: string, right: string) => [...sessionKeys.all, 'compare', left, right] as const,
  models: (provider?: string) => [...sessionKeys.all, 'models', provider] as const,
}

/** Fetch all sessions */
export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: () => listSessionsApi(),
    refetchOnWindowFocus: false,
  })
}

/** Fetch single session detail */
export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    queryFn: () => getSessionApi(sessionId!),
    enabled: !!sessionId,
  })
}

/** Create a new session */
export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateSessionParams) => createSessionApi(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

/** Delete a session */
export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, cascade }: { sessionId: string; cascade?: boolean }) =>
      deleteSessionApi(sessionId, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

/** Batch delete sessions */
export function useBatchDeleteSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionIds: string[]) => batchDeleteSessionsApi(sessionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

/** Rename a session */
export function useRenameSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, name }: { sessionId: string; name: string }) =>
      renameSessionApi(sessionId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

/** Clear session context */
export function useClearContext() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => clearContextApi(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    },
  })
}

/** Compact session */
export function useCompactSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => compactSessionApi(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) })
    },
  })
}

/** Create session branch */
export function useCreateSessionBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      sessionId: string
      messageIndex: number
      name?: string
      branchCount?: number
      worktreeEnabled?: boolean
    }) =>
      createSessionBranchApi(
        params.sessionId,
        params.messageIndex,
        params.name,
        params.branchCount,
        params.worktreeEnabled,
      ),
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(params.sessionId) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.branches(params.sessionId) })
    },
  })
}

/** List session branches */
export function useSessionBranches(sessionId: string | null) {
  return useQuery({
    queryKey: sessionKeys.branches(sessionId ?? ''),
    queryFn: () => listSessionBranchesApi(sessionId!),
    enabled: !!sessionId,
  })
}

/** Compare sessions */
export function useCompareSessions(leftId: string | null, rightId: string | null) {
  return useQuery({
    queryKey: sessionKeys.compare(leftId ?? '', rightId ?? ''),
    queryFn: () => compareSessionsApi(leftId!, rightId!),
    enabled: !!leftId && !!rightId,
  })
}

/** Converge session branches */
export function useConvergeSessionBranches() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, targetSessionId }: { sessionId: string; targetSessionId: string }) =>
      convergeSessionBranchesApi(sessionId, targetSessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
    },
  })
}

/** List available models */
export function useModels(provider?: string) {
  return useQuery({
    queryKey: sessionKeys.models(provider),
    queryFn: () => listModelsApi(provider),
    staleTime: 5 * 60 * 1000, // models don't change often
  })
}
