<script setup>
import { ref, computed } from 'vue'
import { useProject } from '@entities/project'

const props = defineProps({
  /** 当前选中的 projectId，用于高亮显示 */
  currentProjectId: { type: String, default: null },
})

const emit = defineEmits(['select', 'close', 'new-project'])

const { projects, sidebarMode, setSidebarMode } = useProject()
const keyword = ref('')

// 按 mode 过滤：Agents = 非 team；Teams = team
const filteredProjects = computed(() => {
  const list = projects.value.filter((p) =>
    sidebarMode.value === 'teams'
      ? p.project_type === 'team'
      : p.project_type !== 'team'
  )
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(kw) ||
      (p.dir_path || '').toLowerCase().includes(kw)
  )
})

function projectDisplayName(p) {
  if (p.project_type === 'team' || !p.agents?.current) return p.name || ''
  return `${p.name} (agent)`
}

function sessionCount(p) {
  return p.session_count ?? 0
}
</script>

<template>
  <div class="picker-root" @click.self="$emit('close')">
    <div class="picker-sheet">
      <!-- 顶部栏 -->
      <div class="picker-header">
        <button class="picker-close-btn" @click="$emit('close')" aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <span class="picker-title">选择项目</span>
        <button class="picker-new-btn" @click="$emit('new-project')" aria-label="新建项目">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- Agents / Teams Tab -->
      <div class="picker-tabs">
        <button
          class="picker-tab"
          :class="{ active: sidebarMode === 'single' }"
          @click="setSidebarMode('single')"
        >Agents</button>
        <button
          class="picker-tab"
          :class="{ active: sidebarMode === 'teams' }"
          @click="setSidebarMode('teams')"
        >Teams</button>
      </div>

      <!-- 搜索框 -->
      <div class="picker-search-wrap">
        <svg class="picker-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="keyword"
          class="picker-search"
          type="search"
          placeholder="搜索项目名或路径…"
          autocomplete="off"
        />
      </div>

      <!-- 项目列表 -->
      <div class="picker-list">
        <div v-if="filteredProjects.length === 0" class="picker-empty">
          <span>没有匹配的项目</span>
        </div>
        <button
          v-for="project in filteredProjects"
          :key="project.id"
          class="picker-item"
          :class="{ active: project.id === currentProjectId }"
          @click="$emit('select', project)"
        >
          <span class="picker-item-icon">
            <svg v-if="project.project_type === 'team'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <span class="picker-item-body">
            <span class="picker-item-name">{{ projectDisplayName(project) }}</span>
            <span v-if="project.dir_path" class="picker-item-path">{{ project.dir_path }}</span>
          </span>
          <span class="picker-item-meta">
            <span v-if="project.agents?.current" class="picker-badge picker-badge--agent">Agent</span>
            <span v-if="sessionCount(project) > 0" class="picker-badge picker-badge--count">{{ sessionCount(project) }}</span>
            <svg v-if="project.id === currentProjectId" class="picker-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay-glass);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.picker-sheet {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-top: 1px solid var(--glass-border);
  max-height: 92dvh;
  max-height: 92vh; /* fallback */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-glass);
  padding-bottom: var(--safe-bottom, 0px);
}

.picker-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
  flex-shrink: 0;
}

.picker-title {
  flex: 1;
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  text-align: center;
}

.picker-close-btn,
.picker-new-btn {
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

.picker-close-btn:hover,
.picker-new-btn:hover {
  background: var(--layer-active);
  color: var(--accent);
}

.picker-new-btn {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.picker-tabs {
  display: flex;
  padding: 0 20px 10px;
  gap: 8px;
  flex-shrink: 0;
}

.picker-tab {
  flex: 1;
  height: 34px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}

.picker-tab.active {
  background: var(--layer-active);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.picker-search-wrap {
  position: relative;
  margin: 0 20px 8px;
  flex-shrink: 0;
}

.picker-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.picker-search {
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

.picker-search:focus {
  border-color: var(--accent);
}

.picker-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  padding: 4px 12px 8px;
}

.picker-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
}

.picker-item {
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

.picker-item:hover,
.picker-item:active {
  background: var(--bg-hover);
}

.picker-item.active {
  background: var(--accent-dim);
}

.picker-item + .picker-item {
  border-top: 1px solid var(--border-subtle);
}

.picker-item-icon {
  flex-shrink: 0;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.picker-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-item.active .picker-item-name {
  color: var(--accent);
}

.picker-item-path {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.picker-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.picker-badge--agent {
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.picker-badge--count {
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  min-width: 18px;
  text-align: center;
}

.picker-check {
  flex-shrink: 0;
}

/* 进场 / 退场动画 */
.picker-root {
  animation: picker-bg-in var(--motion-medium) var(--ease-out) both;
}

.picker-sheet {
  animation: picker-sheet-in var(--motion-emphasis) var(--ease-spring) both;
}

@keyframes picker-bg-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes picker-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
