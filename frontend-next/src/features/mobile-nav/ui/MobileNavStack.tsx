'use client'

import { useState, useCallback, useMemo } from 'react'
import { useProjects } from '@/entities/project/api/useProjectQuery'
import type { SessionSummary, Project } from '@/shared/types/api'
import { ProjectPickerSheet } from './ProjectPickerSheet'
import { SessionListSheet } from './SessionListSheet'

interface Props {
  visible: boolean
  sessions: SessionSummary[]
  currentSessionId: string | null
  sidebarMode: string
  onVisibleChange: (v: boolean) => void
  onSessionSelect: (session: SessionSummary) => void
  onNewProject: () => void
  onNewSession: (projectId: string) => void
  onDeleteSession: (sessionId: string) => void
  onCopySession: (sessionId: string) => void
}

export function MobileNavStack({
  visible,
  sessions,
  currentSessionId,
  sidebarMode,
  onVisibleChange,
  onSessionSelect,
  onNewProject,
  onNewSession,
  onDeleteSession,
  onCopySession,
}: Props) {
  const { data: projectsData } = useProjects()
  const [layer, setLayer] = useState<'project' | 'sessions'>('project')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const projects = (projectsData as Project[]) || []

  const projectSessions = useMemo(() => {
    if (!selectedProject) return []
    return sessions.filter((s) => s.project_id === selectedProject.id)
  }, [sessions, selectedProject])

  const close = useCallback(() => {
    onVisibleChange(false)
    setTimeout(() => {
      setLayer('project')
      setSelectedProject(null)
    }, 300)
  }, [onVisibleChange])

  const onProjectSelect = useCallback((project: Project) => {
    setSelectedProject(project)
    setLayer('sessions')
  }, [])

  const onBack = useCallback(() => {
    setLayer('project')
  }, [])

  const onSessionSelectHandler = useCallback(
    (session: SessionSummary) => {
      onSessionSelect(session)
      close()
    },
    [onSessionSelect, close]
  )

  const onNewSessionHandler = useCallback(() => {
    if (!selectedProject) return
    onNewSession(selectedProject.id)
    close()
  }, [selectedProject, onNewSession, close])

  if (!visible) return null

  return (
    <>
      <ProjectPickerSheet
        currentProjectId={projects.length > 0 ? projects[0]?.id || null : null}
        sidebarMode={sidebarMode}
        onSelect={onProjectSelect}
        onClose={close}
        onNewProject={() => { onNewProject(); close() }}
      />
      {layer === 'sessions' && selectedProject && (
        <SessionListSheet
          project={selectedProject}
          sessions={projectSessions}
          currentSessionId={currentSessionId}
          onSelect={onSessionSelectHandler}
          onBack={onBack}
          onClose={close}
          onNewSession={onNewSessionHandler}
          onDelete={onDeleteSession}
          onCopy={onCopySession}
        />
      )}

      <style>{`
        .nav-stack-enter-active,
        .nav-stack-leave-active {
          transition: opacity var(--motion-fast) var(--ease-smooth);
        }
        .nav-stack-enter-from,
        .nav-stack-leave-to {
          opacity: 0;
        }
      `}</style>
    </>
  )
}
