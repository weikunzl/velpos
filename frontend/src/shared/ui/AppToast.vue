<script setup>
import { useAppToast } from '@shared/lib/useAppToast'

const { toast, dismissToast } = useAppToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="toast"
        class="app-toast"
        :class="`app-toast--${toast.type}`"
        role="alert"
        @click="dismissToast"
      >
        <svg
          v-if="toast.type === 'error'"
          class="app-toast__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span class="app-toast__message">{{ toast.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(90vw, 420px);
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow: var(--shadow-lg);
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary);
  cursor: pointer;
}

.app-toast--error {
  border-color: color-mix(in srgb, var(--red) 35%, var(--glass-border));
  background: color-mix(in srgb, var(--red-dim) 55%, var(--glass-bg-strong));
}

.app-toast--error .app-toast__icon {
  color: var(--red);
  flex-shrink: 0;
}

.app-toast__message {
  word-break: break-word;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
