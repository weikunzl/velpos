import { get, put, del, post, patch } from '@/shared/api/httpClient'

export interface ClaudeMdRevision {
  id: string
  version_no: number
  content: string
  content_hash?: string
  state: string
  base_revision_id?: string
  base_file_hash?: string
  created_at?: string
}

export interface Rule {
  path: string
  content: string
  paths?: string[]
}

export function readClaudeMd(projectDir: string): Promise<{ content: string; file_hash: string; active_revision: ClaudeMdRevision | null; versions: ClaudeMdRevision[] }> {
  return get(`/memory/claude-md?project_dir=${encodeURIComponent(projectDir)}`)
}

export function createClaudeMdDraft(projectDir: string, content: string, baseRevisionId = ''): Promise<{ revision: ClaudeMdRevision }> {
  return post('/memory/claude-md/drafts', { project_dir: projectDir, content, base_revision_id: baseRevisionId })
}

export function updateClaudeMdRevision(revisionId: string, content: string): Promise<{ revision: ClaudeMdRevision }> {
  return patch(`/memory/claude-md/revisions/${encodeURIComponent(revisionId)}`, { content })
}

export function applyClaudeMdRevision(revisionId: string, projectDir: string, expectedBaseRevisionId?: string, expectedFileHash?: string): Promise<{ revision: ClaudeMdRevision; conflict?: boolean }> {
  return post(`/memory/claude-md/revisions/${encodeURIComponent(revisionId)}/apply`, {
    project_dir: projectDir,
    expected_base_revision_id: expectedBaseRevisionId,
    expected_file_hash: expectedFileHash,
  })
}

export function deleteClaudeMdRevision(revisionId: string): Promise<void> {
  return del(`/memory/claude-md/revisions/${encodeURIComponent(revisionId)}`)
}

export function listRules(projectDir: string): Promise<{ rules: Rule[] }> {
  return get(`/memory/rules?project_dir=${encodeURIComponent(projectDir)}`)
}

function encodeRulePath(rulePath: string) {
  return rulePath.split('/').map(encodeURIComponent).join('/')
}

export function writeRule(projectDir: string, rulePath: string, payload: { content: string; paths: string[] }): Promise<{ rule: Rule }> {
  return put(`/memory/rules/${encodeRulePath(rulePath)}`, { project_dir: projectDir, ...payload })
}

export function deleteRule(projectDir: string, rulePath: string): Promise<void> {
  return del(`/memory/rules/${encodeRulePath(rulePath)}?project_dir=${encodeURIComponent(projectDir)}`)
}
