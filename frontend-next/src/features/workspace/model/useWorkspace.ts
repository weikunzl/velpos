'use client'

import { useState, useCallback, useRef } from 'react'
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  getWorkspaceDiff,
  listWorkspaceFileHistory,
  readWorkspaceFileAtRef,
} from '../api/workspaceApi'
import type { FileEntry, FileContent, DiffResult, FileCommit } from '../api/workspaceApi'

export interface UseWorkspaceReturn {
  files: FileEntry[]
  selectedFile: FileContent | null
  selectedDiff: DiffResult | null
  fileHistory: FileCommit[]
  historicalFile: FileContent | null
  loading: boolean
  reading: boolean
  historyLoading: boolean
  error: string
  loadFiles: (projectId: string, options?: { changedOnly?: boolean; keyword?: string }) => Promise<void>
  openFile: (projectId: string, path: string) => Promise<void>
  loadFileHistory: (projectId: string, path: string) => Promise<FileCommit[]>
  openHistoricalFile: (projectId: string, path: string, ref: string) => Promise<FileContent | null>
  clearSelection: () => void
}

export function useWorkspace(): UseWorkspaceReturn {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null)
  const [selectedDiff, setSelectedDiff] = useState<DiffResult | null>(null)
  const [fileHistory, setFileHistory] = useState<FileCommit[]>([])
  const [historicalFile, setHistoricalFile] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')

  // Version tracking to prevent stale async results
  const openFileVersion = useRef(0)
  const historyFileVersion = useRef(0)

  const loadFiles = useCallback(async (
    projectId: string,
    options: { changedOnly?: boolean; keyword?: string } = {},
  ) => {
    if (!projectId) return
    setLoading(true)
    setError('')
    try {
      const data = await listWorkspaceFiles(projectId, options)
      setFiles(data.files || [])
    } catch (e: unknown) {
      setFiles([])
      setError(e instanceof Error ? e.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [])

  const openFile = useCallback(async (projectId: string, path: string) => {
    if (!projectId || !path) return
    const version = ++openFileVersion.current
    setReading(true)
    setError('')
    setHistoricalFile(null)
    setFileHistory([])
    try {
      const [file, diff] = await Promise.all([
        readWorkspaceFile(projectId, path),
        getWorkspaceDiff(projectId, path),
      ])
      if (version !== openFileVersion.current) return
      setSelectedFile(file)
      setSelectedDiff(diff)
    } catch (e: unknown) {
      if (version !== openFileVersion.current) return
      setSelectedFile(null)
      setSelectedDiff(null)
      setError(e instanceof Error ? e.message : 'Failed to read file')
    } finally {
      if (version === openFileVersion.current) setReading(false)
    }
  }, [])

  const loadFileHistory = useCallback(async (projectId: string, path: string) => {
    if (!projectId || !path) return []
    setHistoryLoading(true)
    try {
      const data = await listWorkspaceFileHistory(projectId, path, 20)
      setFileHistory(data.commits || [])
      return data.commits || []
    } catch (e: unknown) {
      setFileHistory([])
      setError(e instanceof Error ? e.message : 'Failed to load file history')
      return []
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const openHistoricalFile = useCallback(async (projectId: string, path: string, ref: string) => {
    if (!projectId || !path || !ref) return null
    const version = ++historyFileVersion.current
    setHistoryLoading(true)
    try {
      const file = await readWorkspaceFileAtRef(projectId, path, ref)
      if (version !== historyFileVersion.current) return null
      setHistoricalFile(file)
      return file
    } catch (e: unknown) {
      if (version !== historyFileVersion.current) return null
      setHistoricalFile(null)
      setError(e instanceof Error ? e.message : 'Failed to read historical file')
      return null
    } finally {
      if (version === historyFileVersion.current) setHistoryLoading(false)
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setSelectedDiff(null)
    setHistoricalFile(null)
    setFileHistory([])
  }, [])

  return {
    files,
    selectedFile,
    selectedDiff,
    fileHistory,
    historicalFile,
    loading,
    reading,
    historyLoading,
    error,
    loadFiles,
    openFile,
    loadFileHistory,
    openHistoricalFile,
    clearSelection,
  }
}
