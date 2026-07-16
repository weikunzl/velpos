'use client'

import { sessionStore } from '@/entities/session'
import { useCallback } from 'react'

interface Attachment {
  name: string
  mime_type: string
  size: number
}

interface SendPromptData {
  text?: string
  images?: string[]
  attachments?: Attachment[]
}

export function useSendMessage(sessionId: string | null) {
  const sendPrompt = useCallback(
    (promptOrData: string | SendPromptData) => {
      if (!sessionId) return

      const ws = sessionStore.getWsConnection(sessionId)
      if (!ws || ws.getReadyState() !== WebSocket.OPEN) {
        sessionStore.setErrorFor(sessionId, 'Not connected')
        return
      }

      let text = ''
      let images: string[] | null = null
      let attachments: Attachment[] | null = null

      if (typeof promptOrData === 'string') {
        text = promptOrData.trim()
      } else if (promptOrData && typeof promptOrData === 'object') {
        text = (promptOrData.text || '').trim()
        images = promptOrData.images || null
        attachments = promptOrData.attachments || null
      }

      if (!text && (!images || images.length === 0) && (!attachments || attachments.length === 0)) {
        return
      }

      sessionStore.setErrorFor(sessionId, '')

      const payload: Record<string, unknown> = { action: 'send_prompt', prompt: text }
      if (images && images.length > 0) {
        payload.images = images
      }
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments
      }
      const sent = ws.send(payload)
      if (!sent) {
        sessionStore.setErrorFor(sessionId, 'Connection lost, message not sent')
        return
      }

      sessionStore.addMessageTo(sessionId, {
        type: 'user',
        content: {
          text,
          ...(images && images.length > 0 ? { image_count: images.length } : {}),
          ...(attachments && attachments.length > 0
            ? {
                attachments: attachments.map((item) => ({
                  filename: item.name,
                  mime_type: item.mime_type,
                  size_bytes: item.size || 0,
                })),
              }
            : {}),
        },
        timestamp: Date.now(),
      })
    },
    [sessionId],
  )

  return { sendPrompt }
}
