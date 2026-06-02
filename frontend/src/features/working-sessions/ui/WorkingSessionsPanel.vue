<script setup>
import { formatDurationLong } from '@features/message-display'
import { useWorkingSessions } from '../model/useWorkingSessions'

defineProps({
  variant: {
    type: String,
    default: 'dropdown',
    validator: (value) => ['dropdown', 'sheet'].includes(value),
  },
})

const emit = defineEmits(['navigate', 'close'])

const { workingList } = useWorkingSessions()

function handleClick(item) {
  emit('navigate', item.sessionId)
  emit('close')
}

function formatElapsed(startTime) {
  return formatDurationLong(Date.now() - startTime)
}
</script>

<template>
  <div class="working-panel" :class="`working-panel--${variant}`" @click.stop>
    <div class="panel-header">
      <span class="panel-title">{{ variant === 'sheet' ? '进行中的会话' : 'Working Sessions' }}</span>
      <span v-if="workingList.length" class="panel-count">{{ workingList.length }}</span>
      <button
        v-if="variant === 'sheet'"
        class="panel-close"
        type="button"
        aria-label="关闭"
        @click="$emit('close')"
      >×</button>
    </div>
    <div class="panel-body">
      <div v-if="workingList.length === 0" class="empty-state">
        {{ variant === 'sheet' ? '暂无进行中的会话' : 'No active sessions' }}
      </div>
      <div
        v-for="item in workingList"
        :key="item.sessionId"
        class="working-item"
        @click="handleClick(item)"
      >
        <div class="working-dot"></div>
        <div class="working-content">
          <div class="working-name">{{ item.sessionName || item.sessionId.slice(0, 8) }}</div>
          <div class="working-meta">
            <span v-if="item.projectName" class="project-tag">{{ item.projectName }}</span>
            <span class="elapsed">{{ formatElapsed(item.startTime) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.working-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 300px;
  max-height: 360px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--layer-glass);
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--yellow, #f59e0b);
  background: var(--yellow-dim, rgba(245, 158, 11, 0.1));
  padding: 0 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.working-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.working-item:hover {
  background: var(--layer-active);
}

.working-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yellow, #f59e0b);
  flex-shrink: 0;
  margin-top: 5px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.working-content {
  flex: 1;
  min-width: 0;
}

.working-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 3px;
}

.working-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-tag {
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--glass-border);
  padding: 0 5px;
  border-radius: 999px;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.elapsed {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.working-panel--sheet {
  position: relative;
  top: auto;
  right: auto;
  margin-top: 0;
  width: 100%;
  max-height: min(60dvh, 60vh);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-bottom: none;
  padding-bottom: var(--safe-bottom, 0px);
}

.working-panel--sheet .panel-header {
  padding-top: 14px;
}

.panel-close {
  margin-left: auto;
  width: var(--touch-target);
  height: var(--touch-target);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.panel-close:hover,
.panel-close:active {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.working-panel--sheet .working-item {
  min-height: var(--touch-target);
  align-items: center;
}

.working-panel--sheet .working-item:active {
  background: var(--layer-active);
}
</style>
