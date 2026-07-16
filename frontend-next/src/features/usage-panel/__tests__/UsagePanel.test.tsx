import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsagePanel } from '../ui/UsagePanel'
import type { QueryHistoryEntry } from '@/shared/types/api'

const mockHistory: QueryHistoryEntry[] = [
  { timestamp: Date.now(), duration_ms: 1500, num_turns: 3, is_error: false, usage: { input_tokens: 500, output_tokens: 200 }, total_cost_usd: 0.01 },
  { timestamp: Date.now(), duration_ms: 8000, num_turns: 5, is_error: true, usage: { input_tokens: 1000, output_tokens: 300 }, total_cost_usd: 0.03 },
]

describe('UsagePanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <UsagePanel
        open={false}
        queryHistory={[]}
        totalInputTokens={0}
        totalOutputTokens={0}
        isRunning={false}
        runningDuration=""
        runningStatusText=""
        onClose={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows empty state when no history', () => {
    render(
      <UsagePanel
        open={true}
        queryHistory={[]}
        totalInputTokens={0}
        totalOutputTokens={0}
        isRunning={false}
        runningDuration=""
        runningStatusText=""
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('No queries yet')).toBeInTheDocument()
  })

  it('renders query history items', () => {
    render(
      <UsagePanel
        open={true}
        queryHistory={mockHistory}
        totalInputTokens={1500}
        totalOutputTokens={500}
        isRunning={false}
        runningDuration=""
        runningStatusText=""
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/Context:/)).toBeInTheDocument()
    expect(screen.getByText(/1\.5K/)).toBeInTheDocument()
    // Output 500 appears in history-item-tokens
    const tokenSpans = screen.getAllByText(/500/)
    expect(tokenSpans.length).toBeGreaterThanOrEqual(1)
  })

  it('shows running indicator when query is active', () => {
    render(
      <UsagePanel
        open={true}
        queryHistory={[]}
        totalInputTokens={0}
        totalOutputTokens={0}
        isRunning={true}
        runningDuration="5s"
        runningStatusText="Running..."
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('5s')).toBeInTheDocument()
  })

  it('shows error tag for error entries', () => {
    render(
      <UsagePanel
        open={true}
        queryHistory={mockHistory}
        totalInputTokens={0}
        totalOutputTokens={0}
        isRunning={false}
        runningDuration=""
        runningStatusText=""
        onClose={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0)
  })
})
