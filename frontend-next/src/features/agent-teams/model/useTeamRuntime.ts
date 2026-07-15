'use client'

import { useState, useCallback, useRef } from 'react'
import { getTeamTimeline, getLinkedSessions, type TeamTask, type WorkerSessionState } from '../api/teamApi'

export function useTeamRuntime() {
  const [teamTasks, setTeamTasks] = useState<Map<string, TeamTask[]>>(new Map())
  const [workerSessionStates, setWorkerSessionStates] = useState<Map<string, WorkerSessionState>>(new Map())

  const mapRef = useRef({ teamTasks, workerSessionStates })
  mapRef.current = { teamTasks, workerSessionStates }

  const displayStatusFromTaskStatus = useCallback((status: string) => {
    if (['completed', 'failed', 'cancelled'].includes(status)) return status
    if (['running', 'waiting_for_help'].includes(status)) return 'running'
    return status || 'idle'
  }, [])

  const setWorkerSessionState = useCallback((sessionId: string, patch: Partial<WorkerSessionState>) => {
    if (!sessionId) return
    setWorkerSessionStates((prev) => {
      const current = prev.get(sessionId) || {} as WorkerSessionState
      const next = new Map(prev)
      next.set(sessionId, { ...current, ...patch })
      return next
    })
  }, [])

  const handleTeamEvent = useCallback((event: { coordinator_session_id?: string; event?: string; task?: TeamTask }) => {
    const coordSessionId = event.coordinator_session_id
    if (!coordSessionId) return
    const task = event.task
    if (!task) return

    setTeamTasks((prev) => {
      const tasks = (prev.get(coordSessionId) || []).slice()
      const idx = tasks.findIndex((t) => t.task_id === task.task_id)
      if (idx >= 0) {
        tasks[idx] = task
      } else {
        tasks.push(task)
      }
      const next = new Map(prev)
      next.set(coordSessionId, tasks)
      return next
    })

    if (task.worker_session_id) {
      setWorkerSessionState(task.worker_session_id, {
        display_status: displayStatusFromTaskStatus(task.status),
        task_status: task.status,
        waiting_for_input: false,
      })
    }
  }, [displayStatusFromTaskStatus, setWorkerSessionState])

  const handleWorkerSessionEvent = useCallback((event: { session_id?: string; event?: string; agent_state?: string; interaction_type?: string }) => {
    const sessionId = event?.session_id
    if (!sessionId) return

    if (event.event === 'session_waiting_for_input') {
      setWorkerSessionState(sessionId, {
        display_status: 'waiting_input',
        waiting_for_input: true,
        agent_state: event.agent_state || 'waiting_permission',
        interaction_type: event.interaction_type || '',
      })
    } else if (event.event === 'session_input_resolved') {
      setWorkerSessionState(sessionId, {
        display_status: 'running',
        waiting_for_input: false,
        agent_state: event.agent_state || 'streaming',
      })
    }
  }, [setWorkerSessionState])

  const getTasksForSession = useCallback((sessionId: string): TeamTask[] => {
    return mapRef.current.teamTasks.get(sessionId) || []
  }, [])

  const getWorkerSessionStateValue = useCallback((sessionId: string): WorkerSessionState | null => {
    return mapRef.current.workerSessionStates.get(sessionId) || null
  }, [])

  const loadTimeline = useCallback(async (projectId: string, sessionId: string): Promise<TeamTask[]> => {
    try {
      const timeline = await getTeamTimeline(projectId, sessionId)
      setTeamTasks((prev) => {
        const next = new Map(prev)
        next.set(sessionId, timeline)
        return next
      })
      for (const task of timeline) {
        if (task.worker_session_id) {
          setWorkerSessionState(task.worker_session_id, {
            display_status: displayStatusFromTaskStatus(task.status),
            task_status: task.status,
          })
        }
      }
      return timeline
    } catch (e) {
      console.error('Failed to load team timeline:', e)
      return []
    }
  }, [displayStatusFromTaskStatus, setWorkerSessionState])

  const loadLinkedSessions = useCallback(async (projectId: string, sessionId: string) => {
    try {
      const sessions = await getLinkedSessions(projectId, sessionId)
      for (const session of sessions) {
        setWorkerSessionState(session.session_id, {
          display_status: session.display_status || displayStatusFromTaskStatus(session.task_status),
          waiting_for_input: Boolean(session.waiting_for_input),
          agent_state: session.agent_state || '',
          task_status: session.task_status || '',
        })
      }
      return sessions
    } catch (e) {
      console.error('Failed to load linked sessions:', e)
      return []
    }
  }, [displayStatusFromTaskStatus, setWorkerSessionState])

  return {
    displayStatusFromTaskStatus,
    handleTeamEvent,
    handleWorkerSessionEvent,
    getTasksForSession,
    getWorkerSessionState: getWorkerSessionStateValue,
    loadTimeline,
    loadLinkedSessions,
  }
}
