'use client'

import { useEffect, useState } from 'react'
import { usePluginManager } from '../model/usePluginManager'

interface Props {
  visible: boolean
  projectDir: string
  onClose: () => void
}

export function PluginManagerDialog({ visible, projectDir, onClose }: Props) {
  const { plugins, loading, operating, error, loadAllPlugins, handleInstall, handleUninstall } = usePluginManager()
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (visible && projectDir) loadAllPlugins(projectDir)
  }, [visible, projectDir, loadAllPlugins])

  if (!visible) return null

  const filtered = filter
    ? plugins.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.key.toLowerCase().includes(filter.toLowerCase()))
    : plugins

  return (
    <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-dialog" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
        <div className="settings-header">
          <h3>Plugin Manager</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        <div className="settings-body">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search plugins..."
            className="settings-search"
          />

          {loading ? (
            <div className="empty">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">{filter ? 'No matching plugins' : 'No plugins available'}</div>
          ) : (
            <div className="settings-list">
              {filtered.map(plugin => (
                <div key={plugin.key} className="settings-item">
                  <div className="settings-item-info">
                    <strong>{plugin.name}</strong>
                    {plugin.description && <p>{plugin.description}</p>}
                    {plugin.version && <span className="settings-item-meta">v{plugin.version}</span>}
                  </div>
                  <div className="settings-item-action">
                    {plugin.installed ? (
                      <button
                        className="danger-btn"
                        onClick={() => handleUninstall(plugin.key, projectDir)}
                        disabled={operating === plugin.key}
                      >
                        {operating === plugin.key ? 'Uninstalling...' : 'Uninstall'}
                      </button>
                    ) : (
                      <button
                        className="primary-btn"
                        onClick={() => handleInstall(plugin.key, projectDir)}
                        disabled={operating === plugin.key}
                      >
                        {operating === plugin.key ? 'Installing...' : 'Install'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
