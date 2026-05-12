<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  path: { type: String, default: '' },
})

const scale = ref(1)
const imgEl = ref(null)

const filename = computed(() => (props.path || props.src).split('/').pop() || 'image')

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 5)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}

function resetZoom() {
  scale.value = 1
}
</script>

<template>
  <div class="image-preview">
    <div class="image-toolbar">
      <span class="image-name">{{ filename }}</span>
      <button class="zoom-btn" @click="zoomOut" title="Zoom out">−</button>
      <button class="zoom-btn" @click="resetZoom" title="Reset">{{ Math.round(scale * 100) }}%</button>
      <button class="zoom-btn" @click="zoomIn" title="Zoom in">+</button>
    </div>
    <div class="image-viewport">
      <img
        ref="imgEl"
        :src="src"
        :alt="filename"
        :style="{ transform: `scale(${scale})` }"
        draggable="false"
      />
    </div>
  </div>
</template>

<style scoped>
.image-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.image-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}

.image-name {
  font-size: 12px;
  color: var(--text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zoom-btn {
  min-width: 28px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--layer-glass);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.zoom-btn:hover {
  background: var(--layer-active);
  color: var(--text-primary);
}

.image-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--layer-base);
}

.image-viewport img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center center;
  transition: transform 0.15s ease;
}
</style>
