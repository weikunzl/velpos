<script setup>
import { computed } from 'vue'

const props = defineProps({
  prefix: {
    type: String,
    default: 'logo',
  },
})

const ids = computed(() => {
  const p = props.prefix
  return { fl: `${p}-fl`, fr: `${p}-fr`, fb: `${p}-fb`, ft: `${p}-ft` }
})
</script>

<template>
  <div class="logo">
    <svg class="logo-svg" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="ids.fl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4a9eff"/>
          <stop offset="100%" stop-color="#a78bfa"/>
        </linearGradient>
        <linearGradient :id="ids.fr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a78bfa"/>
          <stop offset="100%" stop-color="#c084fc"/>
        </linearGradient>
        <linearGradient :id="ids.fb" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b5998"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
        <linearGradient :id="ids.ft" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#c4b5fd"/>
          <stop offset="100%" stop-color="#a78bfa"/>
        </linearGradient>
      </defs>
      <polygon :fill="`url(#${ids.fl})`" points="256,56 108,200 148,400 256,296"/>
      <polygon :fill="`url(#${ids.fr})`" points="256,56 404,200 364,400 256,296"/>
      <polygon :fill="`url(#${ids.fb})`" points="148,400 256,456 256,296"/>
      <polygon fill="#7c3aed" opacity="0.8" points="364,400 256,456 256,296"/>
      <polygon :fill="`url(#${ids.ft})`" opacity="0.5" points="256,56 200,148 256,180 312,148"/>
      <line x1="256" y1="80" x2="256" y2="440" stroke="#67e8f9" stroke-width="3" opacity="0.9"/>
    </svg>
    <span class="logo-text">Velpos</span>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-svg {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}

.logo-text {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
</style>
