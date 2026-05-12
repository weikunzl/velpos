<script setup>
import { ref, watch } from 'vue'
import { getWorkerContext } from '../api/teamApi'

const props = defineProps({
  sessionId: { type: String, required: true },
  teamTaskId: { type: String, default: '' },
})

const emit = defineEmits(['navigate-back'])

const context = ref(null)

async function loadContext() {
  if (!props.teamTaskId || !props.sessionId) {
    context.value = null
    return
  }
  try {
    context.value = await getWorkerContext(props.sessionId)
  } catch {
    context.value = null
  }
}

watch(() => props.sessionId, loadContext, { immediate: true })

function navigateBack() {
  if (!context.value) return
  emit('navigate-back', {
    sessionId: context.value.coordinator_session_id,
    projectId: context.value.team_project_id,
  })
}
</script>

<template>
  <div v-if="context" class="worker-breadcrumb" @click="navigateBack">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
    <span class="breadcrumb-text">
      Teams: {{ context.team_project_name }}
    </span>
    <span class="breadcrumb-role">{{ context.role }}</span>
  </div>
</template>

<style scoped>
.worker-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  margin: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--accent-dim);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}

.worker-breadcrumb:hover {
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-secondary));
}

.breadcrumb-text {
  font-weight: 500;
}

.breadcrumb-role {
  color: var(--text-muted);
  font-size: 11px;
}
</style>
