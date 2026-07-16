'use client'

import { useCallback } from 'react'
import { sessionStore } from '@/entities/session'
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useBatchDeleteSessions,
  useRenameSession,
} from '@/entities/session'
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useReorderProjects,
  useEnsureProjectsByDirs,
} from '@/entities/project'
import { listClaudeSessions, deleteClaudeSession } from '../api/claudeSessionApi'
import { LAST_SESSION_ID_KEY, LAST_AGENT_PROVIDER_KEY } from '@/shared/lib/constants'

type LocalSession = import('@/shared/types/api').SessionSummary & {
  source?: string
}

interface EnsuradDirResult {
  mappings?: Record<string, string>
}

export function useSessionList() {
  const { data: sessionsData } = useSessions()
  const projectsData = useProjects()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const batchDeleteSessions = useBatchDeleteSessions()
  const renameSession = useRenameSession()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const reorderProjects = useReorderProjects()
  const ensureProjectsByDirs = useEnsureProjectsByDirs()

  const sessions = sessionStore.sessions
  const currentSessionId = sessionStore.currentSessionId

  const resolveAgentProvider = useCallback((explicitProvider?: string) => {
    if (explicitProvider) return explicitProvider
    return localStorage.getItem(LAST_AGENT_PROVIDER_KEY) || 'claude'
  }, [])

  const loadSessions = useCallback(async () => {
    const [vpData, claudeData] = await Promise.all([
      Promise.resolve(sessionsData),
      listClaudeSessions().catch(() => ({ sessions: [] })),
    ])
    return { vpSessions: vpData || [], claudeSessions: claudeData?.sessions || [] }
  }, [sessionsData])

  const handleCreate = useCallback(async (payload: {
    mode: string
    name: string
    dirPath?: string
    githubUrl?: string
    provider: string
  }) => {
    if (payload.mode === 'local' && payload.dirPath) {
      const result = await ensureProjectsByDirs.mutateAsync([payload.dirPath]) as unknown as EnsuradDirResult
      const projectId = result.mappings?.[payload.dirPath]
      if (!projectId) throw new Error('Failed to create project from local path')

      const session = await createSession.mutateAsync({
        projectId,
        projectDir: payload.dirPath,
        provider: resolveAgentProvider(payload.provider),
      })
      if (session) {
        sessionStore.addSession({ ...session, source: 'velpos' } as LocalSession)
        sessionStore.setCurrentSessionId(session.session_id)
      }
      return
    }

    const project = await createProject.mutateAsync({
      name: payload.name,
      path: payload.githubUrl || payload.name,
    })
    const session = await createSession.mutateAsync({
      projectId: project.id,
      projectDir: (project as unknown as Record<string, string>).dir_path || '',
      provider: resolveAgentProvider(payload.provider),
    })
    if (session) {
      sessionStore.addSession({ ...session, source: 'velpos' } as LocalSession)
      sessionStore.setCurrentSessionId(session.session_id)
    }
  }, [createSession, createProject, ensureProjectsByDirs, resolveAgentProvider])

  const handleDelete = useCallback(async (sessionId: string) => {
    const session = sessions.find((s) => s.session_id === sessionId)
    if (!session) return

    if ((session as unknown as Record<string, string>).source === 'claude-code') {
      await deleteClaudeSession(sessionId, (session as unknown as Record<string, string>).project_dir || null)
    } else {
      await deleteSession.mutateAsync({ sessionId })
    }
    sessionStore.removeSession(sessionId)
    sessionStore.removeState(sessionId)

    if (currentSessionId === sessionId) {
      const remaining = sessions.find((s) => s.session_id !== sessionId && (s as unknown as Record<string, string>).source !== 'claude-code')
      if (remaining) {
        sessionStore.setCurrentSessionId(remaining.session_id)
      } else {
        sessionStore.setCurrentSessionId(null)
        localStorage.removeItem(LAST_SESSION_ID_KEY)
      }
    }
  }, [sessions, currentSessionId, deleteSession])

  const handleRename = useCallback(async ({ sessionId, name }: { sessionId: string; name: string }) => {
    await renameSession.mutateAsync({ sessionId, name })
    sessionStore.updateSessionInList(sessionId, { name } as import('@/shared/types/api').SessionSummary)
  }, [renameSession])

  const handleCreateInProject = useCallback(async (projectId: string) => {
    const projects = projectsData?.data || []
    const project = projects.find((p: import('@/shared/types/api').Project) => p.id === projectId)
    const session = await createSession.mutateAsync({
      projectId,
      projectDir: (project as unknown as Record<string, string>)?.dir_path || '',
      provider: resolveAgentProvider(),
    })
    if (session) {
      sessionStore.addSession({ ...session, source: 'velpos' } as LocalSession)
      sessionStore.setCurrentSessionId(session.session_id)
    }
  }, [projectsData, createSession, resolveAgentProvider])

  const handleDeleteProject = useCallback(async (projectId: string) => {
    await deleteProject.mutateAsync(projectId)
    const projectSessions = sessions.filter((s) => s.project_id === projectId)
    for (const s of projectSessions) {
      sessionStore.removeSession(s.session_id)
    }
    if (projectSessions.some((s) => s.session_id === currentSessionId)) {
      const remaining = sessions.find(
        (s) => !projectSessions.find((ps) => ps.session_id === s.session_id),
      )
      if (remaining) {
        sessionStore.setCurrentSessionId(remaining.session_id)
      } else {
        sessionStore.setCurrentSessionId(null)
        localStorage.removeItem(LAST_SESSION_ID_KEY)
      }
    }
  }, [sessions, currentSessionId, deleteProject])

  return {
    loadSessions,
    handleCreate,
    handleDelete,
    handleRename,
    handleCreateInProject,
    handleDeleteProject,
  }
}
