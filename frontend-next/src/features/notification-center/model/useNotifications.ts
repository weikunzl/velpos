'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'

interface Notification {
  id: number
  sessionId: string
  sessionName: string
  projectName: string
  type: 'completed' | 'auth_required'
  timestamp: number
  read: boolean
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000

// Module-level singleton state
let notifications: Notification[] = []
let nextId = 1
let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function getSnapshot() {
  return notifications
}

function emitChange() {
  for (const l of listeners) l()
}

export function addNotification({
  sessionId,
  sessionName,
  projectName,
  type = 'completed',
}: {
  sessionId: string
  sessionName?: string
  projectName?: string
  type?: 'completed' | 'auth_required'
}) {
  clearExpired()
  const cutoff = Date.now() - HALF_DAY_MS
  notifications = notifications.filter(n => n.timestamp > cutoff)
  notifications = [
    {
      id: nextId++,
      sessionId,
      sessionName: sessionName || 'Unnamed session',
      projectName: projectName || '',
      type,
      timestamp: Date.now(),
      read: false,
    },
    ...notifications,
  ]
  emitChange()
}

function clearExpired() {
  const cutoff = Date.now() - HALF_DAY_MS
  notifications = notifications.filter(n => n.timestamp > cutoff)
}

export function useNotifications() {
  const items = useSyncExternalStore(subscribe, () => notifications)

  const unreadCount = items.filter(n => !n.read).length

  const markAsRead = useCallback((id: number) => {
    notifications = notifications.map(n => (n.id === id ? { ...n, read: true } : n))
    emitChange()
  }, [])

  const markAllAsRead = useCallback(() => {
    notifications = notifications.map(n => ({ ...n, read: true }))
    emitChange()
  }, [])

  return { notifications: items, unreadCount, markAsRead, markAllAsRead }
}
