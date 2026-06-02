<script setup>
/**
 * MobileNavStack — 移动端导航栈
 *
 * 管理 ProjectPickerSheet ↔ SessionListSheet 两层全屏导航。
 * 外部通过 v-model:visible 控制整个栈的显示/隐藏。
 *
 * 事件：
 *   session-select(session)  — 用户最终选中了某个会话
 *   new-project              — 需要新建项目
 *   new-session(projectId)   — 需要在指定项目下新建会话
 *   delete-session(sessionId) — 删除指定会话
 *   copy-session(sessionId)   — 复制会话并切换到新会话
 */
import { ref, computed } from 'vue'
import { useProject } from '@entities/project'
import ProjectPickerSheet from './ProjectPickerSheet.vue'
import SessionListSheet from './SessionListSheet.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  sessions: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: null },
})

const emit = defineEmits([
  'update:visible',
  'session-select',
  'new-project',
  'new-session',
  'delete-session',
  'copy-session',
])

// 'project' | 'sessions'
const layer = ref('project')
const selectedProject = ref(null)

const { currentProjectId } = useProject()

// 当前项目下的会话
const projectSessions = computed(() => {
  if (!selectedProject.value) return []
  return props.sessions.filter(
    (s) => s.project_id === selectedProject.value.id
  )
})

function close() {
  emit('update:visible', false)
  // 延迟重置层级，避免关闭动画中闪烁
  setTimeout(() => {
    layer.value = 'project'
    selectedProject.value = null
  }, 300)
}

function onProjectSelect(project) {
  selectedProject.value = project
  layer.value = 'sessions'
}

function onBack() {
  layer.value = 'project'
}

function onSessionSelect(session) {
  emit('session-select', session)
  close()
}

function onNewSession() {
  if (!selectedProject.value) return
  emit('new-session', selectedProject.value.id)
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="nav-stack">
      <template v-if="visible">
        <!-- Layer 1: 项目选择 -->
        <ProjectPickerSheet
          v-if="layer === 'project'"
          :current-project-id="currentProjectId"
          @select="onProjectSelect"
          @close="close"
          @new-project="$emit('new-project'); close()"
        />

        <!-- Layer 2: 会话列表 -->
        <SessionListSheet
          v-else-if="layer === 'sessions'"
          :project="selectedProject"
          :sessions="projectSessions"
          :current-session-id="currentSessionId"
          @select="onSessionSelect"
          @back="onBack"
          @close="close"
          @new-session="onNewSession"
          @delete="$emit('delete-session', $event)"
          @copy="$emit('copy-session', $event)"
        />
      </template>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transition 仅用于整体栈的进出（内部 sheet 有自己的动画） */
.nav-stack-enter-active,
.nav-stack-leave-active {
  transition: opacity var(--motion-fast) var(--ease-smooth);
}

.nav-stack-enter-from,
.nav-stack-leave-to {
  opacity: 0;
}
</style>
