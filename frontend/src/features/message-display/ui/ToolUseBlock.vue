<script setup>
import { computed, ref } from 'vue'
import { formatInput, formatToolDisplayName, formatToolValue, toolInputSummary, toolBlockHasDetails } from '../lib/formatters'

const props = defineProps({
  block: {
    type: Object,
    required: true,
  },
})

const expanded = ref(false)
const displayName = computed(() => formatToolDisplayName(props.block.name))
const inputSummary = computed(() => toolInputSummary(props.block.input, props.block))
const hasDetails = computed(() => toolBlockHasDetails(props.block))

const detailSections = computed(() => {
  const sections = []
  const input = props.block.input
  if (input && typeof input === 'object' && Object.keys(input).length > 0) {
    sections.push({ label: 'Input', text: formatInput(input) })
  }
  if (Array.isArray(props.block.locations) && props.block.locations.length > 0) {
    sections.push({ label: 'Locations', text: formatInput(props.block.locations) })
  }
  if (props.block.output != null && props.block.output !== '') {
    sections.push({ label: 'Output', text: formatToolValue(props.block.output) })
  }
  if (props.block.status) {
    sections.push({ label: 'Status', text: String(props.block.status) })
  }
  return sections
})
</script>

<template>
  <div class="msg-tool-use" @click="expanded = !expanded" :class="{ 'is-expanded': expanded }">
    <div class="tool-header">
      <span class="tool-icon">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v1.3a.7.7 0 0 0 .7.7h1.3a.5.5 0 0 0 0-1H3V4.5A1.5 1.5 0 0 1 4.5 3H6a.5.5 0 0 0 0-1H4.5zM10 2.5a.5.5 0 0 1 .5-.5h1.5A2.5 2.5 0 0 1 14.5 4.5V6a.5.5 0 0 1-1 0V4.5A1.5 1.5 0 0 0 12 3h-1.5a.5.5 0 0 1-.5-.5zM2.5 10a.5.5 0 0 1 .5.5V12a1.5 1.5 0 0 0 1.5 1.5H6a.5.5 0 0 1 0 1H4.5A2.5 2.5 0 0 1 2 12v-1.5a.5.5 0 0 1 .5-.5zm11 0a.5.5 0 0 1 .5.5V12a2.5 2.5 0 0 1-2.5 2.5H10a.5.5 0 0 1 0-1h1.5A1.5 1.5 0 0 0 13 12v-1.5a.5.5 0 0 1 .5-.5z"/>
        </svg>
      </span>
      <span class="tool-name">{{ displayName }}</span>
      <span v-if="inputSummary" class="tool-detail">{{ inputSummary }}</span>
      <span v-else-if="!hasDetails" class="tool-detail tool-detail--muted">No details yet</span>
      <span class="expand-hint">
        <svg :class="{ rotated: expanded }" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/>
        </svg>
      </span>
    </div>
    <div class="tool-input-wrapper">
      <div v-if="detailSections.length" class="tool-input">
        <section v-for="(section, index) in detailSections" :key="index" class="tool-section">
          <div class="tool-section-label">{{ section.label }}</div>
          <pre>{{ section.text }}</pre>
        </section>
      </div>
      <div v-else-if="expanded" class="tool-input tool-input--empty">
        <pre>Waiting for tool input or output…</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-tool-use {
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid var(--border-subtle);
  background: var(--bg-tertiary);
  margin-top: 4px;
}

.msg-tool-use:hover {
  background: var(--bg-hover);
  border-color: var(--border);
}

.msg-tool-use.is-expanded {
  border-color: var(--border);
  background: var(--bg-secondary);
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
}

.tool-icon {
  color: var(--purple);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tool-name {
  font-weight: 500;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
}

.tool-detail {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tool-detail--muted {
  font-style: italic;
}

.expand-hint {
  margin-left: auto;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.expand-hint svg {
  transition: transform var(--transition-base);
}

.expand-hint svg.rotated {
  transform: rotate(180deg);
}

.tool-input-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-base);
}

.is-expanded .tool-input-wrapper {
  grid-template-rows: 1fr;
}

.tool-input {
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.is-expanded .tool-input {
  opacity: 1;
}

.tool-section + .tool-section {
  margin-top: 8px;
}

.tool-section-label {
  margin: 0 8px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tool-input pre {
  margin: 0 8px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
  background: var(--bg-primary);
  color: var(--accent);
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-input--empty pre {
  color: var(--text-muted);
  font-style: italic;
}
</style>
