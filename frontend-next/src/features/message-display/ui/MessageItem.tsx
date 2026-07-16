'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { cachedParse } from '../lib/markdownConfig'
import { formatFileSize } from '@/shared/lib/textParsers'
import { AssistantBlock } from './AssistantBlock'
import { ThinkingBlock } from './ThinkingBlock'
import { TodoProgressBlock } from './TodoProgressBlock'
import { ToolUseBlock } from './ToolUseBlock'
import { ToolResultBlock } from './ToolResultBlock'
import { ResultBlock } from './ResultBlock'
import { SystemBlock } from './SystemBlock'
import { UserChoiceBlock } from './UserChoiceBlock'
import { PermissionRequestBlock } from './PermissionRequestBlock'
import type { Message } from '@/shared/types/api'

interface Attachment {
  id?: string
  filename?: string
  name?: string
  size_bytes?: number
  size?: number
}

interface Question {
  question: string
  header?: string
  multiSelect?: boolean
  options?: Array<{ label: string; description?: string }>
}

interface RenderedBlock {
  type: string
  html?: string
  text?: string
  thinking?: string
  name?: string
  toolInput?: Record<string, unknown>
  output?: unknown
  locations?: Array<Record<string, unknown>>
  status?: string
  id?: string
  content?: unknown
  is_error?: boolean
  tool_use_id?: string
  todos?: Array<{ subject: string; status: string; description?: string; activeForm?: string }>
  meta?: { is_error?: boolean; duration_ms?: number; num_turns?: number; usage?: unknown }
  tool_name?: string
  tool_input?: string
  questions?: Question[]
  attachments?: Array<Record<string, unknown>>
}

interface Props {
  message: Message
  interactiveAnswered?: boolean
  onInteractiveResponse?: (data: { answers?: Record<string, string>; decision?: 'allow' | 'deny' }) => void
}

const USER_MSG_MAX_HEIGHT = 144

