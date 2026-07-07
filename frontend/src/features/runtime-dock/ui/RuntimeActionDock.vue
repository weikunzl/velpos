<script setup>
import { ref, computed, watch } from 'vue'
import PermissionRequestBlock from '@features/message-display/ui/PermissionRequestBlock.vue'
import UserChoiceBlock from '@features/message-display/ui/UserChoiceBlock.vue'

const props = defineProps({
  queuedText: { type: String, default: '' },
  queuedMode: { type: String, default: null }, // 'active' | 'restored'
  canceling: { type: Boolean, default: false },
  cancelledHint: { type: Boolean, default: false },
  waitingForSlot: { type: Boolean, default: false },
  cancelRequested: { type: Boolean, default: false },
  interactiveBlock: { type: Object, default: null },
  interactiveAnswered: { type: Boolean, default: false },
})

const emit = defineEmits(['interactive-response'])

watch(() => props.interactiveBlock, () => {
  // Parent owns answered state; reset happens when a new interactive block arrives.
})

const visible = computed(() => Boolean(
  props.queuedMode
  || props.canceling
  || (props.cancelledHint && !props.canceling)
  || props.waitingForSlot
  || props.cancelRequested
  || (props.interactiveBlock && !props.interactiveAnswered),
))

const queuedLabel = computed(() => {
  if (props.queuedMode === 'restored') return 'Queued prompt restored — will run when you send'
  return 'Your message is queued — will run after current task'
})

function handleInteractiveResponse(data) {
  if (props.interactiveAnswered) return
  emit('interactive-response', data)
}
</script>

<template>
  <Transition name="dock-slide">
    <div v-if="visible" class="runtime-action-dock">
      <div v-if="queuedMode && queuedText" class="dock-block dock-queued">
        <div class="queue-indicator">
          <span class="queue-dot"></span>
          {{ queuedLabel }}
        </div>
        <div class="queued-message-preview">{{ queuedText }}</div>
      </div>

      <div v-if="cancelRequested && !canceling" class="dock-block">
        <div class="queue-indicator cancel-indicator">
          <span class="queue-dot cancel-dot"></span>
          Cancellation is being restored
        </div>
      </div>

      <div v-if="canceling" class="dock-block">
        <div class="queue-indicator cancel-indicator">
          <span class="queue-dot cancel-dot"></span>
          Cancelling...
        </div>
      </div>

      <Transition name="cancel-hint-fade">
        <div v-if="cancelledHint && !canceling" class="dock-block">
          <div class="queue-indicator cancelled-indicator">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            已取消
          </div>
        </div>
      </Transition>

      <div v-if="waitingForSlot" class="dock-block">
        <div class="queue-indicator">
          <span class="queue-dot"></span>
          Waiting for an available execution slot
        </div>
      </div>

      <div v-if="interactiveBlock && !interactiveAnswered" class="dock-block dock-interactive">
        <UserChoiceBlock
          v-if="interactiveBlock.type === 'user_choice'"
          :block="interactiveBlock"
          :answered="interactiveAnswered"
          @answer="handleInteractiveResponse"
        />
        <PermissionRequestBlock
          v-else-if="interactiveBlock.type === 'permission'"
          :block="interactiveBlock"
          :answered="interactiveAnswered"
          @respond="handleInteractiveResponse"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.runtime-action-dock {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 clamp(18px, 2.4vw, 32px) 8px;
}

.dock-block {
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-border) 40%, transparent);
  overflow: hidden;
}

.dock-queued {
  padding: 10px 12px;
}

.dock-interactive :deep(.permission-block),
.dock-interactive :deep(.user-choice-block) {
  margin: 0;
  border: none;
  border-radius: 0;
}

.queue-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.queued-message-preview {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: auto;
}

.queue-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: queue-pulse 1.5s ease-in-out infinite;
  flex-shrink: 0;
}

.cancel-indicator {
  padding: 8px 12px;
  color: var(--warning, #e89a3c);
}

.cancel-dot {
  background: var(--warning, #e89a3c);
}

.cancelled-indicator {
  padding: 8px 12px;
  color: var(--yellow);
}

.cancelled-indicator svg {
  color: var(--yellow);
  flex-shrink: 0;
}

.dock-slide-enter-active,
.dock-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.dock-slide-enter-from,
.dock-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-bottom: 0;
}

.dock-slide-enter-to,
.dock-slide-leave-from {
  max-height: 480px;
  opacity: 1;
}

.cancel-hint-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.cancel-hint-fade-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.cancel-hint-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.cancel-hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes queue-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
