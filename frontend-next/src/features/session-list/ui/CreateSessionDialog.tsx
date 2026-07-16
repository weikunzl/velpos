'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AGENT_PROVIDERS, LAST_AGENT_PROVIDER_KEY } from '@/shared/lib/constants'

interface CreateSessionDialogProps {
  visible: boolean
  onConfirm: (data: { mode: string; name: string; dirPath?: string; githubUrl?: string; provider: string }) => void
  onCancel: () => void
}

const PROJECT_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

function getPathBaseName(path: string): string {
  const trimmed = path.trim().replace(/[\\/]+$/, '')
  if (!trimmed) return ''
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

function extractRepoName(url: string): string {
  if (!url) return ''
  const match = url.match(/\/([^/]+?)(?:\.git)?$/)
  return match ? match[1] : ''
}

export function CreateSessionDialog({ visible, onConfirm, onCancel }: CreateSessionDialogProps) {
  const [mode, setMode] = useState<'github' | 'local'>('github')
  const [agentProvider, setAgentProvider] = useState('claude')
  const [projectName, setProjectName] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [creating, setCreating] = useState(false)
  const primaryInputRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)

  // Reset on visibility change
  useEffect(() => {
    if (visible) {
      setMode('github')
      setAgentProvider(localStorage.getItem(LAST_AGENT_PROVIDER_KEY) || 'claude')
      setProjectName('')
      setGithubUrl('')
      setProjectPath('')
      setCreating(false)
      initializedRef.current = false
      setTimeout(() => primaryInputRef.current?.focus(), 0)
    }
  }, [visible])

  const resolvedProjectName = mode === 'local' ? getPathBaseName(projectPath) : projectName.trim()

  const nameError = (() => {
    if (mode !== 'github') return ''
    const name = projectName.trim()
    if (!name) return ''
    if (!PROJECT_NAME_RE.test(name)) return 'Only letters, digits, hyphens, underscores, dots allowed. Must start with a letter or digit.'
    return ''
  })()

  const pathError = (() => {
    if (mode !== 'local') return ''
    return projectPath.trim() ? '' : 'Project path is required.'
  })()

  const canConfirm = !creating && (mode === 'local' ? !!projectPath.trim() : !!projectName.trim() && !nameError)

  const handleGithubUrlInput = useCallback((value: string) => {
    setGithubUrl(value)
    if (!initializedRef.current) {
      const extracted = extractRepoName(value)
      if (extracted && !projectName) {
        setProjectName(extracted)
        initializedRef.current = true
      }
    }
  }, [projectName])

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return
    setCreating(true)
    localStorage.setItem(LAST_AGENT_PROVIDER_KEY, agentProvider)

    if (mode === 'local') {
      onConfirm({
        mode: 'local',
        name: resolvedProjectName,
        dirPath: projectPath.trim(),
        provider: agentProvider,
      })
      return
    }

    onConfirm({
      mode: 'github',
      name: projectName.trim(),
      githubUrl: githubUrl.trim(),
      provider: agentProvider,
    })
  }, [canConfirm, agentProvider, mode, resolvedProjectName, projectPath, projectName, githubUrl, onConfirm])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [handleConfirm, onCancel])

  if (!visible) return null

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }} role="dialog" aria-modal="true" aria-label="Create new project" onKeyDown={handleKeyDown}>
      <div className="dialog">
        <h2 className="dialog-title">New Project</h2>

        <div className="mode-switch">
          <button className={`mode-btn${mode === 'github' ? ' active' : ''}`} onClick={() => setMode('github')}>GitHub</button>
          <button className={`mode-btn${mode === 'local' ? ' active' : ''}`} onClick={() => setMode('local')}>Local Folder</button>
        </div>

        {mode === 'github' ? (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="github-url">GitHub URL</label>
              <input
                id="github-url"
                ref={primaryInputRef}
                value={githubUrl}
                type="text"
                className="form-input"
                placeholder="https://github.com/user/repo.git"
                onChange={(e) => handleGithubUrlInput(e.target.value)}
              />
              <div className="form-hint">Optional. Clone from a GitHub repository.</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="project-name">Project Name <span className="required">*</span></label>
              <input
                id="project-name"
                value={projectName}
                type="text"
                className={`form-input${nameError ? ' form-input-error' : ''}`}
                placeholder="e.g. my-awesome-project"
                onChange={(e) => setProjectName(e.target.value)}
              />
              {nameError && <div className="form-error">{nameError}</div>}
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label" htmlFor="project-path">Project Path <span className="required">*</span></label>
              <div className="path-row">
                <input
                  id="project-path"
                  ref={primaryInputRef}
                  value={projectPath}
                  type="text"
                  className={`form-input${pathError ? ' form-input-error' : ''}`}
                  placeholder="/Users/you/workspace/my-project"
                  onChange={(e) => setProjectPath(e.target.value)}
                />
              </div>
              <div className="form-hint">Use a full local path.</div>
              {pathError && <div className="form-error">{pathError}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <div className={`readonly-value${!resolvedProjectName ? ' empty' : ''}`}>
                {resolvedProjectName || 'Will be derived from the selected folder name'}
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="agent-provider">Agent Provider</label>
          <select
            id="agent-provider"
            value={agentProvider}
            className="form-input form-select"
            onChange={(e) => setAgentProvider(e.target.value)}
          >
            {AGENT_PROVIDERS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <div className="form-hint">Claude Code 为默认路径；Cursor ACP 在服务端运行 `agent acp`。</div>
        </div>

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onCancel} disabled={creating}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
            {creating ? (
              <span className="spinner" />
            ) : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
