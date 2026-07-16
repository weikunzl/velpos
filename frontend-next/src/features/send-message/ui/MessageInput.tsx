'use client'

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { sessionStore } from '@/entities/session'
import { useUserPreferences } from '@/shared/lib/useUserPreferences'
import { formatFileSize } from '@/shared/lib/textParsers'

export interface MessageInputHandle {
  setInput(text: string): void
  addImage(base64: string, mediaType: string): void
  appendText(text: string): void
  clearAttachments(): void
}

interface Attachment {
  name: string
  data: string
  mime_type: string
  size: number
  preview: string // data URL for images
}

interface SlashCommand {
  name: string
  description?: string
  icon?: string
}

interface MessageInputProps {
  sessionId: string
  disabled?: boolean
  running?: boolean
  slashCommands?: SlashCommand[]
  onSlashSelect?: (command: SlashCommand) => void
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput(
  { sessionId, disabled = false, running = false, slashCommands = [], onSlashSelect },
  ref,
) {
  const { shouldEnterSend, shouldCtrlEnterSend } = useUserPreferences()

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [compositionEndedRecently, setCompositionEndedRecently] = useState(false)
  const [caretIndex, setCaretIndex] = useState(0)
  const [slashActiveIndex, setSlashActiveIndex] = useState(0)
  const [slashQuery, setSlashQuery] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slashListRef = useRef<HTMLDivElement>(null)
  const compositionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter slash suggestions based on current query
  const slashSuggestions = slashCommands.filter((cmd) => {
    if (!slashQuery) return true
    return cmd.name.toLowerCase().includes(slashQuery.toLowerCase())
  })

  const slashSuggestVisible = !disabled && !isComposing && slashQuery !== null && slashSuggestions.length > 0

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
    }
  }, [text])

  // Cleanup composition timer
  useEffect(() => {
    return () => {
      if (compositionEndTimerRef.current) clearTimeout(compositionEndTimerRef.current)
    }
  }, [])

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    setInput(value: string) {
      setText(value)
    },
    addImage(base64: string, mediaType: string) {
      const preview = `data:${mediaType};base64,${base64}`
      setAttachments((prev) => [
        ...prev,
        { name: `image-${Date.now()}.png`, data: base64, mime_type: mediaType, size: 0, preview },
      ])
    },
    appendText(value: string) {
      setText((prev) => prev + value)
    },
    clearAttachments() {
      setAttachments([])
    },
  }))

  // Dynamic placeholder
  const placeholderText = (() => {
    if (disabled) return 'Waiting for Claude to finish...'
    if (running) return 'Send follow-up (queued until Claude finishes)...'
    const sendShortcut = shouldEnterSend() ? 'Enter' : 'Ctrl+Enter'
    const newLineShortcut = shouldEnterSend() ? 'Ctrl+Enter' : 'Enter'
    return `Send a message... (${sendShortcut} to send, ${newLineShortcut} for new line, type / for skills)`
  })()

  const sendButtonTitle = (() => {
    const sendShortcut = shouldEnterSend() ? 'Enter' : 'Ctrl+Enter'
    return `Send message (${sendShortcut})`
  })()

  function syncSlashContext(currentText: string, pos: number) {
    // Check if cursor is in a slash command context: "/" followed by text at word start
    const beforeCursor = currentText.slice(0, pos)
    const slashIndex = beforeCursor.lastIndexOf('/')
    if (slashIndex === -1) {
      setSlashQuery(null)
      return
    }
    // Only trigger if the "/" is at word start (preceded by space or start of string)
    if (slashIndex > 0 && beforeCursor[slashIndex - 1] !== ' ' && beforeCursor[slashIndex - 1] !== '\n') {
      setSlashQuery(null)
      return
    }
    const query = beforeCursor.slice(slashIndex + 1)
    // Only show if query doesn't contain spaces (single word after /)
    if (query.includes(' ')) {
      setSlashQuery(null)
      return
    }
    setSlashQuery(query || '')
    setSlashActiveIndex(0)
  }

  function applySlashSelection(command: SlashCommand) {
    if (!slashQuery) return
    // Replace "/query" with the command name
    const beforeCursor = text.slice(0, caretIndex)
    const slashIndex = beforeCursor.lastIndexOf('/')
    const afterCursor = text.slice(caretIndex)
    const newText = beforeCursor.slice(0, slashIndex) + `/${command.name} ` + afterCursor
    setText(newText)
    setSlashQuery(null)
    setSlashActiveIndex(0)
    onSlashSelect?.(command)
    // Focus back to textarea
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        const pos = slashIndex + command.name.length + 2
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  function scrollSlashActiveIntoView() {
    const container = slashListRef.current
    if (!container) return
    const items = container.querySelectorAll('.slash-item')
    const el = items[slashActiveIndex] as HTMLElement | undefined
    if (el) el.scrollIntoView({ block: 'nearest' })
  }

  const sendMessage = useCallback(
    async (promptText: string) => {
      if ((!promptText.trim() && attachments.length === 0) || sending || disabled) return
      setSending(true)
      try {
        const ws = sessionStore.getWsConnection(sessionId)
        if (ws) {
          if (attachments.length > 0) {
            ws.send({
              action: 'send_prompt',
              prompt: promptText.trim() || 'Please review the attached files.',
              attachments: attachments.map((a) => ({
                name: a.name,
                mime_type: a.mime_type,
                size: a.size,
                data: a.data,
              })),
            })
          } else {
            ws.send({ action: 'send_prompt', prompt: promptText.trim() })
          }
          setText('')
          setAttachments([])
        }
      } finally {
        setSending(false)
      }
    },
    [sessionId, sending, disabled, attachments],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (slashSuggestVisible) {
      const len = slashSuggestions.length
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashActiveIndex((prev) => (prev + 1) % len)
        setTimeout(scrollSlashActiveIntoView, 0)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashActiveIndex((prev) => (prev - 1 + len) % len)
        setTimeout(scrollSlashActiveIntoView, 0)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applySlashSelection(slashSuggestions[slashActiveIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashQuery(null)
        return
      }
    }

    if (e.key === 'Enter') {
      // During or just after IME composition, defer to browser default
      if (isComposing || compositionEndedRecently) return

      const hasCtrl = e.ctrlKey
      const hasCmd = e.metaKey
      const hasModifier = hasCtrl || hasCmd

      if (shouldEnterSend() && !hasModifier) {
        // Mode 1: Enter sends, Ctrl/Cmd+Enter inserts new line
        e.preventDefault()
        sendMessage(text)
      } else if (shouldCtrlEnterSend() && hasModifier) {
        // Mode 2: Ctrl/Cmd+Enter sends, Enter inserts new line
        e.preventDefault()
        sendMessage(text)
      } else if (hasModifier) {
        // Ctrl/Cmd+Enter but current mode doesn't send -> insert newline
        e.preventDefault()
        const ta = textareaRef.current
        if (ta) {
          const start = ta.selectionStart
          const end = ta.selectionEnd
          const newValue = text.slice(0, start) + '\n' + text.slice(end)
          setText(newValue)
          setTimeout(() => {
            ta.selectionStart = ta.selectionEnd = start + 1
          }, 0)
        }
      }
      // Otherwise: let browser default handle it (Enter in non-enter-send mode)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
  }

  function handleSelect() {
    const ta = textareaRef.current
    if (ta) {
      setCaretIndex(ta.selectionStart)
      syncSlashContext(ta.value, ta.selectionStart)
    }
  }

  function handleCompositionStart() {
    setIsComposing(true)
  }

  function handleCompositionEnd() {
    setIsComposing(false)
    // Mark that composition just ended, prevent Enter keydown from firing send
    setCompositionEndedRecently(true)
    if (compositionEndTimerRef.current) clearTimeout(compositionEndTimerRef.current)
    compositionEndTimerRef.current = setTimeout(() => {
      setCompositionEndedRecently(false)
    }, 50)
  }

  // ── File attachment handlers ──

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          addFile(file)
          return
        }
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = e.dataTransfer?.files
    if (!files) return
    for (const file of Array.from(files)) {
      addFile(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      addFile(file)
    }
    e.target.value = ''
  }

  function addFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      const isImage = file.type?.startsWith('image/')
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name || 'attachment',
          data: base64,
          mime_type: file.type || 'application/octet-stream',
          size: file.size || 0,
          preview: isImage ? dataUrl : '',
        },
      ])
    }
    reader.readAsDataURL(file)
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  return (
    <div className="input-area" onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="attachment-previews">
          {attachments.map((att, index) => (
            <div key={index} className="attachment-item">
              {att.preview ? (
                <div className="attachment-thumb-wrap">
                  <img src={att.preview} alt={att.name} className="attachment-thumb" />
                  <span className="attachment-thumb-name">{att.name}</span>
                </div>
              ) : (
                <div className="attachment-file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="attachment-file-name">{att.name}</span>
                  <span className="attachment-file-size">{formatFileSize(att.size)}</span>
                </div>
              )}
              <button
                className="attachment-remove"
                onClick={() => removeAttachment(index)}
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Slash command suggestions */}
      {slashSuggestVisible && (
        <div className="slash-suggestions" ref={slashListRef}>
          {slashSuggestions.map((cmd, index) => (
            <div
              key={cmd.name}
              className={`slash-item ${index === slashActiveIndex ? 'slash-item-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                applySlashSelection(cmd)
              }}
            >
              <span className="slash-item-name">{cmd.icon || '/'}{cmd.name}</span>
              {cmd.description && <span className="slash-item-desc">{cmd.description}</span>}
            </div>
          ))}
        </div>
      )}

      <textarea
          ref={textareaRef}
          className="input-field"
          placeholder={placeholderText}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onPaste={handlePaste}
          disabled={disabled}
          rows={1}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="input-actions">
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            onChange={handleFileSelect}
            multiple
            aria-hidden="true"
          />

          <button
            type="button"
            className="attach-btn"
            onClick={openFilePicker}
            disabled={disabled}
            title="Attach files"
            aria-label="Attach files"
          >
            +
          </button>

          <button
            type="button"
            className="send-btn"
            disabled={(!text.trim() && attachments.length === 0) || disabled || sending}
            onClick={() => sendMessage(text)}
            title={sendButtonTitle}
            aria-label={sendButtonTitle}
          >
            {sending ? (
              <span className="runtime-spinner" style={{ borderColor: 'var(--text-on-accent)', borderTopColor: 'transparent' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
    </div>
  )
})
