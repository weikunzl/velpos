import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiSessionDialog } from '../ui/MultiSessionDialog'

const mockSessions = [
  { session_id: 's1', name: 'Session A', project_id: 'p1', project_dir: '', status: 'idle', provider: 'claude', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { session_id: 's2', name: 'Session B', project_id: 'p2', project_dir: '', status: 'running', provider: 'claude', created_at: '2026-01-02', updated_at: '2026-01-02' },
  { session_id: 's3', name: 'Session C', project_id: 'p1', project_dir: '', status: 'idle', provider: 'claude', created_at: '2026-01-03', updated_at: '2026-01-03' },
]

describe('MultiSessionDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MultiSessionDialog
        open={false}
        sessions={mockSessions}
        onSelectSession={vi.fn()}
        onCompare={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders sessions when open', () => {
    render(
      <MultiSessionDialog
        open={true}
        sessions={mockSessions}
        onSelectSession={vi.fn()}
        onCompare={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Session A')).toBeInTheDocument()
    expect(screen.getByText('Session B')).toBeInTheDocument()
    expect(screen.getByText('Session C')).toBeInTheDocument()
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
  })

  it('shows compare bar when 2+ sessions are selected', () => {
    render(
      <MultiSessionDialog
        open={true}
        sessions={mockSessions.slice(0, 2)}
        onSelectSession={vi.fn()}
        onCompare={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[1])
    expect(screen.getByText('Compare Selected')).toBeInTheDocument()
  })

  it('shows hint when only 1 session selected', () => {
    render(
      <MultiSessionDialog
        open={true}
        sessions={mockSessions.slice(0, 2)}
        onSelectSession={vi.fn()}
        onCompare={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(screen.getByText(/Select at least 2/)).toBeInTheDocument()
  })

  it('calls onSelectSession when clicking the go button', () => {
    const onSelect = vi.fn()
    render(
      <MultiSessionDialog
        open={true}
        sessions={mockSessions}
        currentSessionId="s1"
        onSelectSession={onSelect}
        onCompare={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const goButtons = screen.getAllByTitle('Switch to this session')
    expect(goButtons.length).toBe(3)
    // Sorted by newest first: s3 (2026-01-03) is first
    fireEvent.click(goButtons[0])
    expect(onSelect).toHaveBeenCalledWith('s3')
    // Click the last button (s1, 2026-01-01)
    fireEvent.click(goButtons[2])
    expect(onSelect).toHaveBeenCalledWith('s1')
  })

  it('closes on overlay click', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MultiSessionDialog
        open={true}
        sessions={mockSessions}
        onSelectSession={vi.fn()}
        onCompare={vi.fn()}
        onClose={onClose}
      />,
    )
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
