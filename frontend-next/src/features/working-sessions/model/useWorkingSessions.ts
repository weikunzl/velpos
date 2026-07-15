'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'

interface WorkingSessionInfo {
  sessionName: string
  projectName: string
  startTime: number
}

interface WorkingSessionEntry extends WorkingSessionInfo {
  sessionId: string
}

// Module-level singleton state
type WorkingMap = Record<string, WorkingSessionInfo>
let working: WorkingMap = {}
let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function getSnapshot() {
  return working
}

function emitChange() {
  for (const l of listeners) l()
}

export function markWorking(
  sessionId: string,
  info: { sessionName?: string; projectName?: string } = {},
) {
  if (working[sessionId]) return // already tracked
  working = {
    ...working,
    [sessionId]: {
      sessionName: info.sessionName || '',
      projectName: info.projectName || '',
      startTime: Date.now(),
    },
  }
  emitChange()
}

export function markDone(sessionId: string) {
  if (!working[sessionId]) return
  const next = { ...working }
  delete next[sessionId]
  working = next
  emitChange()
}

export function useWorkingSessions() {
  const data = useSyncExternalStore(subscribe, () => working)

  const entries = Object.entries(data).map(([sessionId, info]) => ({
    sessionId,
    ...info,
  }))

  const workingCount = entries.length

  return { workingCount, workingList: entries }
}
