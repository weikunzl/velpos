import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../Modal'

describe('Modal', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('renders null when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>modal content</p>
      </Modal>,
    )
    expect(screen.getByText('modal content')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    )
    const overlay = document.querySelector('.modal-overlay')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    )
    const dialog = document.querySelector('.modal-dialog')!
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders title when provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Title">
        <p>content</p>
      </Modal>,
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })

  it('does not render title section when not provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('sets body overflow hidden when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow when closed', () => {
    const { rerender } = render(
      <Modal open={true} onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    )
    rerender(
      <Modal open={false} onClose={vi.fn()}>
        <p>content</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('close button calls onClose', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="With Close Btn">
        <p>content</p>
      </Modal>,
    )
    const closeBtn = screen.getByLabelText('Close')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('applies custom width', () => {
    render(
      <Modal open={true} onClose={vi.fn()} width="500px">
        <p>content</p>
      </Modal>,
    )
    const dialog = document.querySelector('.modal-dialog') as HTMLElement
    expect(dialog.style.maxWidth).toBe('500px')
  })

  it('removes Escape listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal open={true} onClose={onClose}>
        <p>content</p>
      </Modal>,
    )
    unmount()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
