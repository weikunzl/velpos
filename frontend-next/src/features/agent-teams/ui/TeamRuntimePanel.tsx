'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTeamRuntime } from '../model/useTeamRuntime'
import { getTeamTaskDetail, getSessionArtifacts, cancelTeamTask, retryTeamTask, type TeamTask } from '../api/teamApi'
import { WorkflowEditor } from './WorkflowEditor'

interface Props {
  projectId: string
  sessionId: string
  coordinatorTitle?: string
  onNavigateToSession?: (sessionId: string, projectId: string) => void
}

function patchSet(set: Set<string>, value: string, add: boolean) {
  if (add) set.add(value)
  else set.delete(value)
  return new Set(set)
}

function patchMap<V, K extends string>(map: Map<K, V>, key: K, value: V | undefined): Map<K, V> {
  const next = new Map(map)
  if (value === undefined) next.delete(key as any)
  else next.set(key, value)
  return next
}

export function TeamRuntimePanel({ projectId, sessionId, coordinatorTitle, onNavigateToSession }: Props) {
  const {
    getTasksForSession,
    loadTimeline,
    loadLinkedSessions,
  } = useTeamRuntime()

  const tasks = getTasksForSession(sessionId)

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [taskDetails, setTaskDetails] = useState<Map<string, TeamTask>>(new Map())
  const [taskDetailLoading, setTaskDetailLoading] = useState<Set<string>>(new Set())
  const [taskDetailErrors, setTaskDetailErrors] = useState<Map<string, string>>(new Map())

  const [taskArtifacts, setTaskArtifacts] = useState<Map<string, unknown[]>>(new Map())
  const [artifactLoading, setArtifactLoading] = useState<Set<string>>(new Set())
  const [artifactErrors, setArtifactErrors] = useState<Map<string, string>>(new Map())
  const [diffLoading, setDiffLoading] = useState<Set<string>>(new Set())
  const [taskDiffs, setTaskDiffs] = useState<Map<string, unknown>>(new Map())
  const [diffErrors, setDiffErrors] = useState<Map<string, string>>(new Map())

  const [cancellingTasks, setCancellingTasks] = useState<Set<string>>(new Set())
  const [retryingTasks, setRetryingTasks] = useState<Set<string>>(new Set())

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [editConfig, setEditConfig] = useState({
    max_concurrent: 2,
    worker_max_turns: 50,
    worker_max_budget_usd: 1.0,
    max_depth: 5,
    file_checkpointing: true,
  })

  // Load timeline on mount
  useEffect(() => {
    if (projectId && sessionId) {
      loadTimeline(projectId, sessionId)
      loadLinkedSessions(projectId, sessionId)
    }
  }, [projectId, sessionId, loadTimeline, loadLinkedSessions])

  // Workflow steps from tasks
  const workflowSteps = useMemo(() => {
    return tasks.map((t) => ({
      role: t.target_role,
      role_label: t.target_role,
      status: t.status,
    }))
  }, [tasks])

  const taskDetailFor = useCallback(
    (task: TeamTask) => {
      return taskDetails.get(task.task_id) || task
    },
    [taskDetails]
  )

  async function toggleTaskDetail(task: TeamTask) {
    const taskId = task.task_id
    const willOpen = !expandedTasks.has(taskId)
    setExpandedTasks((prev) => patchSet(prev, taskId, willOpen))
    if (!willOpen || taskDetails.has(taskId) || taskDetailLoading.has(taskId)) return

    setTaskDetailLoading((prev) => patchSet(prev, taskId, true))
    setTaskDetailErrors((prev) => { const m = new Map(prev); m.delete(taskId as string); return m })
    try {
      const detail = await getTeamTaskDetail(projectId, taskId)
      setTaskDetails((prev) => patchMap(prev, taskId, detail))
    } catch (err: unknown) {
      setTaskDetailErrors((prev) =>
        patchMap(prev, taskId, err instanceof Error ? err.message : 'Failed to load task detail')
      )
    } finally {
      setTaskDetailLoading((prev) => patchSet(prev, taskId, false))
    }
  }

  async function loadArtifacts(task: TeamTask) {
    const detail = taskDetailFor(task)
    const workerSessionId = detail.worker_session_id || task.worker_session_id
    if (!workerSessionId || artifactLoading.has(task.task_id)) return
    setArtifactLoading((prev) => patchSet(prev, task.task_id, true))
    setArtifactErrors((prev) => { const m = new Map(prev); m.delete(task.task_id as string); return m })
    try {
      const data = await getSessionArtifacts(workerSessionId)
      const artifacts = (data as { artifacts?: unknown[] })?.artifacts || data || []
      setTaskArtifacts((prev) => patchMap(prev, task.task_id, artifacts))
    } catch (err: unknown) {
      setArtifactErrors((prev) =>
        patchMap(prev, task.task_id, err instanceof Error ? err.message : 'Failed to load artifacts')
      )
    } finally {
      setArtifactLoading((prev) => patchSet(prev, task.task_id, false))
    }
  }

  function isTaskCancellable(task: TeamTask) {
    return task.status === 'running' || task.status === 'waiting_for_help'
  }

  async function cancelTaskHandler(task: TeamTask) {
    if (!isTaskCancellable(task) || cancellingTasks.has(task.task_id)) return
    setCancellingTasks((prev) => patchSet(prev, task.task_id, true))
    try {
      await cancelTeamTask(projectId, task.task_id)
    } catch (err: unknown) {
      setTaskDetailErrors((prev) =>
        patchMap(prev, task.task_id, err instanceof Error ? err.message : 'Cancel failed')
      )
    } finally {
      setCancellingTasks((prev) => patchSet(prev, task.task_id, false))
    }
  }

  function isTaskRetryable(task: TeamTask) {
    return task.status === 'failed' || task.status === 'cancelled'
  }

  async function retryTaskHandler(task: TeamTask) {
    if (!isTaskRetryable(task) || retryingTasks.has(task.task_id)) return
    setRetryingTasks((prev) => patchSet(prev, task.task_id, true))
    try {
      await retryTeamTask(projectId, task.task_id)
    } catch (err: unknown) {
      setTaskDetailErrors((prev) =>
        patchMap(prev, task.task_id, err instanceof Error ? err.message : 'Retry failed')
      )
    } finally {
      setRetryingTasks((prev) => patchSet(prev, task.task_id, false))
    }
  }

  function statusIcon(status: string) {
    const map: Record<string, string> = {
      pending: '○',
      running: '▶',
      completed: '✓',
      failed: '✗',
      cancelled: '⊘',
      waiting_for_help: '?',
    }
    return map[status] || status
  }

  function openWorkerForTask(task: TeamTask) {
    const detail = taskDetailFor(task)
    const workerSessionId = detail.worker_session_id || task.worker_session_id
    if (!workerSessionId) return
    onNavigateToSession?.(workerSessionId, detail.target_project_id || task.target_project_id)
  }

  function formatCost(usd: number | undefined) {
    if (!usd || usd <= 0) return ''
    if (usd < 0.01) return '<$0.01'
    return `$${usd.toFixed(2)}`
  }

  function openSettings() {
    setEditConfig({
      max_concurrent: 2,
      worker_max_turns: 50,
      worker_max_budget_usd: 1.0,
      max_depth: 5,
      file_checkpointing: true,
    })
    setSettingsError('')
    setSettingsOpen(true)
  }

  async function saveSettings() {
    if (settingsSaving) return
    setSettingsSaving(true)
    setSettingsError('')
    try {
      // TODO: call updateTeamConfig API
      setSettingsOpen(false)
    } catch (err: unknown) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="team-runtime-panel">
      {/* Coordinator header */}
      <div className="panel-header">
        <div className="coordinator-info">
          <span className="coordinator-label">Coordinator</span>
          <span className="coordinator-title">{coordinatorTitle || sessionId}</span>
        </div>
        <div className="coordinator-actions">
          <button className="panel-btn" onClick={() => onNavigateToSession?.(sessionId, projectId)} title="Navigate to coordinator session">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          <button className="panel-btn" onClick={openSettings} title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Task count */}
      <div className="panel-section">
        <span className="section-title">Tasks ({tasks.length})</span>
      </div>

      {/* Workflow Visualization */}
      {workflowSteps.length > 0 && (
        <div className="panel-section">
          <h4 className="section-title">Workflow</h4>
          <WorkflowEditor
            mode="delegation"
            steps={workflowSteps as Array<{ role: string; role_label?: string }>}
            tasks={tasks}
          />
        </div>
      )}

      {/* Task list */}
      <div className="panel-section task-list">
        {tasks.map((task) => {
          const detail = taskDetailFor(task)
          const isExpanded = expandedTasks.has(task.task_id)
          return (
            <div key={task.task_id} className="task-card">
              <div className="task-header" onClick={() => toggleTaskDetail(task)}>
                <span className={`task-status task-status--${task.status}`}>
                  {statusIcon(task.status)}
                </span>
                <span className="task-role">{task.target_role}</span>
                <span className="task-cost">{formatCost(task.cost_usd)}</span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`task-chevron${isExpanded ? ' task-chevron--open' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {isExpanded && (
                <div className="task-detail">
                  {taskDetailLoading.has(task.task_id) && <div className="task-loading">Loading...</div>}
                  {taskDetailErrors.get(task.task_id) && (
                    <div className="task-error">{taskDetailErrors.get(task.task_id)}</div>
                  )}

                  {/* Status text */}
                  <div className="detail-field">
                    <span className="detail-label">Status</span>
                    <span className={`task-status task-status--${task.status}`}>{task.status}</span>
                  </div>

                  {/* Prompt */}
                  {task.prompt && (
                    <div className="detail-field">
                      <span className="detail-label">Prompt</span>
                      <span className="detail-value detail-value--code">{task.prompt}</span>
                    </div>
                  )}

                  {/* Result */}
                  {detail.result_summary && (
                    <div className="detail-field">
                      <span className="detail-label">Result</span>
                      <span className="detail-value">{detail.result_summary}</span>
                    </div>
                  )}

                  {/* Error */}
                  {task.error_message && (
                    <div className="detail-field">
                      <span className="detail-label">Error</span>
                      <span className="detail-value detail-value--error">{task.error_message}</span>
                    </div>
                  )}

                  {/* Detail info */}
                  {detail.worker_session_id && (
                    <div className="detail-field">
                      <span className="detail-label">Worker</span>
                      <button className="detail-link" onClick={() => openWorkerForTask(task)}>
                        {detail.worker_session_id.slice(0, 8)}...
                      </button>
                    </div>
                  )}
                  {task.depth > 0 && (
                    <div className="detail-field">
                      <span className="detail-label">Depth</span>
                      <span className="detail-value">{task.depth}</span>
                    </div>
                  )}
                  {task.duration_ms != null && (
                    <div className="detail-field">
                      <span className="detail-label">Duration</span>
                      <span className="detail-value">{Math.round(task.duration_ms / 1000)}s</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="task-actions">
                    {isTaskCancellable(task) && (
                      <button
                        className="task-action-btn task-action-btn--cancel"
                        onClick={() => cancelTaskHandler(task)}
                        disabled={cancellingTasks.has(task.task_id)}
                      >
                        {cancellingTasks.has(task.task_id) ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                    {isTaskRetryable(task) && (
                      <button
                        className="task-action-btn task-action-btn--retry"
                        onClick={() => retryTaskHandler(task)}
                        disabled={retryingTasks.has(task.task_id)}
                      >
                        {retryingTasks.has(task.task_id) ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    {detail.worker_session_id && (
                      <button className="task-action-btn" onClick={() => loadArtifacts(task)}>
                        Artifacts
                      </button>
                    )}
                  </div>

                  {/* Artifacts */}
                  {taskArtifacts.has(task.task_id) && (
                    <div className="task-artifacts">
                      <span className="detail-label">Artifacts</span>
                      <div className="artifact-list">
                        {(taskArtifacts.get(task.task_id) || []).map((artifact, i) => {
                          const a = artifact as { path?: string; file_path?: string; value?: string }
                          const path = a.path || a.file_path || a.value || ''
                          return (
                            <div key={i} className="artifact-item">
                              <span className="artifact-path">{path}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {tasks.length === 0 && (
          <div className="task-empty">No active tasks</div>
        )}
      </div>

      {/* Settings dialog */}
      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Team Settings</h3>
            <div className="settings-field">
              <label>Max Concurrent</label>
              <input
                type="number"
                value={editConfig.max_concurrent}
                onChange={(e) => setEditConfig((p) => ({ ...p, max_concurrent: parseInt(e.target.value) || 2 }))}
              />
            </div>
            <div className="settings-field">
              <label>Worker Max Turns</label>
              <input
                type="number"
                value={editConfig.worker_max_turns}
                onChange={(e) => setEditConfig((p) => ({ ...p, worker_max_turns: parseInt(e.target.value) || 50 }))}
              />
            </div>
            <div className="settings-field">
              <label>Worker Max Budget (USD)</label>
              <input
                type="number"
                step="0.1"
                value={editConfig.worker_max_budget_usd}
                onChange={(e) => setEditConfig((p) => ({ ...p, worker_max_budget_usd: parseFloat(e.target.value) || 1.0 }))}
              />
            </div>
            <div className="settings-field">
              <label>Max Depth</label>
              <input
                type="number"
                value={editConfig.max_depth}
                onChange={(e) => setEditConfig((p) => ({ ...p, max_depth: parseInt(e.target.value) || 5 }))}
              />
            </div>
            {settingsError && <div className="settings-error">{settingsError}</div>}
            <div className="settings-actions">
              <button onClick={() => setSettingsOpen(false)}>Cancel</button>
              <button onClick={saveSettings} disabled={settingsSaving}>
                {settingsSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .team-runtime-panel {
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          background: var(--bg-secondary);
          overflow: hidden;
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border);
        }
        .coordinator-info { display: flex; flex-direction: column; gap: 1px; }
        .coordinator-label { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .coordinator-title { font-size: 12px; color: var(--text-primary); }
        .coordinator-actions { display: flex; gap: 4px; }
        .panel-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px;
          background: transparent; border: 1px solid transparent;
          border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer;
        }
        .panel-btn:hover { background: var(--bg-hover); color: var(--accent); }
        .panel-section { padding: 8px 12px; }
        .section-title { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 0 0 6px; }
        .task-list { display: flex; flex-direction: column; gap: 4px; }
        .task-card {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .task-header {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px; cursor: pointer;
          background: var(--bg-secondary);
          transition: background var(--transition-fast);
        }
        .task-header:hover { background: var(--bg-hover); }
        .task-status { font-size: 12px; font-weight: 600; }
        .task-status--pending { color: var(--text-muted); }
        .task-status--running { color: var(--accent); }
        .task-status--completed { color: var(--green, #98c379); }
        .task-status--failed { color: var(--red, #e06c75); }
        .task-status--cancelled { color: var(--text-muted); text-decoration: line-through; }
        .task-status--waiting_for_help { color: var(--yellow, #e5c07b); }
        .task-role { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .task-cost { font-size: 11px; color: var(--text-muted); }
        .task-chevron {
          transition: transform 0.15s; flex-shrink: 0;
        }
        .task-chevron--open { transform: rotate(180deg); }
        .task-detail {
          padding: 8px 10px;
          border-top: 1px solid var(--border-subtle);
          display: flex; flex-direction: column; gap: 6px;
        }
        .task-loading, .task-error { font-size: 12px; padding: 4px 0; }
        .task-error { color: var(--red, #e06c75); }
        .detail-field { display: flex; gap: 8px; align-items: flex-start; }
        .detail-label {
          font-size: 11px; font-weight: 600; color: var(--text-muted);
          min-width: 60px; flex-shrink: 0;
        }
        .detail-value { font-size: 12px; color: var(--text-primary); }
        .detail-value--code {
          font-family: var(--font-mono);
          font-size: 11px;
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          max-height: 60px;
          overflow: hidden;
        }
        .detail-value--error { color: var(--red, #e06c75); }
        .detail-link {
          font-size: 12px; color: var(--accent);
          background: none; border: none; cursor: pointer; padding: 0;
        }
        .detail-link:hover { text-decoration: underline; }
        .task-actions { display: flex; gap: 4px; margin-top: 4px; }
        .task-action-btn {
          padding: 3px 8px; font-size: 11px;
          border: 1px solid var(--glass-border); border-radius: var(--radius-sm);
          background: var(--bg-hover); color: var(--text-secondary); cursor: pointer;
        }
        .task-action-btn:hover { color: var(--accent); }
        .task-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .task-action-btn--cancel { color: var(--red, #e06c75); }
        .task-action-btn--retry { color: var(--accent); }
        .task-empty { padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
        .task-artifacts { margin-top: 4px; }
        .artifact-list { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
        .artifact-item { padding: 2px 6px; font-size: 11px; color: var(--text-secondary); }
        .artifact-path { font-family: var(--font-mono); }
        .settings-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: var(--overlay-glass);
          display: flex; align-items: center; justify-content: center;
        }
        .settings-dialog {
          background: var(--bg-secondary); border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          padding: 20px; width: 360px; display: flex; flex-direction: column; gap: 12px;
        }
        .settings-dialog h3 { margin: 0; font-size: 15px; color: var(--text-primary); }
        .settings-field { display: flex; flex-direction: column; gap: 4px; }
        .settings-field label { font-size: 12px; color: var(--text-secondary); }
        .settings-field input {
          padding: 6px 10px; font-size: 13px;
          background: var(--bg-input); border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm); color: var(--text-primary);
        }
        .settings-error { color: var(--red, #e06c75); font-size: 12px; }
        .settings-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .settings-actions button {
          padding: 6px 14px; font-size: 12px; border-radius: var(--radius-sm);
          border: 1px solid var(--glass-border); cursor: pointer;
        }
        .settings-actions button:last-child { background: var(--accent); color: #fff; border-color: var(--accent); }
      `}</style>
    </div>
  )
}
