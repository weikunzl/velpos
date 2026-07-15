'use client'

import { useMemo, useCallback, useEffect, useRef } from 'react'
import { WorkflowNode } from './WorkflowNode'
import type { TeamStep, TeamTask } from '../api/teamApi'

const NODE_W = 140
const NODE_H = 56
const GAP_Y = 24
const PAD = 20

interface Props {
  mode?: string
  steps: TeamStep[]
  tasks: TeamTask[]
  editable?: boolean
  onReorder?: (from: number, to: number) => void
}

export function WorkflowEditor({ mode = 'delegation', steps, tasks, editable = false, onReorder }: Props) {
  const dragRef = useRef({ index: -1, startY: 0 })

  const nodes = useMemo(() => {
    return steps.map((step, i) => {
      const matching = tasks.filter((t) => t.target_role === step.role)
      const task = matching.at(-1)
      return {
        ...step,
        index: i,
        status: task?.status || '',
        x: PAD,
        y: PAD + i * (NODE_H + GAP_Y),
      }
    })
  }, [steps, tasks])

  const svgHeight = useMemo(() => {
    const count = steps.length || 1
    return PAD * 2 + count * NODE_H + (count - 1) * GAP_Y
  }, [steps.length])

  const svgWidth = PAD * 2 + NODE_W

  const connections = useMemo(() => {
    if (mode !== 'delegation') return []
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = nodes[i]
      const to = nodes[i + 1]
      lines.push({
        x1: from.x + NODE_W / 2,
        y1: from.y + NODE_H,
        x2: to.x + NODE_W / 2,
        y2: to.y,
      })
    }
    return lines
  }, [mode, nodes])

  const onDragMove = useCallback(
    (e: MouseEvent) => {
      if (dragRef.current.index < 0) return
      const dy = e.clientY - dragRef.current.startY
      const stepHeight = NODE_H + GAP_Y
      const stepsDelta = Math.round(dy / stepHeight)
      if (stepsDelta !== 0) {
        const newIndex = Math.max(0, Math.min(steps.length - 1, dragRef.current.index + stepsDelta))
        if (newIndex !== dragRef.current.index) {
          onReorder?.(dragRef.current.index, newIndex)
          dragRef.current.index = newIndex
          dragRef.current.startY = e.clientY
        }
      }
    },
    [steps.length, onReorder]
  )

  const onDragEnd = useCallback(() => {
    dragRef.current.index = -1
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDragMove])

  const onDragStart = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (!editable) return
      dragRef.current.index = index
      dragRef.current.startY = e.clientY
      document.addEventListener('mousemove', onDragMove)
      document.addEventListener('mouseup', onDragEnd)
    },
    [editable, onDragMove, onDragEnd]
  )

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', onDragEnd)
    }
  }, [onDragMove, onDragEnd])

  return (
    <div className="workflow-editor">
      <svg width={svgWidth} height={svgHeight} className="workflow-svg">
        {/* Connection lines */}
        {connections.map((conn, i) => (
          <g key={`conn-${i}`}>
            <line
              x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2}
              className="conn-line"
            />
            <polygon
              points={`${conn.x2 - 4},${conn.y2 - 6} ${conn.x2 + 4},${conn.y2 - 6} ${conn.x2},${conn.y2}`}
              className="conn-arrow"
            />
          </g>
        ))}
        {/* Nodes */}
        {nodes.map((node) => (
          <WorkflowNode
            key={node.role}
            role={node.role}
            label={node.role_label || node.role}
            status={node.status}
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            editable={editable}
            onMouseDown={() => onDragStart(node.index, {} as React.MouseEvent)}
          />
        ))}
      </svg>
      {steps.length === 0 && <div className="empty-text">No steps configured</div>}
      <style>{`
        .workflow-editor { overflow: auto; }
        .workflow-svg { display: block; }
        .conn-line { stroke: var(--border); stroke-width: 1.5; stroke-dasharray: 4 3; }
        .conn-arrow { fill: var(--border); }
        .empty-text { font-size: 12px; color: var(--text-muted); padding: 12px 0; }
      `}</style>
    </div>
  )
}
