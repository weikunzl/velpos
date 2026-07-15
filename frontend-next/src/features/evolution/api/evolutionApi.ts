import { post } from '@/shared/api/httpClient'

export interface EvolutionLesson {
  id: string
  title?: string
  content: string
  enabled?: boolean
}

export interface EvolutionProposal {
  id: string
  title?: string
}

export interface ExtractPayload {
  project_id?: string
  project_dir?: string
  session_id?: string
  limit?: number
}

export function extractEvolutionLessons(payload: ExtractPayload): Promise<{ proposal: EvolutionProposal | null; lessons: EvolutionLesson[] }> {
  return post('/evolution/extract', payload)
}

export function createEvolutionClaudeMdDraft(proposalId: string, projectDir: string, lessons: EvolutionLesson[]): Promise<{ proposal: EvolutionProposal; revision?: unknown }> {
  return post(`/evolution/proposals/${encodeURIComponent(proposalId)}/claude-md-draft`, {
    project_dir: projectDir,
    lessons,
  })
}
