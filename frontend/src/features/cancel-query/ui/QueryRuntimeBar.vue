<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  canceling: {
    type: Boolean,
    default: false,
  },
  elapsed: {
    type: String,
    default: '',
  },
  statusText: {
    type: String,
    default: '执行中',
  },
  activity: {
    type: Object,
    default: null,
  },
  showStop: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['stop'])
</script>

<template>
  <div v-if="visible" class="query-runtime-bar" :class="{ 'query-runtime-bar--compact': compact }">
    <div class="query-runtime-status">
      <span class="query-runtime-dot" :class="{ 'query-runtime-dot--cancel': canceling }"></span>
      <template v-if="canceling">
        <span class="query-runtime-label">正在停止...</span>
      </template>
      <template v-else>
        <span v-if="activity?.type === 'tool'" class="query-runtime-activity">{{ activity.name }}</span>
        <span v-else-if="activity?.type === 'thinking'" class="query-runtime-activity query-runtime-activity--thinking">思考中</span>
        <span v-else class="query-runtime-label">{{ statusText }}</span>
        <span v-if="activity?.detail" class="query-runtime-detail">{{ activity.detail }}</span>
        <span v-if="elapsed" class="query-runtime-elapsed">{{ elapsed }}</span>
      </template>
    </div>
    <button
      v-if="showStop"
      type="button"
      class="query-stop-btn"
      title="停止当前任务 (Esc)"
      @click="$emit('stop')"
    >
      停止
    </button>
  </div>
</template>

<style scoped>
.query-runtime-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 clamp(18px, 2.4vw, 32px) 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--accent-dim) 42%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  font-size: 12px;
  color: var(--text-secondary);
}

.query-runtime-bar--compact {
  margin: 0;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  border-color: color-mix(in srgb, var(--glass-border) 40%, transparent);
}

.query-runtime-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.query-runtime-dot {
  width: 7px;
  height: 7px;
  min-width: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: query-runtime-pulse 1.5s ease-in-out infinite;
}

.query-runtime-dot--cancel {
  background: var(--warning, #e89a3c);
}

.query-runtime-label,
.query-runtime-activity {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.query-runtime-activity {
  color: var(--accent);
}

.query-runtime-activity--thinking {
  color: var(--purple);
}

.query-runtime-detail {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.query-runtime-elapsed {
  font-family: var(--font-mono);
  color: var(--text-muted);
  white-space: nowrap;
}

.query-runtime-elapsed::before {
  content: '·';
  margin-right: 8px;
  color: var(--text-muted);
}

.query-stop-btn {
  flex-shrink: 0;
  height: 28px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
  background: color-mix(in srgb, var(--red) 12%, transparent);
  color: var(--red);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.query-stop-btn:hover {
  background: color-mix(in srgb, var(--red) 20%, transparent);
  border-color: var(--red);
}

@keyframes query-runtime-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.92); }
}
</style>
