import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionDashboard } from '../ui/SessionDashboard'
import type { SessionDashboardProps } from '../ui/SessionDashboard'

const defaultProps: SessionDashboardProps = {
  sessionId: 's1',
  projectDir: '/projects/test',
  projectDirName: 'test',
  modelLabel: 'claude-opus-4',
  gitBranch: 'main',
  permModeLabel: 'Accept Edits',
  permModeColorClass: 'perm-green',
  sessionElapsed: '5m 30s',
  agentProviderLabel: 'Claude',
  contextUsage: { current: 5000, max: 200000, percent: 2.5 },
  contextColorClass: 'ctx-green',
  compacting: false,
  isRunning: false,
  showClaudeControls: true,
  hasPlanTasks: false,
  planTaskCounts: { total: 0, completed: 0, inProgress: 0 },
  totalToolCalls: 0,
  topTools: [],
  toolStats: [],
  budgetStatus: null,
  claudeResumeCommand: '',
  onCompact: vi.fn(),
  onModelClick: vi.fn(),
  onBranchClick: vi.fn(),
  onPermClick: vi.fn(),
  onTaskPanelToggle: vi.fn(),
  showTaskPanel: false,
}

describe('SessionDashboard', () => {
  it('renders project directory name', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('renders session id', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('s1')).toBeInTheDocument()
  })

  it('renders model label', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('claude-opus-4')).toBeInTheDocument()
  })

  it('renders git branch', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('main')).toBeInTheDocument()
  })

  it('renders permission mode label', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('Accept Edits')).toBeInTheDocument()
  })

  it('renders session elapsed time', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('5m 30s')).toBeInTheDocument()
  })

  it('renders context usage percentage', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('2.5%')).toBeInTheDocument()
  })

  it('renders provider label', () => {
    render(<SessionDashboard {...defaultProps} />)
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('calls onCompact when context bar is clicked', () => {
    const onCompact = vi.fn()
    render(<SessionDashboard {...defaultProps} onCompact={onCompact} />)
    const btn = document.querySelector('.context-bar-btn')
    fireEvent.click(btn!)
    expect(onCompact).toHaveBeenCalled()
  })

  it('calls onModelClick when model chip is clicked', () => {
    const onModelClick = vi.fn()
    render(<SessionDashboard {...defaultProps} onModelClick={onModelClick} />)
    fireEvent.click(screen.getByTitle('Switch model'))
    expect(onModelClick).toHaveBeenCalled()
  })

  it('calls onBranchClick when branch chip is clicked', () => {
    const onBranchClick = vi.fn()
    render(<SessionDashboard {...defaultProps} onBranchClick={onBranchClick} />)
    fireEvent.click(screen.getByTitle(/Branch:/))
    expect(onBranchClick).toHaveBeenCalled()
  })

  it('shows plan chip when hasPlanTasks is true', () => {
    render(
      <SessionDashboard
        {...defaultProps}
        hasPlanTasks={true}
        planTaskCounts={{ total: 5, completed: 3, inProgress: 1 }}
      />,
    )
    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('shows budget status when provided', () => {
    render(
      <SessionDashboard
        {...defaultProps}
        budgetStatus={{ state: 'active' }}
        totalToolCalls={0}
      />,
    )
    expect(screen.getByText(/Budget active/)).toBeInTheDocument()
  })

  it('shows tool summary when tools have been called', () => {
    render(
      <SessionDashboard
        {...defaultProps}
        totalToolCalls={10}
        topTools={[{ name: 'bash', count: 5 }, { name: 'read', count: 3 }]}
        toolStats={[{ name: 'bash', count: 5 }, { name: 'read', count: 3 }]}
      />,
    )
    expect(screen.getByText('bash')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('disables context button when running', () => {
    render(<SessionDashboard {...defaultProps} isRunning={true} />)
    const btn = document.querySelector('.context-bar-btn')
    expect(btn).toBeDisabled()
  })
})
