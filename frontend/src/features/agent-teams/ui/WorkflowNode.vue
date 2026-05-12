<script setup>
const props = defineProps({
  role: { type: String, default: '' },
  label: { type: String, default: '' },
  status: { type: String, default: '' },
  projectName: { type: String, default: '' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  width: { type: Number, default: 140 },
  height: { type: Number, default: 56 },
  active: { type: Boolean, default: false },
  editable: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const statusColors = {
  pending: 'var(--text-muted)',
  running: 'var(--accent)',
  completed: 'var(--green, #98c379)',
  failed: 'var(--red, #e06c75)',
  waiting_for_help: 'var(--yellow, #e5c07b)',
}
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    class="workflow-node"
    :class="{ 'node-active': active, 'node-editable': editable }"
    @click="emit('click')"
  >
    <rect
      :width="width"
      :height="height"
      rx="6"
      ry="6"
      class="node-rect"
      :style="status ? `stroke: ${statusColors[status] || 'var(--border)'}` : ''"
    />
    <text
      :x="width / 2"
      :y="20"
      text-anchor="middle"
      class="node-label"
    >{{ label || role }}</text>
    <text
      v-if="projectName"
      :x="width / 2"
      :y="36"
      text-anchor="middle"
      class="node-project"
    >{{ projectName }}</text>
    <circle
      v-if="status"
      :cx="width - 12"
      cy="12"
      r="4"
      :fill="statusColors[status] || 'var(--text-muted)'"
    />
  </g>
</template>

<style scoped>
.workflow-node {
  cursor: default;
}

.node-editable {
  cursor: grab;
}

.node-rect {
  fill: var(--bg-tertiary);
  stroke: var(--border);
  stroke-width: 1.5;
  transition: stroke 0.2s, fill 0.2s;
}

.node-active .node-rect {
  stroke: var(--accent);
  stroke-width: 2;
}

.node-editable:hover .node-rect {
  fill: var(--bg-hover);
}

.node-label {
  fill: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
}

.node-project {
  fill: var(--text-muted);
  font-size: 10px;
}
</style>
