'use client'

import { useEffect, useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

interface AppToastProps {
  toast: Toast | null
  onDismiss: (id: string) => void
}

export function AppToast({ toast, onDismiss }: AppToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) {
      setVisible(false)
      return
    }

    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))

    const dur = toast.duration ?? 3000
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, dur)

    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  if (!toast) return null

  const iconMap = {
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
    ),
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
    ),
  }

  return (
    <div className={`app-toast ${visible ? 'app-toast-visible' : ''} app-toast-${toast.type}`}>
      <span className="app-toast-icon">{iconMap[toast.type]}</span>
      <span className="app-toast-message">{toast.message}</span>
    </div>
  )
}

// ── Hook for managing toast state ──

let _toastId = 0
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback((message: string, type: Toast['type'] = 'info', duration?: number) => {
    _toastId++
    setToast({ id: String(_toastId), message, type, duration })
  }, [])

  const dismiss = useCallback((id: string) => {
    setToast((prev) => (prev?.id === id ? null : prev))
  }, [])

  return { toast, show, dismiss }
}
