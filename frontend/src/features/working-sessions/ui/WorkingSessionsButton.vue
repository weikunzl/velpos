<script setup>
import { ref } from 'vue'
import { useWorkingSessions } from '../model/useWorkingSessions'
import { useDialogManager } from '@shared/lib/useDialogManager'
import { useClickOutside } from '@shared/lib/useClickOutside'
import WorkingSessionsPanel from './WorkingSessionsPanel.vue'

const emit = defineEmits(['navigate'])

const { workingCount } = useWorkingSessions()
const showPanel = ref(false)
const wrapperRef = ref(null)

// 使用全局弹窗管理器
const { useDialog } = useDialogManager()
useDialog('working-sessions', showPanel)

function togglePanel() {
  showPanel.value = !showPanel.value
}

function handleNavigate(sessionId) {
  emit('navigate', sessionId)
}

useClickOutside(wrapperRef, () => { showPanel.value = false }, { event: 'click' })
</script>

<template>
  <div class="working-sessions-wrapper" ref="wrapperRef">
    <button
      class="glass-btn glass-btn--icon working-sessions-btn"
      @click="togglePanel"
      aria-label="Working sessions"
      title="Working sessions"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span v-if="workingCount > 0" class="badge">{{ workingCount > 9 ? '9+' : workingCount }}</span>
    </button>
    <WorkingSessionsPanel
      v-if="showPanel"
      @navigate="handleNavigate"
      @close="showPanel = false"
    />
  </div>
</template>

<style scoped>
.working-sessions-wrapper {
  position: relative;
}

.working-sessions-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: var(--yellow, #f59e0b);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
