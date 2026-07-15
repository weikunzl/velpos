'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProjectsApi,
  getProjectApi,
  createProjectApi,
  deleteProjectApi,
  reorderProjectsApi,
  updateProjectApi,
  getGitBranchesApi,
  checkoutGitBranchApi,
  ensureProjectsByDirsApi,
} from './projectApi'
import type { Project } from '@/shared/types/api'

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  gitBranches: (id: string) => [...projectKeys.all, 'gitBranches', id] as const,
}

/** Fetch all projects */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => listProjectsApi(),
    refetchOnWindowFocus: false,
  })
}

/** Fetch single project detail */
export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: () => getProjectApi(projectId!),
    enabled: !!projectId,
  })
}

/** Create a new project */
export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; path: string; projectType?: string }) =>
      createProjectApi(params.name, params.path, params.projectType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Delete a project */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => deleteProjectApi(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Reorder projects */
export function useReorderProjects() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectIds: string[]) => reorderProjectsApi(projectIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Update project */
export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Project> }) =>
      updateProjectApi(projectId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/** Get git branches for a project */
export function useGitBranches(projectId: string | null) {
  return useQuery({
    queryKey: projectKeys.gitBranches(projectId ?? ''),
    queryFn: () => getGitBranchesApi(projectId!),
    enabled: !!projectId,
  })
}

/** Checkout git branch */
export function useCheckoutGitBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, branch }: { projectId: string; branch: string }) =>
      checkoutGitBranchApi(projectId, branch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.gitBranches(variables.projectId),
      })
    },
  })
}

/** Ensure projects by directories */
export function useEnsureProjectsByDirs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dirs: string[]) => ensureProjectsByDirsApi(dirs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}
