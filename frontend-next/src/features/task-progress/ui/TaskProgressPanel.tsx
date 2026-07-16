'use client'

import { useState, useEffect, useRef } from 'react'
import { useTaskProgress } from '../model/useTaskProgress'
import { formatDurationLong } from '@/shared/lib/formatTime'

interface Props {
  messages: unknown[]
  status: string
}

export function TaskProgressPanel({ messages, status }: Props) {
  const { allTasks, taskCounts, planTasks, planTaskCounts, hasPlanTasks } = useTaskProgress(messages as never, status)
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function formatElapsed(startTime: number) {
    const diff = Math.max(0, now - startTime)
    return formatDurationLong(diff)
  }

  function truncate(text: string, max = 80) {
    if (!text || text.length <= max) return text
    return text.slice(0, max) + '...'
  }

  const planProgressCompleted = planTaskCounts.total > 0 ? (planTaskCounts.completed / planTaskCounts.total) * 100 : 0
  const planProgressActive = planTaskCounts.total > 0 ? (planTaskCounts.in_progress / planTaskCounts.total) * 100 : 0

  return (
    <div className="task-panel" onClick={(e) => e.stopPropagation()}>
      {hasPlanTasks && (
        <>
          <div className="panel-header panel-header--plan">
            <span className="panel-title">Current Plan</span>
            <span className="plan-summary">
              <span className="plan-fraction">{planTaskCounts.completed}<span className="plan-sep">/</span>{planTaskCounts.total}</span>
              {planTaskCounts.in_progress > 0 && <span className="count-badge count-running">running</span>}
              {planTaskCounts.completed === planTaskCounts.total && planTaskCounts.in_progress === 0 && <span className="count-badge count-done">done</span>}
            </span>
          </div>
          <div className="plan-progress-bar">
            <div className="plan-progress-done" style={{ width: `${planProgressCompleted}%` }} />
            <div className="plan-progress-active" style={{ width: `${planProgressActive}%` }} />
          </div>
          <div className="panel-body plan-body">
            {planTasks.map((task, index) => (
              <div
                key={task.id}
                className={`plan-item plan-item--${task.status}`}
              >
                <div className="plan-rail">
                  <div className={`plan-connector plan-connector--top${index === 0 ? ' plan-connector--hidden' : ''}`} />
                  <div className="plan-node">
                    {task.status === 'in_progress' ? (
                      <span className="plan-spinner" />
                    ) : task.status === 'completed' ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="plan-dot" />
                    )}
                  </div>
                  <div className={`plan-connector plan-connector--bottom${index === planTasks.length - 1 ? ' plan-connector--hidden' : ''}`} />
                </div>
                <div className="plan-content">
                  <div className={`plan-label${task.status === 'completed' ? ' plan-label--done' : ''}`}>
                    {task.status === 'in_progress' && task.activeForm ? task.activeForm : task.subject}
                  </div>
                  {task.status === 'in_progress' && task.subject && task.activeForm && (
                    <div className="plan-detail">{truncate(task.subject, 120)}</div>
                  )}
                </div>
                <span className="plan-step">{index + 1}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={`panel-header${hasPlanTasks ? ' panel-header--border' : ''}`}>
        <span className="panel-title">Runtime Tasks</span>
        <span className="panel-counts">
          {taskCounts.running > 0 && <span className="count-badge count-running">{taskCounts.running} running</span>}
          {taskCounts.completed > 0 && <span className="count-badge count-done">{taskCounts.completed} done</span>}
          {taskCounts.failed > 0 && <span className="count-badge count-failed">{taskCounts.failed} failed</span>}
        </span>
      </div>
      <div className="panel-body">
        {allTasks.length === 0 ? (
          <div className="task-empty-state">No runtime tasks</div>
        ) : (
          allTasks.map((task) => (
            <div
              key={task.task_id}
              className={`task-item task-${task.status}`}
            >
              <div className="task-icon">
                {task.status === 'running' ? (
                  <span className="task-spinner" />
                ) : task.status === 'completed' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
              <div className="task-content">
                <div className="task-desc">{task.description || task.task_id}</div>
                {task.status === 'running' ? (
                  <div className="task-meta">
                    {task.last_tool_name && <span className="task-tool">{task.last_tool_name}</span>}
                    <span className="task-elapsed">{formatElapsed(task.startTime)}</span>
                  </div>
                ) : task.summary ? (
                  <div className="task-meta">
                    <span className="task-summary">{truncate(task.summary)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
