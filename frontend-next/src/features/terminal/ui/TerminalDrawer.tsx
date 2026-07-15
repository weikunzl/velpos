'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalDrawerProps {
  open: boolean
  onClose: () => void
  projectDir?: string
  gitBranch?: string
  onHeightChange?: (height: number) => void
}

export function TerminalDrawer({ open, onClose, projectDir, gitBranch, onHeightChange }: TerminalDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closed'>('idle')
  const [height, setHeight] = useState(360)
  const dragRef = useRef(false)
  const location = gitBranch ? `${projectDir || '~'} (${gitBranch})` : (projectDir || '~')

  const terminalWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/terminal`
  }

  // Initialize terminal
  useEffect(() => {
    if (!open || !containerRef.current) return

    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#090d14',
        foreground: '#d6deeb',
        cursor: '#d6deeb',
      },
      convertEol: false,
      scrollback: 10000,
    })
    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Open terminal
    containerRef.current.innerHTML = ''
    xterm.open(containerRef.current)

    // Connect WebSocket
    setStatus('connecting')
    const ws = new WebSocket(terminalWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      fitAddon.fit()
      const cols = xterm.cols
      const rows = xterm.rows
      ws.send(JSON.stringify({ cwd: projectDir || null, cols, rows }))
    }

    ws.onmessage = (event) => {
      let msg: { event?: string; data?: string; terminal_id?: string; cwd?: string; shell?: string }
      try { msg = JSON.parse(event.data) } catch { return }

      if (msg.event === 'ready') {
        setStatus('connected')
        return
      }
      if (msg.event === 'output') {
        xterm.write(msg.data || '')
        return
      }
      if (msg.event === 'closed') {
        setStatus('closed')
      }
    }

    ws.onerror = () => setStatus('error')
    ws.onclose = () => {
      setStatus((s) => (s === 'error' ? 'error' : 'closed'))
      wsRef.current = null
    }

    // Handle resize
    const resizeHandler = () => {
      if (fitAddon && xterm.element) {
        fitAddon.fit()
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'resize', cols: xterm.cols, rows: xterm.rows }))
        }
      }
    }
    const ro = new ResizeObserver(resizeHandler)
    if (containerRef.current) ro.observe(containerRef.current)

    // Handle user input
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'input', data }))
      }
    })

    // Handle terminal resize
    xterm.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'resize', cols, rows }))
      }
    })

    return () => {
      ro.disconnect()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'close' }))
      }
      ws.close()
      xterm.dispose()
      wsRef.current = null
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [open, projectDir])

  // Height change callback
  useEffect(() => {
    onHeightChange?.(height)
  }, [height, onHeightChange])

  // Fit on each open toggle
  useEffect(() => {
    if (open && fitAddonRef.current && xtermRef.current?.element) {
      setTimeout(() => fitAddonRef.current?.fit(), 100)
    }
  }, [open])

  // Drag to resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = true
    const startY = e.clientY
    const startH = height

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const newH = startH - (ev.clientY - startY)
      setHeight(Math.max(120, Math.min(600, newH)))
    }
    const onUp = () => {
      dragRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      setTimeout(() => fitAddonRef.current?.fit(), 50)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [height])

  if (!open) return null

  return (
    <div className="terminal-drawer" style={{ height: `${height}px` }}>
      <div className="terminal-drag-handle" onMouseDown={handleMouseDown}>
        <div className="terminal-drag-bar" />
      </div>
      <div className="terminal-header">
        <div className="terminal-tabs">
          <div className="terminal-tab terminal-tab-active">
            <span>term 1</span>
          </div>
          <div className="terminal-location">{location}</div>
        </div>
        <div className="terminal-actions">
          <span className={`terminal-status status-${status}`}>{status}</span>
          <button className="terminal-close-btn" onClick={onClose} aria-label="Close terminal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="terminal-container" />
    </div>
  )
}
