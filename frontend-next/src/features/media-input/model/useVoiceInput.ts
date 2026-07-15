'use client'

import { useState, useCallback, useRef } from 'react'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: Array<Array<{ transcript: string }> & { isFinal: boolean }>
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false)
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = useCallback((onResult?: (text: string) => void) => {
    if (!supported) return
    stopRecording()

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          if (onResult) onResult(t)
        }
      }
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }, [supported])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }, [])

  const toggle = useCallback((onResult?: (text: string) => void) => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording(onResult)
    }
  }, [isRecording, startRecording, stopRecording])

  return { isRecording, supported, stopRecording, toggle }
}
