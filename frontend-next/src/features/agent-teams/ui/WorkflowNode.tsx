'use client'

interface Props {
  role: string
  label: string
  status?: string
  projectName?: string
  x: number
  y: number
  width: number
  height: number
  active?: boolean
  editable?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
}

const statusColors: Record<string, string> = {
  pending: 'var(--text-muted)',
  running: 'var(--accent)',
  completed: 'var(--green, #98c379)',
  failed: 'var(--red, #e06c75)',
  waiting_for_help: 'var(--yellow, #e5c07b)',
}

export function WorkflowNode({
  role,
  label,
  status,
  projectName,
  x,
  y,
  width,
  height,
  active = false,
  editable = false,
  onMouseDown,
}: Props) {
  const strokeColor = status ? statusColors[status] || 'var(--border)' : 'var(--border)'

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`workflow-node${active ? ' node-active' : ''}${editable ? ' node-editable' : ''}`}
      onMouseDown={onMouseDown}
      style={{ cursor: editable ? 'grab' : 'default' }}
    >
      <rect
        width={width}
        height={height}
        rx="6"
        ry="6"
        className="node-rect"
        style={{ fill: 'var(--bg-tertiary)', stroke: strokeColor, strokeWidth: active ? 2 : 1.5, transition: 'stroke 0.2s, fill 0.2s' }}
      />
      <text
        x={width / 2}
        y={20}
        textAnchor="middle"
        style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
      >
        {label || role}
      </text>
      {projectName && (
        <text
          x={width / 2}
          y={36}
          textAnchor="middle"
          style={{ fill: 'var(--text-muted)', fontSize: 10 }}
        >
          {projectName}
        </text>
      )}
      {status && (
        <circle
          cx={width - 12}
          cy={12}
          r={4}
          fill={statusColors[status] || 'var(--text-muted)'}
        />
      )}
    </g>
  )
}
