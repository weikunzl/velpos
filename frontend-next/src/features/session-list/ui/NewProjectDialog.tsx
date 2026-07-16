'use client'

import { useState } from 'react'

interface NewProjectDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (name: string, path: string) => void
}

export function NewProjectDialog({ open, onClose, onSubmit }: NewProjectDialogProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return
    onSubmit(name.trim(), path.trim())
    setName('')
    setPath('')
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel new-project-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dialog-header">
          <h3 className="dialog-title">New Project</h3>
          <button className="dialog-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <label className="field-label">
              Project Name
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                autoFocus
              />
            </label>
            <label className="field-label">
              Directory Path
              <input
                className="field-input"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="~/projects/my-project"
              />
            </label>
          </div>
          <div className="dialog-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={!name.trim() || !path.trim()}>Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}
