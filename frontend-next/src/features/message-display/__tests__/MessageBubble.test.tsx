import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageBubble } from '../ui/MessageBubble'
import type { Message } from '@/shared/types/api'

function makeMsg(overrides: Partial<Message> & { type: Message['type'] }): Message {
  return {
    content: {},
    type: 'assistant',
    ...overrides,
  } as Message
}

describe('MessageBubble', () => {
  describe('markdown rendering', () => {
    it('renders text content as markdown', () => {
      const msg = makeMsg({ type: 'text', content: { text: 'Hello **world**' } })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('world')).toBeInTheDocument()
    })

    it('renders code blocks with highlight.js syntax highlighting', () => {
      const msg = makeMsg({ type: 'text', content: { text: '```ts\nconst x = 1\n```' } })
      render(<MessageBubble message={msg} />)
      // highlight.js adds language-xxx class
      const codeEl = document.querySelector('.hljs')
      expect(codeEl).toBeTruthy()
    })

    it('renders empty content as null', () => {
      const msg = makeMsg({ type: 'text', content: { text: '' } })
      const { container } = render(<MessageBubble message={msg} />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('diff auto-detection', () => {
    it('renders diff-styled content when lines are mostly +-@@', () => {
      const diffText = [
        '--- a/file.ts',
        '+++ b/file.ts',
        '@@ -1,3 +1,4 @@',
        ' unchanged',
        '+added line',
        '-removed line',
      ].join('\n')
      const msg = makeMsg({ type: 'result', content: { text: diffText } })
      render(<MessageBubble message={msg} />)
      expect(document.querySelector('.msg-diff')).toBeTruthy()
      expect(document.querySelector('.msg-diff-add')).toBeTruthy()
      expect(document.querySelector('.msg-diff-del')).toBeTruthy()
    })

    it('renders normal markdown for non-diff content', () => {
      const normalText = 'This is just a normal message without any diff patterns'
      const msg = makeMsg({ type: 'result', content: { text: normalText } })
      render(<MessageBubble message={msg} />)
      expect(document.querySelector('.msg-diff')).toBeFalsy()
    })
  })

  describe('long content folding', () => {
    it('shows expand button for content > 2000 chars', () => {
      const longText = 'x'.repeat(2500)
      const msg = makeMsg({ type: 'text', content: { text: longText } })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText(/Show more/)).toBeInTheDocument()
    })

    it('does not show expand button for short content', () => {
      const shortText = 'short text'
      const msg = makeMsg({ type: 'text', content: { text: shortText } })
      render(<MessageBubble message={msg} />)
      expect(screen.queryByText(/Show more/)).toBeNull()
    })

    it('expands and collapses on button click', () => {
      const longText = 'x'.repeat(2500) + 'THE_END'
      const msg = makeMsg({ type: 'text', content: { text: longText } })
      render(<MessageBubble message={msg} />)
      // Initial state: collapsed, shows "Show more" button
      const btn = screen.getByText(/Show more/)
      expect(btn).toBeInTheDocument()
      // THE_END should be hidden initially due to folding
      expect(screen.queryByText(/THE_END/)).toBeNull()
      // Click to expand
      fireEvent.click(btn)
      // After expansion, THE_END should be visible and button says "Show less"
      expect(screen.getByText(/THE_END/)).toBeInTheDocument()
      expect(screen.getByText(/Show less/)).toBeInTheDocument()
    })
  })

  describe('tool_use rendering', () => {
    it('shows tool name and collapsible input', () => {
      const msg = makeMsg({
        type: 'tool_use',
        content: { tool_name: 'bash', tool_input: { command: 'ls -la' } },
      })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText(/Tool:.*bash/)).toBeInTheDocument()
      expect(screen.getByText(/"command"/)).toBeInTheDocument()
    })
  })

  describe('tool_result rendering', () => {
    it('shows result content with tool name', () => {
      const msg = makeMsg({
        type: 'tool_result',
        content: { tool_name: 'read_file', text: 'file content here' },
      })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText(/Result:.*read_file/)).toBeInTheDocument()
      expect(screen.getByText('file content here')).toBeInTheDocument()
    })

    it('shows error state when is_error is true', () => {
      const msg = makeMsg({
        type: 'tool_result',
        content: { tool_name: 'bash', text: 'command not found', is_error: true },
      })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText(/Error:.*bash/)).toBeInTheDocument()
    })
  })

  describe('choice rendering', () => {
    it('renders choice buttons for choice interaction type', () => {
      const msg = makeMsg({
        type: 'interactive',
        content: {
          interaction_type: 'choice',
          title: 'Choose a file',
          options: ['file1.ts', 'file2.ts'],
        },
      })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText('Choose a file')).toBeInTheDocument()
      expect(screen.getByText('file1.ts')).toBeInTheDocument()
      expect(screen.getByText('file2.ts')).toBeInTheDocument()
    })
  })

  describe('permission rendering', () => {
    it('renders permission request with tool name', () => {
      const msg = makeMsg({
        type: 'interactive',
        content: {
          interaction_type: 'permission',
          tool_name: 'write_file',
          tool_input: { path: '/tmp/test.txt' },
        },
      })
      render(<MessageBubble message={msg} />)
      expect(screen.getByText(/Permission Request/)).toBeInTheDocument()
      expect(screen.getByText(/write_file/)).toBeInTheDocument()
    })
  })
})
