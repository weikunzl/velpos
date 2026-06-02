<script setup>
/**
 * MobileMoreSheet — 移动端「更多操作」底部 Sheet
 *
 * 将桌面顶栏中在移动端隐藏的功能集中到这里：
 * Settings、Git、Theme、Workspace、Terminal、Working Sessions
 */
import { useTheme } from '@shared/lib/useTheme'
import { useWorkingSessions } from '@features/working-sessions'

const emit = defineEmits([
  'close',
  'open-settings',
  'open-git',
  'open-workspace',
  'open-terminal',
  'open-working-sessions',
])

const { theme, toggleTheme } = useTheme()
const { workingCount } = useWorkingSessions()

const themeLabel = {
  dark: '深色',
  light: '浅色',
  sepia: '护眼',
}

function nextThemeLabel() {
  if (theme.value === 'dark') return '切换到浅色'
  if (theme.value === 'light') return '切换到护眼'
  return '切换到深色'
}
</script>

<template>
  <div class="ms-root" @click.self="$emit('close')">
    <div class="ms-sheet">
      <!-- 拖动把手 -->
      <div class="ms-handle"></div>

      <div class="ms-title">更多操作</div>

      <div class="ms-grid">
        <!-- Settings -->
        <button class="ms-item" @click="$emit('open-settings'); $emit('close')">
          <span class="ms-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span class="ms-item-label">设置</span>
        </button>

        <!-- Git -->
        <button class="ms-item" @click="$emit('open-git'); $emit('close')">
          <span class="ms-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
              <path d="M6 21V9a9 9 0 0 0 9 9"/>
            </svg>
          </span>
          <span class="ms-item-label">Git</span>
        </button>

        <!-- Workspace -->
        <button class="ms-item" @click="$emit('open-workspace'); $emit('close')">
          <span class="ms-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          <span class="ms-item-label">工作区</span>
        </button>

        <!-- Terminal -->
        <button class="ms-item" @click="$emit('open-terminal'); $emit('close')">
          <span class="ms-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
            </svg>
          </span>
          <span class="ms-item-label">终端</span>
        </button>

        <!-- Theme -->
        <button class="ms-item" @click="toggleTheme">
          <span class="ms-item-icon">
            <svg v-if="theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg v-else-if="theme === 'light'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <span class="ms-item-label">{{ nextThemeLabel() }}</span>
        </button>

        <!-- Working Sessions -->
        <button class="ms-item" @click="$emit('open-working-sessions')">
          <span class="ms-item-icon ms-item-icon--badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span v-if="workingCount > 0" class="ms-badge">{{ workingCount > 9 ? '9+' : workingCount }}</span>
          </span>
          <span class="ms-item-label">进行中</span>
        </button>
      </div>

      <button class="ms-cancel" @click="$emit('close')">取消</button>
    </div>
  </div>
</template>

<style scoped>
.ms-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: var(--overlay-glass);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  animation: ms-bg-in var(--motion-medium) var(--ease-out) both;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.ms-sheet {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-top: 1px solid var(--glass-border);
  padding: 8px 20px calc(20px + var(--safe-bottom, 0px));
  box-shadow: var(--shadow-glass);
  animation: ms-sheet-in var(--motion-emphasis) var(--ease-spring) both;
}

.ms-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--border);
  margin: 0 auto 16px;
}

.ms-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.ms-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.ms-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 14px 8px 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  min-height: var(--touch-target);
  position: relative;
}

.ms-item:hover,
.ms-item:active {
  background: var(--layer-active);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--accent);
}

.ms-item-icon {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
}

.ms-item-icon--badge {
  position: relative;
}

.ms-badge {
  position: absolute;
  top: -6px;
  right: -8px;
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
}

.ms-item:hover .ms-item-icon,
.ms-item:active .ms-item-icon {
  color: var(--accent);
}

.ms-item-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.ms-item:hover .ms-item-label,
.ms-item:active .ms-item-label {
  color: var(--accent);
}

.ms-cancel {
  display: block;
  width: 100%;
  height: var(--touch-target);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.ms-cancel:hover,
.ms-cancel:active {
  background: var(--layer-active);
  color: var(--accent);
}

@keyframes ms-bg-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ms-sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
