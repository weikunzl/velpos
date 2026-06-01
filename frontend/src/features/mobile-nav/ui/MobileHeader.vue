<script setup>
import { computed } from 'vue'
import { useProject } from '@entities/project'
import { useSession } from '@entities/session'
import { NotificationBell } from '@features/notification-center'

defineProps({
  /** 是否有活跃通知 */
  hasNotification: { type: Boolean, default: false },
})

const emit = defineEmits(['open-nav', 'open-more', 'notification-navigate'])

const { currentProject } = useProject()
const { session } = useSession()

const projectLabel = computed(() => {
  if (!currentProject.value) return '选择项目'
  return currentProject.value.name || '项目'
})

const sessionLabel = computed(() => {
  if (!session.value) return ''
  return session.value.name || session.value.session_id || ''
})
</script>

<template>
  <header class="mh-header">
    <!-- 左：项目选择入口 -->
    <button class="mh-project-btn" @click="$emit('open-nav')" :title="projectLabel">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="mh-project-name">{{ projectLabel }}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- 中：当前会话名 -->
    <span v-if="sessionLabel" class="mh-session-name" :title="sessionLabel">
      {{ sessionLabel }}
    </span>

    <!-- 右：通知 + 更多 -->
    <div class="mh-actions">
      <NotificationBell @navigate="$emit('notification-navigate', $event)" />
      <button class="mh-more-btn" @click="$emit('open-more')" aria-label="更多操作">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="1" fill="currentColor"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <circle cx="12" cy="19" r="1" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.mh-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  padding-top: var(--safe-top, 0px);
  height: calc(48px + var(--safe-top, 0px));
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-sm);
  flex-shrink: 0;
  z-index: 30;
  position: relative;
}

.mh-project-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--touch-target);
  padding: 0 10px;
  background: var(--bg-hover);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  max-width: 160px;
  flex-shrink: 0;
}

.mh-project-btn:hover,
.mh-project-btn:active {
  background: var(--layer-active);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.mh-project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.mh-session-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.mh-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.mh-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target);
  height: var(--touch-target);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.mh-more-btn:hover,
.mh-more-btn:active {
  background: var(--layer-active);
  color: var(--accent);
  border-color: var(--glass-border);
}
</style>
