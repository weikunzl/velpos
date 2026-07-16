'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEvolution } from '../model/useEvolution'

interface EvolutionDialogProps {
  visible: boolean
  projectId?: string
  projectDir?: string
  sessionId?: string
  onClose: () => void
  onDraftCreated?: (data: { type: string; revision?: unknown; ruleDraft?: unknown }) => void
}

export function EvolutionDialog({
  visible,
  projectId = '',
  projectDir = '',
  sessionId = '',
  onClose,
  onDraftCreated,
}: EvolutionDialogProps) {
  const { loading, saving, error, lessons, extract, updateLesson, removeLesson, createClaudeDraft } = useEvolution()
  const [target, setTarget] = useState<'claude' | 'rule'>('claude')
  const [rulePath, setRulePath] = useState('')
  const [rulePathsText, setRulePathsText] = useState('')
  const [createdDraft, setCreatedDraft] = useState<{ type: string } | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (visible) {
      setTarget('claude')
      setRulePath('')
      setRulePathsText('')
      setCreatedDraft(null)
      extract({ projectId, projectDir, sessionId })
    }
  }, [visible, projectId, projectDir, sessionId, extract])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [visible, onClose])

  const canCreate = !loading && !saving && lessons.length > 0 && (target !== 'rule' || Boolean(rulePath.trim()))

  const handleCreateDraft = useCallback(async () => {
    if (target === 'claude') {
      const data = await createClaudeDraft(projectDir || '')
      if (data?.revision) {
        setCreatedDraft({ type: 'claude' })
        onDraftCreated?.({ type: 'claude', revision: data.revision })
      }
      return
    }
    // Rule draft creation
    if (rulePath.trim()) {
      setCreatedDraft({ type: 'rule' })
      onDraftCreated?.({ type: 'rule', ruleDraft: { path: rulePath.trim(), content: '', pathsText: rulePathsText } })
    }
  }, [target, createClaudeDraft, projectDir, rulePath, rulePathsText, onDraftCreated])

  if (!visible) return null

  return (
    <div className="evolution-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="evolution-dialog">
        <div className="evolution-header">
          <div>
            <h3>Evolution</h3>
            <p>Extract reusable lessons from this session and turn them into a CLAUDE.md version or rule draft</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="notice">{error}</div>}
        {createdDraft?.type === 'claude' && (
          <div className="success">Version created. Open Rule to review and apply.</div>
        )}
        {createdDraft?.type === 'rule' && (
          <div className="success">Rule draft created. Open Rule to review and save.</div>
        )}

        <div className="evolution-body">
          <div className="target-panel">
            <button className={`target-btn${target === 'claude' ? ' active' : ''}`} onClick={() => setTarget('claude')}>CLAUDE.md</button>
            <button className={`target-btn${target === 'rule' ? ' active' : ''}`} onClick={() => setTarget('rule')}>Rule</button>
          </div>

          {target === 'rule' && (
            <div className="rule-config">
              <input
                className="rule-input"
                placeholder="Rule path, e.g. frontend.md or vue/components.md"
                value={rulePath}
                onChange={(e) => setRulePath(e.target.value)}
              />
              <textarea
                className="rule-input rule-paths"
                placeholder="paths globs, one per line. Empty means global."
                value={rulePathsText}
                onChange={(e) => setRulePathsText(e.target.value)}
              />
            </div>
          )}

          <div className="evolution-actions">
            <button className="secondary-btn" disabled={loading} onClick={() => extract({ projectId, projectDir, sessionId })}>
              {loading ? 'Extracting...' : 'Re-extract'}
            </button>
            <button className="primary-btn" disabled={!canCreate} onClick={handleCreateDraft}>
              {saving ? 'Creating...' : target === 'rule' ? 'Generate Rule Draft' : 'Generate CLAUDE.md Version'}
            </button>
          </div>

          {loading && <div className="empty">Extracting lessons...</div>}
          {!loading && lessons.length === 0 && <div className="empty">No lessons extracted</div>}
          {!loading && lessons.length > 0 && (
            <div className="lesson-list">
              {lessons.map((lesson, index) => (
                <div key={lesson.id || index} className="lesson-item">
                  <label className="lesson-enabled">
                    <input
                      type="checkbox"
                      checked={lesson.enabled !== false}
                      onChange={(e) => updateLesson(index, { enabled: e.target.checked })}
                    />
                  </label>
                  <div className="lesson-main">
                    <input
                      className="lesson-title"
                      value={lesson.title}
                      onChange={(e) => updateLesson(index, { title: e.target.value })}
                    />
                    <textarea
                      className="lesson-content"
                      value={lesson.content}
                      onChange={(e) => updateLesson(index, { content: e.target.value })}
                    />
                    <div className="lesson-meta">
                      {lesson.type} · {lesson.source_session_id || 'current scope'}
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeLesson(index)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
