'use client'

import { useState, useMemo } from 'react'

interface Todo {
  subject: string
  status: string
  description?: string
  activeForm?: string
}

interface Props {
  todos: Todo[]
}

export function TodoProgressBlock({ todos }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const counts = useMemo(() => {
    const c = { pending: 0, in_progress: 0, completed: 0, total: todos.length }
    for (const t of todos) {
      if (t.status === 'in_progress') c.in_progress++
      else if (t.status === 'completed') c.completed++
      else c.pending++
    }
    return c
  }, [todos])

  const pctDone = counts.total > 0 ? (counts.completed / counts.total * 100) : 0
  const pctActive = counts.total > 0 ? (counts.in_progress / counts.total * 100) : 0

  return (
    <div className={`todo-progress ${collapsed ? 'collapsed' : ''}`}>
      <button className="todo-header" onClick={() => setCollapsed(!collapsed)}>
        <svg className="todo-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span className="todo-title">Plan</span>
        <span className="todo-fraction">
          <span className="todo-done-num">{counts.completed}</span>
          <span className="todo-sep">/</span>
          <span className="todo-total-num">{counts.total}</span>
        </span>
        {counts.in_progress > 0 ? (
          <span className="todo-running-badge">{counts.in_progress} running</span>
        ) : counts.completed === counts.total && counts.total > 0 ? (
          <span className="todo-done-badge">done</span>
        ) : null}
        <svg className={`todo-chevron ${!collapsed ? 'open' : ''}`} width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>

      <div className="todo-bar">
        <div className="todo-bar-done" style={{ width: `${pctDone}%` }} />
        <div className="todo-bar-active" style={{ width: `${pctActive}%` }} />
      </div>

      <div className="todo-list-wrap">
        <div className="todo-list">
          {todos.map((task, idx) => (
            <div key={idx} className={`todo-item todo-item--${task.status}`}>
              <div className="todo-rail">
                <div className={`todo-connector todo-connector--top ${idx === 0 ? 'hidden' : ''}`} />
                <div className="todo-node">
                  {task.status === 'in_progress' ? (
                    <span className="todo-spinner" />
                  ) : task.status === 'completed' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="todo-dot" />
                  )}
                </div>
                <div className={`todo-connector todo-connector--bot ${idx === todos.length - 1 ? 'hidden' : ''}`} />
              </div>
              <div className="todo-content">
                <div className={`todo-label ${task.status === 'completed' ? 'todo-label--done' : ''}`}>
                  {task.status === 'in_progress' && task.activeForm ? task.activeForm : task.subject}
                </div>
                {task.status === 'in_progress' && task.activeForm && task.subject && (
                  <div className="todo-detail">{task.subject}</div>
                )}
              </div>
              <span className="todo-step">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
