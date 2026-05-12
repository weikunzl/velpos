import { ref, computed } from 'vue'

const projects = ref([])
const currentProjectId = ref(null)
const sidebarMode = ref(localStorage.getItem('vp_sidebar_mode') || 'single')

export function useProject() {
  const currentProject = computed(() =>
    projects.value.find((p) => p.id === currentProjectId.value) || null
  )

  const singleProjects = computed(() =>
    projects.value.filter((p) => p.project_type !== 'team')
  )

  const singleAgentProjects = computed(() =>
    singleProjects.value.filter((p) => Boolean(p.agents?.current))
  )

  const teamProjects = computed(() =>
    projects.value.filter((p) => p.project_type === 'team')
  )

  function setSidebarMode(mode) {
    sidebarMode.value = mode
    localStorage.setItem('vp_sidebar_mode', mode)
  }

  function setProjects(list) {
    projects.value = list
  }

  function setCurrentProjectId(id) {
    currentProjectId.value = id
  }

  function addProject(project) {
    projects.value = [project, ...projects.value]
  }

  function removeProject(projectId) {
    projects.value = projects.value.filter((p) => p.id !== projectId)
  }

  function updateProjectInList(updated) {
    const idx = projects.value.findIndex((p) => p.id === updated.id)
    if (idx !== -1) {
      projects.value = [
        ...projects.value.slice(0, idx),
        { ...projects.value[idx], ...updated },
        ...projects.value.slice(idx + 1),
      ]
    }
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    sidebarMode,
    singleProjects,
    singleAgentProjects,
    teamProjects,
    setSidebarMode,
    setProjects,
    setCurrentProjectId,
    addProject,
    removeProject,
    updateProjectInList,
  }
}
