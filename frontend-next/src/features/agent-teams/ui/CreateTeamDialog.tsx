'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProjects } from '@/entities/project/api/useProjectQuery'
import { listTeamTemplates, createTeamProject } from '../api/teamApi'
import type { TeamTemplate, TeamStep } from '../api/teamApi'

interface Props {
  visible: boolean
  onClose: () => void
  onProjectCreated?: (projectId: string) => void
}

export function CreateTeamDialog({ visible, onClose, onProjectCreated }: Props) {
  const { data: projectsData } = useProjects()
  const [teamName, setTeamName] = useState('')
  const [dirPath, setDirPath] = useState('')
  const [teamMode, setTeamMode] = useState('delegation')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<TeamTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [customSteps, setCustomSteps] = useState<TeamStep[]>([])

  const projects = projectsData as Array<{ id: string; name: string; dir_path?: string }> | undefined

  useEffect(() => {
    if (!visible) return
    async function load() {
      try {
        const data = await listTeamTemplates('zh-CN', teamMode)
        setTemplates(data)
      } catch {
        setTemplates([])
      }
    }
    load()
  }, [visible, teamMode])

  const getTemplateDisplayName = useCallback((mode: string) => {
    const modeNames: Record<string, string> = {
      delegation: 'Delegation',
      broadcast: 'Broadcast',
      pipeline: 'Pipeline',
      supervisor: 'Supervisor',
    }
    return modeNames[mode] || mode
  }, [])

  const handleSelectTemplate = useCallback((template: TeamTemplate) => {
    setSelectedTemplateId(template.id)
    setTeamName(template.name || '')
    setCustomSteps(template.steps || [])
  }, [])

  const handleCreate = useCallback(async () => {
    if (!teamName.trim()) {
      setError('请输入团队名称')
      return
    }
    if (!dirPath.trim()) {
      setError('请选择或输入项目目录')
      return
    }
    setCreating(true)
    setError('')
    try {
      const config: Record<string, unknown> = {
        mode: teamMode,
      }
      if (customSteps.length > 0) {
        config.steps = customSteps
      }
      const result = await createTeamProject(teamName.trim(), dirPath.trim(), config)
      const projectId = (result as { project_id?: string })?.project_id || ''
      onProjectCreated?.(projectId)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }, [teamName, dirPath, teamMode, customSteps, onProjectCreated])

  const handleClose = useCallback(() => {
    setTeamName('')
    setDirPath('')
    setTeamMode('delegation')
    setSelectedTemplateId('')
    setCustomSteps([])
    setError('')
    onClose()
  }, [onClose])

  if (!visible) return null

  return (
    <div className="ctd-overlay" onClick={handleClose}>
      <div className="ctd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ctd-header">
          <h2>创建团队项目</h2>
          <button className="ctd-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="ctd-body">
          {/* Mode selection */}
          <div className="ctd-section">
            <label className="ctd-label">协作模式</label>
            <div className="ctd-mode-list">
              {['delegation', 'broadcast', 'pipeline'].map((mode) => (
                <button
                  key={mode}
                  className={`ctd-mode-btn${teamMode === mode ? ' ctd-mode-btn--active' : ''}`}
                  onClick={() => { setTeamMode(mode); setSelectedTemplateId('') }}
                >
                  {getTemplateDisplayName(mode)}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="ctd-section">
              <label className="ctd-label">选择模板</label>
              <div className="ctd-template-list">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`ctd-template-item${selectedTemplateId === t.id ? ' ctd-template-item--active' : ''}`}
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <span className="ctd-template-name">{t.name}</span>
                    {t.description && <span className="ctd-template-desc">{t.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team name */}
          <div className="ctd-section">
            <label className="ctd-label">团队名称</label>
            <input
              className="ctd-input"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="输入团队名称"
            />
          </div>

          {/* Directory */}
          <div className="ctd-section">
            <label className="ctd-label">项目路径</label>
            <input
              className="ctd-input"
              type="text"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="输入或选择项目目录路径"
            />
          </div>

          {/* Steps */}
          <div className="ctd-section">
            <label className="ctd-label">自定义角色 ({customSteps.length})</label>
            {customSteps.map((step, i) => (
              <div key={i} className="ctd-step-row">
                <span className="ctd-step-role">{step.role}</span>
                <span className="ctd-step-label">{step.role_label || ''}</span>
              </div>
            ))}
          </div>

          {error && <div className="ctd-error">{error}</div>}
        </div>

        <div className="ctd-footer">
          <button className="ctd-btn ctd-btn--secondary" onClick={handleClose}>取消</button>
          <button className="ctd-btn ctd-btn--primary" onClick={handleCreate} disabled={creating}>
            {creating ? '创建中...' : '创建'}
          </button>
        </div>
      </div>

      <style>{`
        .ctd-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: var(--overlay-glass);
          display: flex; align-items: center; justify-content: center;
        }
        .ctd-dialog {
          background: var(--bg-secondary); border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          width: 480px; max-width: 90vw; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .ctd-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .ctd-header h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
        .ctd-close {
          background: none; border: none; font-size: 20px;
          color: var(--text-muted); cursor: pointer; padding: 4px;
        }
        .ctd-close:hover { color: var(--text-primary); }
        .ctd-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
        .ctd-section { display: flex; flex-direction: column; gap: 6px; }
        .ctd-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
        .ctd-input {
          padding: 8px 12px; font-size: 14px;
          background: var(--bg-input); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); color: var(--text-primary); outline: none;
        }
        .ctd-input:focus { border-color: var(--accent); }
        .ctd-mode-list { display: flex; gap: 8px; }
        .ctd-mode-btn {
          padding: 6px 14px; font-size: 13px;
          background: var(--bg-hover); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer;
        }
        .ctd-mode-btn--active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }
        .ctd-template-list { display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto; }
        .ctd-template-item {
          padding: 8px 12px; border-radius: var(--radius-md); cursor: pointer;
          display: flex; flex-direction: column; gap: 2px;
        }
        .ctd-template-item:hover { background: var(--bg-hover); }
        .ctd-template-item--active { background: var(--accent-dim); }
        .ctd-template-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .ctd-template-desc { font-size: 11px; color: var(--text-muted); }
        .ctd-step-row { display: flex; gap: 8px; padding: 4px 0; font-size: 13px; }
        .ctd-step-role { font-weight: 500; color: var(--accent); min-width: 80px; }
        .ctd-step-label { color: var(--text-secondary); }
        .ctd-error { color: var(--red, #e06c75); font-size: 13px; padding: 8px; background: color-mix(in srgb, var(--red, #e06c75) 10%, transparent); border-radius: var(--radius-md); }
        .ctd-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 12px 20px; border-top: 1px solid var(--border);
        }
        .ctd-btn {
          padding: 8px 16px; font-size: 13px; font-weight: 500;
          border-radius: var(--radius-md); cursor: pointer; border: 1px solid transparent;
        }
        .ctd-btn--primary { background: var(--accent); color: #fff; }
        .ctd-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .ctd-btn--secondary { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--glass-border); }
      `}</style>
    </div>
  )
}