export function MessageItem({ message, interactiveAnswered = false, onInteractiveResponse }: Props) {
  const [isUserMsgExpanded, setIsUserMsgExpanded] = useState(false)
  const [isUserMsgOverflow, setIsUserMsgOverflow] = useState(false)
  const [isUserMsgSelected, setIsUserMsgSelected] = useState(false)
  const userTextRef = useRef<HTMLDivElement>(null)

  const renderedBlocks = useMemo(() => {
    const msg = message
    const body = msg.content || {}

    if (msg.type === 'user') {
      return [{
        type: 'user',
        html: cachedParse((body as Record<string, unknown>).text as string || ''),
        attachments: (body as Record<string, unknown>).attachments || [],
      }] as RenderedBlock[]
    }

    if (msg.type === 'assistant') {
      const rawBlocks = (body as Record<string, unknown>).blocks as Array<Record<string, unknown>> || []
      const result: RenderedBlock[] = []
      for (const block of rawBlocks) {
        if (block.type === 'text') {
          result.push({ ...block, type: 'text', html: cachedParse((block.text as string) || '') } as unknown as RenderedBlock)
        } else if (block.type === 'thinking') {
          result.push(block as unknown as RenderedBlock)
        } else if (block.type === 'tool_use' && block.name === 'TodoWrite' && (block.input as Record<string, unknown>)?.todos) {
          const todos = (block.input as Record<string, unknown>).todos as Array<Record<string, unknown>>
          result.push({
            type: 'todo_progress',
            todos: todos.map(t => ({
              subject: (t.subject || t.content || '') as string,
              status: (t.status || 'pending') as string,
              description: (t.description || '') as string,
              activeForm: (t.activeForm || '') as string,
            })),
          })
        } else {
          result.push(block as unknown as RenderedBlock)
        }
      }
      return result
    }

    if (msg.type === 'result') {
      const resultBody = body as Record<string, unknown>
      return [{
        type: 'result',
        html: resultBody.text ? cachedParse(resultBody.text as string) : '',
        meta: {
          duration_ms: resultBody.duration_ms as number | undefined,
          num_turns: resultBody.num_turns as number | undefined,
          usage: resultBody.usage,
          is_error: resultBody.is_error as boolean | undefined,
        },
      }] as RenderedBlock[]
    }

    if (msg.type === 'tool_result') {
      const results = (body as Record<string, unknown>).results as Array<Record<string, unknown>> || []
      return results.map((r) => ({
        type: 'tool_result',
        tool_use_id: r.tool_use_id as string,
        content: r.content,
        is_error: r.is_error as boolean | undefined,
      })) as RenderedBlock[]
    }

    if (msg.type === 'system') {
      const subtype = (body as Record<string, unknown>).subtype as string || ''
      let text = subtype
      if (subtype === 'auto_continue') {
        text = `Auto-continuing (${String((body as Record<string, unknown>).attempt || '')}/${String((body as Record<string, unknown>).max || '')})`
      } else {
        const b = body as Record<string, unknown>
        if (b.description) text += `: ${String(b.description)}`
        if (b.status) text += ` [${String(b.status)}]`
        if (b.summary) text += ` - ${String(b.summary)}`
        if (b.last_tool_name) text += ` (${String(b.last_tool_name)})`
      }
      return [{ type: 'system', text: text || JSON.stringify(body) }] as RenderedBlock[]
    }

    if (msg.type === 'interactive') {
      const b = body as Record<string, unknown>
      if (b.interaction_type === 'user_choice') {
        return [{ type: 'user_choice', questions: (b.questions as Question[]) || [], tool_name: b.tool_name as string }] as RenderedBlock[]
      }
      if (b.interaction_type === 'permission') {
        return [{ type: 'permission', tool_name: b.tool_name as string, tool_input: b.tool_input as string, questions: undefined }] as RenderedBlock[]
      }
    }

    return []
  }, [message])

  useEffect(() => {
    if (userTextRef.current) {
      setTimeout(() => {
        if (userTextRef.current && userTextRef.current.scrollHeight > USER_MSG_MAX_HEIGHT) {
          setIsUserMsgOverflow(true)
        }
      }, 0)
    }
  }, [renderedBlocks])

  const handleUserMarkerClick = useCallback(() => {
    if (!userTextRef.current) return
    const range = document.createRange()
    range.selectNodeContents(userTextRef.current)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    setIsUserMsgSelected(true)
  }, [])

  function handleDelegatedClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    const btn = target.closest('.code-copy-btn')
    if (btn) {
      e.stopPropagation()
      const wrapper = btn.closest('.code-block-wrapper')
      if (!wrapper) return
      const code = wrapper.querySelector('pre code')
      if (!code) return
      navigator.clipboard.writeText(code.textContent || '').then(() => {
        btn.classList.add('copied')
        setTimeout(() => btn.classList.remove('copied'), 1500)
      }).catch(() => {})
      return
    }

    const fileLink = target.closest('.file-path-link')
    if (fileLink) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className={`message-item type-${message.type}`} onClick={handleDelegatedClick}>
      {renderedBlocks.map((block, i) => {
        if (block.type === 'user') {
          return (
            <div key={i} className={`msg-user ${isUserMsgSelected ? 'msg-user--selected' : ''}`}>
              <button className="user-marker" onClick={handleUserMarkerClick} title="Click to select message text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>
              <div className="user-content">
                <div
                  ref={userTextRef}
                  className={`user-text markdown-body ${isUserMsgOverflow && !isUserMsgExpanded ? 'user-text-collapsed' : ''}`}
                  dangerouslySetInnerHTML={{ __html: block.html || '' }}
                />
                {block.attachments && (block.attachments as Attachment[]).length > 0 && (
                  <div className="user-attachments">
                    {(block.attachments as Attachment[]).map((att: Attachment) => (
                      <a
                        key={att.id || att.filename}
                        className="user-attachment"
                        href={att.id ? `/api/attachments/${encodeURIComponent(att.id)}/download` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        title={att.filename || att.name || 'attachment'}
                      >
                        <span className="user-attachment-icon">FILE</span>
                        <span className="user-attachment-name">{att.filename || att.name || 'attachment'}</span>
                        <span className="user-attachment-size">{formatFileSize(att.size_bytes || att.size || 0)}</span>
                      </a>
                    ))}
                  </div>
                )}
                {isUserMsgOverflow && (
                  <button className="user-expand-btn" onClick={() => setIsUserMsgExpanded(!isUserMsgExpanded)}>
                    {isUserMsgExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          )
        }

        if (block.type === 'text') {
          return <AssistantBlock key={i} block={block as { html?: string }} />
        }
        if (block.type === 'thinking') {
          return <ThinkingBlock key={i} block={block as { thinking?: string }} />
        }
        if (block.type === 'todo_progress') {
          return <TodoProgressBlock key={i} todos={block.todos!} />
        }
        if (block.type === 'tool_use') {
          return <ToolUseBlock key={i} block={block as unknown as Record<string, unknown>} />
        }
        if (block.type === 'tool_result') {
          return <ToolResultBlock key={i} result={block as { content?: unknown; is_error?: boolean; tool_use_id?: string }} />
        }
        if (block.type === 'result') {
          return <ResultBlock key={i} result={block as { html?: string; meta?: { is_error?: boolean; duration_ms?: number; num_turns?: number; usage?: unknown } }} />
        }
        if (block.type === 'system') {
          return <SystemBlock key={i} content={block.text || ''} />
        }
        if (block.type === 'user_choice') {
          return (
              <UserChoiceBlock
              key={i}
              block={block as { questions?: Question[]; tool_name?: string }}
              answered={interactiveAnswered}
              onAnswer={(data) => onInteractiveResponse?.(data)}
            />
          )
        }
        if (block.type === 'permission') {
          return (
            <PermissionRequestBlock
              key={i}
              block={block as { tool_name?: string; tool_input?: string }}
              answered={interactiveAnswered}
              onRespond={(data) => onInteractiveResponse?.(data)}
            />
          )
        }
        return null
      })}
    </div>
  )
}
