<script setup>
import { ref, computed } from 'vue'
import { formatRelativeTime } from '@shared/lib/formatTime'

const props = defineProps({
  /** 当前项目信息 */
  project: { type: Object, default: null },
  /** 该项目下的会话列表 */
  sessions: { type: Array, default: () => [] },
  /** 当前激活的 sessionId */
  currentSessionId: { type: String, default: null },
})

const emit = defineEmits(['select', 'back', 'close', 'new-session'])

const keyword = ref('')

const filteredSessions = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return props.sessions
  return props.sessions.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(kw) ||
      (s.session_id || '').toLowerCase().includes(kw)
  )
})

function statusColor(session) {
  if (session.status === 'running') return 'running'
  if (session.status === 'waiting') return 'waiting'
  return ''
}

function sessionLabel(session) {
  if (session.status === 'running') return '运行中'
  if (session.status === 'waiting') return '等待输入'
  return ''
}
</script>

<template>
  <div class="sl-root" @click.self="$emit('close')">
    <div class="sl-sheet">
      <!-- 顶部栏 -->
      <div class="sl-header">
        <button class="sl-back-btn" @click="$emit('back')" aria-label="返回项目列表">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div class="sl-header-center">
          <span class="sl-project-name">{{ project?.name || '会话' }}</span>
          <span v-if="project?.agents?.current" class="sl-agent-badge">Agent</span>
        </div>
        <button class="sl-new-btn" @click="$emit('new-session')" aria-label="新建会话">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="sl-search-wrap">
        <svg class="sl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="keyword"
          class="sl-search"
          type="search"
          placeholder="搜索会话…"
          autocomplete="off"
        />
      </div>

      <!-- 会话列表 -->
      <div class="sl-list">
        <div v-if="filteredSessions.length === 0" class="sl-empty">
          <span>{{ keyword ? '没有匹配的会话' : '还没有会话，点击 + 新建' }}</span>
        </div>
        <button
          v-for="session in filteredSessions"
          :key="session.session_id"
          class="sl-item"
          :class="{ active: session.session_id === currentSessionId }"
          @click="$emit('select', session)"
        >
          <!-- 状态指示点 -->
          <span
            class="sl-status-dot"
            :class="statusColor(session)"
          ></span>

          <span class="sl-item-body">
            <span class="sl-item-name">{{ session.name || session.session_id }}</span>
            <span class="sl-item-meta">
              <span v-if="sessionLabel(session)" class="sl-status-label" :class="statusColor(session)">
                {{ sessionLabel(session) }}
              </span>
              <span v-else class="sl-item-time">{{ formatRelativeTime(session.updated_at || session.created_at) }}</span>
            </span>
          </span>

          <svg v-if="session.session_id === currentSessionId" class="sl-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sl-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay-glass);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  animation: sl-bg-in var(--motion-medium) var(--ease-out) both;
}

.sl-sheet {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-top: 1px solid var(--glass-border);
  max-height: 92dvh;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-glass);
  padding-bottom: var(--safe-bottom, 0px);
  animation: sl-sheet-in var(--motion-emphasis) var(--ease-spring) both;
}

.sl-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
  flex-shrink: 0;
}

.sl-header-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.sl-project-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-agent-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  flex-shrink: 0;
}

.sl-back-btn,
.sl-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target);
  height: var(--touch-target);
  background: var(--bg-hover);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.sl-back-btn:hover,
.sl-new-btn:hover {
  background: var(--layer-active);
  color: var(--accent);
}

.sl-new-btn {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.sl-search-wrap {
  position: relative;
  margin: 0 20px 8px;
  flex-shrink: 0;
}

.sl-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.sl-search {
  width: 100%;
  height: 40px;
  padding: 0 12px 0 36px;
  background: var(--bg-input);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.sl-search:focus {
  border-color: var(--accent);
}

.sl-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  padding: 4px 12px 8px;
}

.sl-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.sl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 10px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: left;
  min-height: var(--touch-target);
}

.sl-item:hover,
.sl-item:active {
  background: var(--bg-hover);
}

.sl-item.active {
  background: var(--accent-dim);
}

.sl-item + .sl-item {
  border-top: 1px solid var(--border-subtle);
}

.sl-status-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}

.sl-status-dot.running {
  background: var(--status-running);
  animation: sl-pulse 1.5s ease-in-out infinite;
}

.sl-status-dot.waiting {
  background: var(--status-waiting);
}

.sl-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sl-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-item.active .sl-item-name {
  color: var(--accent);
}

.sl-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sl-item-time {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.sl-status-label {
  font-size: 11px;
  font-weight: 600;
}

.sl-status-label.running { color: var(--status-running); }
.sl-status-label.waiting { color: var(--status-waiting); }

.sl-check {
  flex-shrink: 0;
}

@keyframes sl-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--status-running); }
  50% { opacity: 0.5; box-shadow: 0 0 8px var(--status-running); }
}

@keyframes sl-bg-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes sl-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
