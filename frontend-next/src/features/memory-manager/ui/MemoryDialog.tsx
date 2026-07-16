'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useMemoryManager } from '../model/useMemoryManager'
import { splitLines, buildSideBySideDiff } from '@/shared/lib/diff'
import { configuredMarked } from '@/features/message-display/lib/markdownConfig'

interface MemoryDialogProps {
  visible: boolean
  projectDir?: string
  projectId?: string
  onClose: () => void
  onEvolve?: () => void
}

export function MemoryDialog({ visible, projectDir = '', projectId = '', onClose, onEvolve }: MemoryDialogProps) {
  const {
    content, versions, selectedRevision, loading, editing, editContent,
    saving, applying, error, conflictMessage,
    rules, selectedRule, ruleEditing, ruleDraft,
    setEditing, setEditContent, setSelectedRevision,
    setSelectedRule, setRuleEditing, setRuleDraft,
    loadClaudeMd, loadRules,
    save, applySelected, deleteSelectedRevision,
    saveRule, removeRule,
  } = useMemoryManager()

  const [activeTab, setActiveTab] = useState<'claude' | 'rules'>('claude')
  const [compareRevisionId, setCompareRevisionId] = useState('')
  const [ruleHistory, setRuleHistory] = useState<Array<{ hash: string; short_hash?: string; message?: string }>>([])
  const [ruleHistoryRef, setRuleHistoryRef] = useState('')
  const [ruleHistoryContents, setRuleHistoryContents] = useState<Record<string, string>>({})
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // Load data when dialog opens
  useEffect(() => {
    if (visible && projectDir) {
      loadClaudeMd(projectDir)
      loadRules(projectDir)
    } else if (!visible) {
      setCompareRevisionId('')
      setRuleHistory([])
      setRuleHistoryRef('')
      setRuleHistoryContents({})
    }
  }, [visible, projectDir, loadClaudeMd, loadRules])

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

  // Reset compare when selected revision changes
  useEffect(() => {
    setCompareRevisionId('')
  }, [selectedRevision])

  // Markdown render helpers
  const renderedContent = useMemo(() => {
    const src = selectedRevision?.content || versions[0]?.content || content
    if (!src) return ''
    return configuredMarked(src)
  }, [selectedRevision, content, versions])

  const renderedPreview = useMemo(() => {
    if (!editContent) return ''
    return configuredMarked(editContent)
  }, [editContent])

  // Diff computation
  const compareOptions = useMemo(() => {
    return versions.filter((v) => v.id !== selectedRevision?.id)
  }, [versions, selectedRevision])

  const compareRevision = useMemo(() => {
    if (!compareRevisionId) return null
    return compareOptions.find((v) => v.id === compareRevisionId) || null
  }, [compareOptions, compareRevisionId])

  const compareRows = useMemo(() => {
    if (!compareRevision || !selectedRevision) return []
    return buildSideBySideDiff(
      splitLines(compareRevision.content),
      splitLines(selectedRevision.content),
    )
  }, [compareRevision, selectedRevision])

  const selectedState = selectedRevision?.state || ''

  // ── Handlers ──

  const handleSave = useCallback(async () => {
    await save(projectDir)
  }, [save, projectDir])

  const handleDeleteRevision = useCallback(async () => {
    await deleteSelectedRevision()
  }, [deleteSelectedRevision])

  const handleApply = useCallback(async () => {
    await applySelected(projectDir)
  }, [applySelected, projectDir])

  const handleSelectRevision = useCallback((revision: typeof versions[0]) => {
    setSelectedRevision(revision)
  }, [setSelectedRevision])

  const handleStartEdit = useCallback(() => {
    const src = selectedRevision?.content || content
    setEditContent(src)
    setEditing(true)
    setTimeout(() => editorRef.current?.focus(), 0)
  }, [selectedRevision, content, setEditContent, setEditing])

  const handleCancelEdit = useCallback(() => {
    setEditing(false)
    setEditContent('')
  }, [setEditing, setEditContent])

  const handleRuleSave = useCallback(async () => {
    await saveRule(projectDir)
    setRuleHistory([])
    setRuleHistoryRef('')
  }, [saveRule, projectDir])

  const handleRemoveRule = useCallback(async (rulePath: string) => {
    await removeRule(projectDir, rulePath)
    setRuleHistory([])
    setRuleHistoryRef('')
  }, [removeRule, projectDir])

  const handleNewRule = useCallback(() => {
    setRuleHistoryRef('')
    setSelectedRule(null)
    setRuleDraft({ path: '', content: '', pathsText: '' })
    setRuleEditing(true)
  }, [setSelectedRule, setRuleDraft, setRuleEditing])

  const handleStartRuleEdit = useCallback((rule: typeof rules[0]) => {
    setRuleDraft({ path: rule.path, content: rule.content, pathsText: (rule.paths || []).join('\n') })
    setRuleEditing(true)
  }, [setRuleDraft, setRuleEditing])

  if (!visible) return null

  return (
    <div className="memory-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`memory-dialog${editing || ruleEditing ? ' memory-dialog--editing' : ''}`}>
        {/* Header */}
        <div className="memory-header">
          <div>
            <h3 className="memory-title">Project Rules</h3>
            <div className="memory-subtitle">CLAUDE.md and project rules</div>
          </div>
          <div className="header-actions">
            {!editing && !ruleEditing && (
              <button className="action-btn" disabled={!projectDir} title="Extract reusable lessons" onClick={onEvolve}>
                Evolve
              </button>
            )}
            {activeTab === 'claude' ? (
              !editing ? (
                <>
                  <button className="action-btn edit" onClick={handleStartEdit} disabled={loading}>
                    {selectedRevision ? 'Edit' : 'New Version'}
                  </button>
                  <button className="action-btn save" onClick={handleApply} disabled={!['draft', 'approved'].includes(selectedState) || applying}>
                    {applying ? 'Applying...' : 'Apply'}
                  </button>
                  <button className="action-btn danger" onClick={handleDeleteRevision} disabled={!selectedRevision || saving}>
                    Delete Version
                  </button>
                </>
              ) : (
                <>
                  <button className="action-btn save" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Version'}
                  </button>
                  <button className="action-btn cancel" onClick={handleCancelEdit}>Cancel</button>
                </>
              )
            ) : !ruleEditing ? (
              <>
                <button className="action-btn edit" onClick={handleNewRule}>New Rule</button>
                <button className="action-btn" onClick={() => handleStartRuleEdit(selectedRule!)} disabled={!selectedRule}>
                  Edit
                </button>
                <button className="action-btn danger" onClick={() => handleRemoveRule(selectedRule?.path || '')} disabled={!selectedRule || saving}>
                  Delete
                </button>
              </>
            ) : (
              <>
                <button className="action-btn save" onClick={handleRuleSave} disabled={saving || !ruleDraft.path}>
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
                <button className="action-btn cancel" onClick={() => { setRuleEditing(false); setRuleDraft({ path: '', content: '', pathsText: '' }) }}>
                  Cancel
                </button>
              </>
            )}
            <button className="close-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="memory-tabs">
          <button className={activeTab === 'claude' ? 'active' : ''} onClick={() => setActiveTab('claude')}>CLAUDE.md</button>
          <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Rules</button>
        </div>

        {/* Notice */}
        {(error || conflictMessage) && (
          <div className={`notice${conflictMessage ? ' conflict' : ''}`}>{conflictMessage || error}</div>
        )}

        {/* Body */}
        <div className="memory-body">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading...</span>
            </div>
          )}

          {!loading && activeTab === 'claude' && (
            <>
              {/* Version sidebar */}
              <aside className="version-sidebar">
                <div className="version-header">Versions</div>
                {versions.map((revision) => (
                  <button
                    key={revision.id}
                    className={`version-item${selectedRevision?.id === revision.id ? ' active' : ''}`}
                    onClick={() => handleSelectRevision(revision)}
                  >
                    <span className="version-main">v{revision.version_no}</span>
                    <span className={`state-badge ${revision.state}`}>{revision.state}</span>
                  </button>
                ))}
                {versions.length === 0 && <div className="empty-version">No versions</div>}
              </aside>

              {/* Content panel */}
              <section className="content-panel">
                {selectedRevision && (
                  <div className="revision-meta">
                    <span>v{selectedRevision.version_no}</span>
                    <span className={`state-badge ${selectedRevision.state}`}>{selectedRevision.state}</span>
                    <span className="hash">{selectedRevision.content_hash?.slice(0, 8)}</span>
                  </div>
                )}

                {/* Compare toolbar */}
                {selectedRevision && !editing && (
                  <div className="compare-toolbar">
                    <label className="compare-select-wrap">
                      <span>Compare</span>
                      <select
                        className="compare-select"
                        value={compareRevisionId}
                        onChange={(e) => setCompareRevisionId(e.target.value)}
                      >
                        <option value="">Current only</option>
                        {compareOptions.map((v) => (
                          <option key={v.id} value={v.id}>v{v.version_no} · {v.state}</option>
                        ))}
                      </select>
                    </label>
                    {compareRevision && (
                      <>
                        <span className="compare-summary">vs v{compareRevision.version_no}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Editor split pane */}
                {editing ? (
                  <div className="split-pane">
                    <div className="split-editor">
                      <div className="split-label">Editor</div>
                      <textarea
                        ref={editorRef}
                        className="content-editor"
                        spellCheck={false}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                    </div>
                    <div className="split-divider" />
                    <div className="split-preview">
                      <div className="split-label">Preview</div>
                      <div className="content-rendered markdown-body" dangerouslySetInnerHTML={{ __html: renderedPreview }} />
                    </div>
                  </div>
                ) : compareRevision ? (
                  /* Diff view */
                  <div className="diff-view">
                    {compareRows.map((row, index) => (
                      <div
                        key={row.id}
                        className={`diff-row diff-row--${row.type}`}
                        data-diff-row={`claude-${index}`}
                      >
                        <span className="diff-ln">{row.beforeLineNo ?? ''}</span>
                        <span className="diff-content">{row.beforeLine}</span>
                        <span className="diff-ln">{row.afterLineNo ?? ''}</span>
                        <span className="diff-content">{row.afterLine}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Rendered content */
                  <div
                    className="content-rendered markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                  />
                )}
              </section>
            </>
          )}

          {!loading && activeTab === 'rules' && (
            <>
              {/* Rule sidebar */}
              <aside className="version-sidebar">
                <div className="version-header">Rules</div>
                {rules.map((rule) => (
                  <button
                    key={rule.path}
                    className={`version-item${selectedRule?.path === rule.path ? ' active' : ''}`}
                    onClick={() => { setSelectedRule(rule); setRuleEditing(false) }}
                  >
                    <span className="version-main">{rule.path}</span>
                  </button>
                ))}
                {rules.length === 0 && <div className="empty-version">No rules</div>}
              </aside>

              {/* Rule content panel */}
              <section className="content-panel">
                {ruleEditing ? (
                  <div className="rule-edit-form">
                    <label>
                      <span className="rule-form-label">Path</span>
                      <input
                        className="rule-form-input"
                        value={ruleDraft.path}
                        onChange={(e) => setRuleDraft({ ...ruleDraft, path: e.target.value })}
                        placeholder="e.g. frontend.md"
                      />
                    </label>
                    <label>
                      <span className="rule-form-label">Paths glob (one per line)</span>
                      <textarea
                        className="rule-form-textarea"
                        value={ruleDraft.pathsText}
                        onChange={(e) => setRuleDraft({ ...ruleDraft, pathsText: e.target.value })}
                        placeholder="paths globs, one per line. Empty means global."
                      />
                    </label>
                    <label>
                      <span className="rule-form-label">Content</span>
                      <textarea
                        className="rule-form-textarea rule-form-content"
                        value={ruleDraft.content}
                        onChange={(e) => setRuleDraft({ ...ruleDraft, content: e.target.value })}
                        placeholder="Rule content (markdown)"
                      />
                    </label>
                  </div>
                ) : selectedRule ? (
                  <div
                    className="content-rendered markdown-body"
                    dangerouslySetInnerHTML={{
                      __html: configuredMarked(selectedRule.content || ''),
                    }}
                  />
                ) : (
                  <div className="empty-state">Select a rule to view</div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
