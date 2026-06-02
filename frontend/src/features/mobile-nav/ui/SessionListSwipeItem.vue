<script setup>
import { ref, computed, watch } from 'vue'
import { formatRelativeTime } from '@shared/lib/formatTime'

const COPY_WIDTH = 72
const DELETE_WIDTH = 72
const BOTH_ACTION_WIDTH = COPY_WIDTH + DELETE_WIDTH
const OPEN_THRESHOLD = 36

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
  openSwipeId: { type: String, default: null },
})

const emit = defineEmits(['select', 'delete', 'copy', 'swipe-open', 'swipe-close'])

const offset = ref(0)
const isDragging = ref(false)

let startX = 0
let startY = 0
let startOffset = 0
let didSwipe = false
let lockAxis = null

const isClaudeCode = computed(() => props.session.source === 'claude-code')
const canCopy = computed(() => !isClaudeCode.value)
const canDelete = computed(() => !props.active)

const actionWidth = computed(() => {
  if (canCopy.value && canDelete.value) return BOTH_ACTION_WIDTH
  if (canCopy.value) return COPY_WIDTH
  if (canDelete.value) return DELETE_WIDTH
  return 0
})

const isOpen = computed(
  () => actionWidth.value > 0 && offset.value <= -actionWidth.value / 2
)
const isRaised = computed(() => isDragging.value || isOpen.value)

const contentStyle = computed(() => ({
  transform: offset.value ? `translate3d(${offset.value}px, 0, 0)` : undefined,
}))

function peerOpenId() {
  const id = props.openSwipeId
  return id == null ? null : String(id)
}

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

function closeSwipe() {
  const wasOpen = isOpen.value
  offset.value = 0
  if (wasOpen && peerOpenId() === props.session.session_id) {
    emit('swipe-close')
  }
}

function snapOffset() {
  if (!actionWidth.value) {
    offset.value = 0
    return
  }
  const shouldOpen = offset.value < -Math.min(OPEN_THRESHOLD, actionWidth.value / 2)
  offset.value = shouldOpen ? -actionWidth.value : 0
  if (!shouldOpen && peerOpenId() === props.session.session_id) {
    emit('swipe-close')
  }
}

watch(
  () => props.openSwipeId,
  (id) => {
    const openId = id == null ? null : String(id)
    if (!openId || openId === props.session.session_id) return
    offset.value = 0
    isDragging.value = false
  }
)

function onTouchStart(e) {
  if (!actionWidth.value) return
  const touch = e.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  startOffset = offset.value
  isDragging.value = true
  didSwipe = false
  lockAxis = null
  // 立即收起其它已展开行，避免当前会话行 z-index 挡住下方行的触摸
  emit('swipe-open', props.session.session_id)
}

function onTouchMove(e) {
  if (!isDragging.value || !actionWidth.value) return
  const touch = e.touches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (!lockAxis) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    lockAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (lockAxis === 'y') {
      isDragging.value = false
      if (!isOpen.value && peerOpenId() === props.session.session_id) {
        emit('swipe-close')
      }
      return
    }
  }

  if (lockAxis !== 'x') return

  didSwipe = true
  e.preventDefault()
  offset.value = Math.min(0, Math.max(-actionWidth.value, startOffset + dx))
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  if (lockAxis === 'x') {
    snapOffset()
  } else if (!isOpen.value && peerOpenId() === props.session.session_id) {
    emit('swipe-close')
  }
  lockAxis = null
}

function onContentClick() {
  if (didSwipe) {
    didSwipe = false
    return
  }
  if (isOpen.value) {
    closeSwipe()
    return
  }
  emit('select', props.session)
}

function onCopyTap() {
  emit('copy', props.session.session_id)
}

function onDeleteTap() {
  emit('delete', props.session.session_id)
}
</script>

<template>
  <div
    class="sl-swipe-row"
    :class="{ raised: isRaised, dragging: isDragging }"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchEnd"
  >
    <div class="sl-swipe-actions" :style="{ width: `${actionWidth}px` }">
      <button
        v-if="canCopy"
        type="button"
        class="sl-swipe-copy"
        aria-label="复制会话"
        tabindex="-1"
        @click.stop="onCopyTap"
      >
        复制
      </button>
      <button
        v-if="canDelete"
        type="button"
        class="sl-swipe-delete"
        aria-label="删除会话"
        tabindex="-1"
        @click.stop="onDeleteTap"
      >
        删除
      </button>
    </div>

    <div
      class="sl-swipe-content"
      :class="{ active, open: isOpen, dragging: isDragging }"
      :style="contentStyle"
      @click="onContentClick"
    >
      <span class="sl-status-dot" :class="statusColor(session)"></span>

      <span class="sl-item-body">
        <span class="sl-item-name">{{ session.name || session.session_id }}</span>
        <span class="sl-item-meta">
          <span
            v-if="sessionLabel(session)"
            class="sl-status-label"
            :class="statusColor(session)"
          >
            {{ sessionLabel(session) }}
          </span>
          <span v-else class="sl-item-time">
            {{ formatRelativeTime(session.updated_at || session.created_at) }}
          </span>
        </span>
      </span>

      <svg
        v-if="active"
        class="sl-check"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.sl-swipe-row {
  position: relative;
  z-index: 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  touch-action: pan-y;
}

.sl-swipe-row.raised {
  z-index: 3;
}

.sl-swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  pointer-events: none;
}

.sl-swipe-row:has(.sl-swipe-content.open) .sl-swipe-actions {
  pointer-events: auto;
}

.sl-swipe-copy,
.sl-swipe-delete {
  flex: 1;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  -webkit-tap-highlight-color: transparent;
}

.sl-swipe-copy {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.sl-swipe-delete {
  color: #fff;
  background: var(--red);
}

.sl-swipe-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  padding: 12px 10px;
  min-height: var(--touch-target);
  border: none;
  background-color: var(--bg-secondary);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: transform var(--motion-fast) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
}

.sl-swipe-row.dragging,
.sl-swipe-row:has(.sl-swipe-content.dragging) {
  touch-action: none;
}

.sl-swipe-content.open,
.sl-swipe-content.dragging {
  transition: none;
}

.sl-swipe-content.active {
  background-color: var(--bg-secondary);
  box-shadow: inset 3px 0 0 var(--accent);
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

.sl-swipe-content.active .sl-item-name {
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

.sl-status-label.running {
  color: var(--status-running);
}

.sl-status-label.waiting {
  color: var(--status-waiting);
}

.sl-check {
  flex-shrink: 0;
}

@keyframes sl-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 4px var(--status-running);
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 8px var(--status-running);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-status-dot.running {
    animation: none;
  }

  .sl-swipe-content {
    transition: none;
  }
}
</style>
