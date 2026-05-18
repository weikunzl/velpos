<script setup>
const emit = defineEmits(['click'])
</script>

<template>
  <button
    class="glass-btn"
    @click="emit('click')"
    title="Git Management"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="3" x2="6" y2="15"/>
      <circle cx="18" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <path d="M18 9a9 9 0 0 1-9 9"/>
    </svg>
    <span class="git-btn-label">Git</span>
  </button>
</template>

<style scoped>
.git-btn-label {
  font-weight: 500;
}

@media (max-width: 768px) {
  .git-btn-label {
    display: none;
  }
}
</style>
