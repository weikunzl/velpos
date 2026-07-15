'use client'

import { useState, useCallback } from 'react'

interface CaptureResult {
  data: string
  media_type: string
  preview: string
}

export function useVideoInput() {
  const [isCapturing, setIsCapturing] = useState(false)
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  let streamRef: MediaStream | null = null

  const startCapture = useCallback(async (): Promise<MediaStream | null> => {
    if (!supported) return null
    stopCapture()
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef = s
      setIsCapturing(true)
      return s
    } catch {
      setIsCapturing(false)
      return null
    }
  }, [supported])

  const stopCapture = useCallback(() => {
    if (streamRef) {
      streamRef.getTracks().forEach(t => t.stop())
      streamRef = null
    }
    setIsCapturing(false)
  }, [])

  const captureFrame = useCallback((videoEl: HTMLVideoElement | null): CaptureResult | null => {
    if (!videoEl) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth
    canvas.height = videoEl.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(videoEl, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.split(',')[1]
    return { data: base64, media_type: 'image/png', preview: dataUrl }
  }, [])

  return { isCapturing, supported, startCapture, stopCapture, captureFrame }
}
