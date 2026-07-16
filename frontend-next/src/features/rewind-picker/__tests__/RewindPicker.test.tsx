import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RewindPicker } from '../ui/RewindPicker'

const sampleItems = [
  { key: 'msg-0', index: 0, label: '#3', text: 'Hello', messageId: 'm1' },
  { key: 'msg-1', index: 1, label: '#2', text: 'Fix this bug', messageId: 'm2' },
  { key: 'msg-2', index: 2, label: '#1', text: 'Deploy to prod', messageId: 'm3' },
]

describe('RewindPicker', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <RewindPicker open={false} items={sampleItems} onRewindTo={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders items when open', () => {
    render(
      <RewindPicker open={true} items={sampleItems} onRewindTo={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Fix this bug')).toBeInTheDocument()
    expect(screen.getByText('Deploy to prod')).toBeInTheDocument()
  })

  it('calls onRewindTo and onClose when an item is clicked', () => {
    const onRewindTo = vi.fn()
    const onClose = vi.fn()
    render(
      <RewindPicker open={true} items={sampleItems} onRewindTo={onRewindTo} onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Hello'))
    expect(onRewindTo).toHaveBeenCalledWith(sampleItems[0])
    expect(onClose).toHaveBeenCalled()
  })

  it('filters items by search query', () => {
    render(
      <RewindPicker open={true} items={sampleItems} onRewindTo={vi.fn()} onClose={vi.fn()} />,
    )
    const searchInput = screen.getByPlaceholderText('Search history...')
    fireEvent.change(searchInput, { target: { value: 'bug' } })
    expect(screen.getByText('Fix this bug')).toBeInTheDocument()
    expect(screen.queryByText('Hello')).toBeNull()
    expect(screen.queryByText('Deploy to prod')).toBeNull()
  })

  it('closes on overlay click', () => {
    const onClose = vi.fn()
    const { container } = render(
      <RewindPicker open={true} items={sampleItems} onRewindTo={vi.fn()} onClose={onClose} />,
    )
    // Click the overlay (first child of container)
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(
      <RewindPicker open={true} items={sampleItems} onRewindTo={vi.fn()} onClose={onClose} />,
    )
    const picker = document.querySelector('.rewind-picker')!
    fireEvent.keyDown(picker, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state when no items match', () => {
    render(
      <RewindPicker open={true} items={[]} onRewindTo={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByText('No rewindable inputs')).toBeInTheDocument()
  })
})
