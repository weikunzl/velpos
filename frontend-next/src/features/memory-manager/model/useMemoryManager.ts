import { useState, useCallback, useRef } from 'react'
import {
  readClaudeMd, createClaudeMdDraft, updateClaudeMdRevision,
  deleteClaudeMdRevision, applyClaudeMdRevision,
  listRules, writeRule, deleteRule,
} from '../api/memoryApi'
import type { ClaudeMdRevision, Rule } from '../api/memoryApi'

export function useMemoryManager() {
  const [content, setContent] = useState('')
  const [fileHash, setFileHash] = useState('')
  const [activeRevision, setActiveRevision] = useState<ClaudeMdRevision | null>(null)
  const [versions, setVersions] = useState<ClaudeMdRevision[]>([])
  const [selectedRevision, setSelectedRevision] = useState<ClaudeMdRevision | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [conflictMessage, setConflictMessage] = useState('')
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [ruleEditing, setRuleEditing] = useState(false)
  const [ruleDraft, setRuleDraft] = useState<{ path: string; content: string; pathsText: string }>({ path: '', content: '', pathsText: '' })
  const claudeMdSeqRef = useRef(0)
  const rulesSeqRef = useRef(0)

  const loadClaudeMd = useCallback(async (projectDir: string) => {
    if (!projectDir) return
    setLoading(true)
    setError('')
    setConflictMessage('')
    const seq = ++claudeMdSeqRef.current
    try {
      const data = await readClaudeMd(projectDir)
      if (seq !== claudeMdSeqRef.current) return
      setContent(data.content || '')
      setFileHash(data.file_hash || '')
      setActiveRevision(data.active_revision || null)
      setVersions(data.versions || [])
    } catch (e: unknown) {
      if (seq !== claudeMdSeqRef.current) return
      setContent('')
      setError((e as Error).message || 'Failed to load CLAUDE.md')
    } finally {
      if (seq === claudeMdSeqRef.current) setLoading(false)
    }
  }, [])

  const loadRules = useCallback(async (projectDir: string) => {
    if (!projectDir) return
    setLoading(true)
    setError('')
    const seq = ++rulesSeqRef.current
    try {
      const data = await listRules(projectDir)
      if (seq !== rulesSeqRef.current) return
      setRules(data.rules || [])
    } catch (e: unknown) {
      if (seq !== rulesSeqRef.current) return
      setRules([])
      setSelectedRule(null)
      setError((e as Error).message || 'Failed to load rules')
    } finally {
      if (seq === rulesSeqRef.current) setLoading(false)
    }
  }, [])

  const save = useCallback(async (projectDir: string) => {
    setSaving(true)
    setError('')
    try {
      let revision: ClaudeMdRevision
      if (selectedRevision && ['draft', 'conflicted'].includes(selectedRevision.state)) {
        const data = await updateClaudeMdRevision(selectedRevision.id, editContent)
        revision = data.revision
      } else {
        const baseRevisionId = selectedRevision?.id || activeRevision?.id || ''
        const data = await createClaudeMdDraft(projectDir, editContent, baseRevisionId)
        revision = data.revision
      }
      setVersions(prev => {
        const idx = prev.findIndex(v => v.id === revision.id)
        const next = idx >= 0
          ? [...prev.slice(0, idx), revision, ...prev.slice(idx + 1)]
          : [revision, ...prev]
        return next.sort((a, b) => (b.version_no || 0) - (a.version_no || 0))
      })
      setSelectedRevision(revision)
      setEditing(false)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to save version')
    } finally {
      setSaving(false)
    }
  }, [selectedRevision, activeRevision, editContent])

  const applySelected = useCallback(async (projectDir: string) => {
    if (!selectedRevision) return
    setApplying(true)
    setError('')
    setConflictMessage('')
    try {
      const data = await applyClaudeMdRevision(
        selectedRevision.id, projectDir,
        selectedRevision.base_revision_id,
        selectedRevision.base_file_hash || fileHash,
      )
      const revision = data.revision
      setVersions(prev => {
        const idx = prev.findIndex(v => v.id === revision.id)
        const next = idx >= 0 ? [...prev.slice(0, idx), revision, ...prev.slice(idx + 1)] : [revision, ...prev]
        return next.sort((a, b) => (b.version_no || 0) - (a.version_no || 0))
      })
      setSelectedRevision(revision)
      if (data.conflict) {
        setConflictMessage('CLAUDE.md changed on disk. Please reload and create a new version.')
      } else {
        await loadClaudeMd(projectDir)
      }
    } catch (e: unknown) {
      setConflictMessage((e as Error).message || 'Failed to apply revision')
      await loadClaudeMd(projectDir)
    } finally {
      setApplying(false)
    }
  }, [selectedRevision, fileHash, loadClaudeMd])

  const deleteSelectedRevision = useCallback(async () => {
    if (!selectedRevision) return
    setSaving(true)
    setError('')
    try {
      await deleteClaudeMdRevision(selectedRevision.id)
      setVersions(prev => prev.filter(v => v.id !== selectedRevision.id))
      setSelectedRevision(activeRevision || null)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to delete revision')
    } finally {
      setSaving(false)
    }
  }, [selectedRevision, activeRevision])

  const saveRule = useCallback(async (projectDir: string) => {
    setSaving(true)
    setError('')
    try {
      const paths = ruleDraft.pathsText.split('\n').map(s => s.trim()).filter(Boolean)
      const data = await writeRule(projectDir, ruleDraft.path, { content: ruleDraft.content, paths })
      setRules(prev => {
        const idx = prev.findIndex(r => r.path === ruleDraft.path)
        const next = idx >= 0
          ? [...prev.slice(0, idx), data.rule, ...prev.slice(idx + 1)]
          : [data.rule, ...prev]
        return next.sort((a, b) => a.path.localeCompare(b.path))
      })
      setSelectedRule(data.rule)
      setRuleEditing(false)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }, [ruleDraft])

  const removeRule = useCallback(async (projectDir: string, rulePath: string) => {
    if (!rulePath) return
    setSaving(true)
    setError('')
    try {
      await deleteRule(projectDir, rulePath)
      setRules(prev => prev.filter(r => r.path !== rulePath))
      setSelectedRule(null)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to delete rule')
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    content, versions, selectedRevision, loading, editing, editContent,
    saving, applying, error, conflictMessage,
    rules, selectedRule, ruleEditing, ruleDraft,
    setEditing, setEditContent, setSelectedRevision,
    setSelectedRule, setRuleEditing, setRuleDraft,
    loadClaudeMd, loadRules,
    save, applySelected, deleteSelectedRevision,
    saveRule, removeRule,
  }
}
