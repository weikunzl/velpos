import { API_BASE } from '@/shared/lib/constants'
import { get, post } from '@/shared/api/httpClient'

export interface FileEntry {
  path: string
  is_changed?: boolean
  git_status?: string
  size?: number
  truncated?: boolean
  is_binary?: boolean
}

export interface FileContent {
  content: string
  path: string
  size: number
  truncated: boolean
  is_binary: boolean
}

export interface DiffResult {
  patch: string
}

export interface FileCommit {
  ref: string
  short_hash: string
  author_name: string
  message: string
}

export interface FileHistoryResult {
  commits: FileCommit[]
}

export interface WorkspaceFilesResult {
  files: FileEntry[]
}

export function listWorkspaceFiles(
  projectId: string,
  options: { changedOnly?: boolean; keyword?: string } = {},
): Promise<WorkspaceFilesResult> {
  const params = new URLSearchParams()
  params.set('changed_only', options.changedOnly ? 'true' : 'false')
  if (options.keyword) params.set('keyword', options.keyword)
  return get<WorkspaceFilesResult>(`/projects/${projectId}/workspace/files?${params.toString()}`)
}

export function readWorkspaceFile(projectId: string, path: string): Promise<FileContent> {
  return get<FileContent>(`/projects/${projectId}/workspace/file?path=${encodeURIComponent(path)}`)
}

export function getWorkspaceDiff(projectId: string, path: string): Promise<DiffResult> {
  return get<DiffResult>(`/projects/${projectId}/workspace/diff?path=${encodeURIComponent(path)}`)
}

export function listWorkspaceFileHistory(projectId: string, path: string, limit = 20): Promise<FileHistoryResult> {
  return get<FileHistoryResult>(
    `/projects/${projectId}/workspace/file-history?path=${encodeURIComponent(path)}&limit=${limit}`,
  )
}

export function readWorkspaceFileAtRef(projectId: string, path: string, ref: string): Promise<FileContent> {
  return get<FileContent>(
    `/projects/${projectId}/workspace/file-at-ref?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`,
  )
}

export async function downloadWorkspaceSelection(projectId: string, paths: string[]): Promise<void> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/workspace/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
      signal: controller.signal,
    })
    if (!res.ok) {
      let message = `HTTP error: ${res.status} ${res.statusText}`
      try {
        const body = await res.json()
        message = body?.message || message
      } catch {
        // ignore parse error
      }
      throw new Error(message)
    }
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'workspace-export.zip'
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } finally {
    clearTimeout(timeout)
  }
}
