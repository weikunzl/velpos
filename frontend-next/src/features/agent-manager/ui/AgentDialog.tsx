'use client'

import { useEffect } from 'react'
import { useAgentManager } from '../model/useAgentManager'

interface Props {
  visible: boolean
  projectId: string
  onClose: () => void
}

export function AgentDialog({ visible, projectId, onClose }: Props) {
  const { categories, loading, error, fetchAgents, handleLoad } = useAgentManager()

  useEffect(() => {
    if (visible) fetchAgents()
  }, [visible, fetchAgents])

  if (!visible) return null

  return (
    <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-dialog" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
        <div className="settings-header">
          <h3>Agent Manager</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        <div className="settings-body">
          {loading ? (
            <div className="empty">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="empty">No agents available</div>
          ) : (
            categories.map(cat => (
              <div key={cat.name} style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{cat.name}</h4>
                {cat.agents.map(agent => (
                  <div key={agent.id} className="settings-item">
                    <div className="settings-item-info">
                      <strong>{agent.name}</strong>
                      {agent.description && <p>{agent.description}</p>}
                    </div>
                    <div className="settings-item-action">
                      <button
                        className="primary-btn"
                        onClick={() => projectId && handleLoad(projectId, agent.id)}
                        disabled={!projectId}
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
