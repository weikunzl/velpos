import { useState, useCallback, useRef } from 'react'
import { extractEvolutionLessons, createEvolutionClaudeMdDraft } from '../api/evolutionApi'
import type { EvolutionLesson } from '../api/evolutionApi'

export function useEvolution() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lessons, setLessons] = useState<EvolutionLesson[]>([])
  const extractSeqRef = useRef(0)

  const extract = useCallback(async (params: { projectId?: string; projectDir?: string; sessionId?: string }) => {
    setLoading(true)
    setError('')
    const seq = ++extractSeqRef.current
    try {
      const data = await extractEvolutionLessons({
        project_id: params.projectId,
        project_dir: params.projectDir,
        session_id: params.sessionId,
        limit: 80,
      })
      if (seq !== extractSeqRef.current) return
      setLessons((data.lessons || []).map((item: EvolutionLesson) => ({ ...item, enabled: true })))
    } catch (e: unknown) {
      if (seq !== extractSeqRef.current) return
      setError((e as Error).message || 'Failed to extract lessons')
    } finally {
      if (seq === extractSeqRef.current) setLoading(false)
    }
  }, [])

  const updateLesson = useCallback((index: number, patch: Partial<EvolutionLesson>) => {
    setLessons(prev => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }, [])

  const removeLesson = useCallback((index: number) => {
    setLessons(prev => prev.filter((_, i) => i !== index))
  }, [])

  const selectedLessons = useCallback(() => {
    return lessons
      .filter(item => item.enabled !== false && String(item.content || '').trim())
      .map(({ enabled, ...item }) => item)
  }, [lessons])

  const createClaudeDraft = useCallback(async (projectDir: string) => {
    if (!projectDir) return null
    setSaving(true)
    setError('')
    try {
      const lessonsList = selectedLessons()
      const data = await createEvolutionClaudeMdDraft('current', projectDir, lessonsList)
      return data
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to create CLAUDE.md draft')
      return null
    } finally {
      setSaving(false)
    }
  }, [selectedLessons])

  return { loading, saving, error, lessons, extract, updateLesson, removeLesson, createClaudeDraft }
}
