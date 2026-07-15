'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { CommandItem } from '../api/commandApi'
import type { PolicyRow } from '../model/useCommandPalette'

interface Props {
  visible: boolean
  commands: CommandItem[]
  policyRows: PolicyRow[]
  loading: boolean
  searchQuery: string
  onSelect: (cmd: CommandItem) => void
  onClose: () => void
  onSearchQueryChange: (q: string) => void
  onPolicyChange?: (row: PolicyRow, patch: Record<string, unknown>) => void
}

type TabKey = 'all' | 'skill' | 'command' | 'mcp'

export function CommandPalettePopover({
  visible,
  commands,
  policyRows,
  loading,
  searchQuery,
  onSelect,
  onClose,
  onSearchQueryChange,
  onPolicyChange,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [manageMode, setManageMode] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const tabs = useMemo(() => {
    const items: { key: TabKey; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'skill', label: 'Skills' },
      { key: 'command', label: 'Commands' },
    ]
    if (commands.some((cmd) => cmd.type === 'mcp')) {
      items.push({ key: 'mcp', label: 'MCP' })
    }
    return items
  }, [commands])

  const filteredCommands = useMemo(() => {
    let list: CommandItem[] = commands
    if (activeTab !== 'all') {
      list = commands.filter((c) => c.type === activeTab)
    }
    const q = searchQuery.toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    )
  }, [commands, searchQuery, activeTab])

  const filteredPolicyRows = useMemo(() => {
    let list: PolicyRow[] = policyRows
    if (activeTab !== 'all') {
      list = policyRows.filter((row) => row.command_type === activeTab)
    }
    const q = searchQuery.toLowerCase()
    if (!q) return list
    return list.filter(
      (row) =>
        row.command_name.toLowerCase().includes(q) ||
        (row.description || '').toLowerCase().includes(q)
    )
  }, [policyRows, searchQuery, activeTab])

  // Reset index when filtered list changes
  useEffect(() => {
    setActiveIndex(0)
  }, [filteredCommands.length])

  // Focus search input when opened
  useEffect(() => {
    if (visible && searchRef.current) {
      searchRef.current.focus()
    }
  }, [visible])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onClose])

  // Close on click outside
  useEffect(() => {
    if (!visible) return
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid immediate close on trigger click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible, onClose])

  const scrollActiveIntoView = useCallback(() => {
    const container = listRef.current
    if (!container) return
    const items = container.querySelectorAll('.cmd-item')
    const el = items[activeIndex]
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent) {
    const len = manageMode ? 0 : filteredCommands.length
    if (!len && e.key !== 'Escape') return

    const hasModifiers = e.ctrlKey || e.metaKey
    if (hasModifiers) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % len)
      requestAnimationFrame(() => scrollActiveIntoView())
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + len) % len)
      requestAnimationFrame(() => scrollActiveIntoView())
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filteredCommands[activeIndex]
      if (item && item.type !== 'mcp') {
        selectItem(item)
      }
    }
  }

  function commandLabel(cmd: CommandItem) {
    if (cmd.type === 'mcp') return cmd.name
    return `/${cmd.name}`
  }

  function commandTag(cmd: CommandItem) {
    if (cmd.type === 'skill') return 'skill'
    if (cmd.type === 'mcp') return 'mcp'
    return 'built-in'
  }

  function commandTagClass(cmd: CommandItem) {
    if (cmd.type === 'skill') return 'cmd-tag--prompt'
    if (cmd.type === 'mcp') return 'cmd-tag--mcp'
    return 'cmd-tag--local'
  }

  function selectItem(cmd: CommandItem) {
    if (cmd?.type === 'mcp') return
    if (cmd) {
      onSelect(cmd)
    }
  }

  if (!visible) return null

  return (
    <div
      ref={popoverRef}
      className="cmd-popover"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Command palette"
    >
      {/* Tabs */}
      <div className="cmd-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`cmd-tab${activeTab === tab.key ? ' cmd-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="cmd-search-wrap">
        <svg className="cmd-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          className="cmd-search"
          type="text"
          placeholder="Search commands..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Loading */}
      {loading && <div className="cmd-loading">Loading...</div>}

      {/* Command List */}
      {!manageMode && (
        <div ref={listRef} className="cmd-list">
          {filteredCommands.length === 0 && !loading && (
            <div className="cmd-empty">No matching commands</div>
          )}
          {filteredCommands.map((cmd, idx) => (
            <div
              key={`${cmd.name}:${cmd.type}`}
              className={`cmd-item${idx === activeIndex ? ' cmd-item--active' : ''}`}
              onClick={() => selectItem(cmd)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className="cmd-item-name">{commandLabel(cmd)}</span>
              <span className={`cmd-tag ${commandTagClass(cmd)}`}>{commandTag(cmd)}</span>
              {cmd.description && (
                <span className="cmd-item-desc">{cmd.description}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Policy Manage Mode */}
      {manageMode && (
        <div className="cmd-list cmd-policy-list">
          {filteredPolicyRows.map((row) => (
            <div key={`${row.command_name}:${row.command_type}`} className="cmd-policy-row">
              <span className="cmd-policy-name">/{row.command_name}</span>
              <label className="cmd-policy-toggle">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={() => onPolicyChange?.(row, { enabled: !row.enabled })}
                />
                Enabled
              </label>
              <label className="cmd-policy-toggle">
                <input
                  type="checkbox"
                  checked={row.visible}
                  onChange={() => onPolicyChange?.(row, { visible: !row.visible })}
                />
                Visible
              </label>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .cmd-popover {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          margin-bottom: 8px;
          background: var(--bg-secondary);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-glass);
          max-height: 360px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 100;
          backdrop-filter: blur(16px) saturate(140%);
        }
        .cmd-tabs {
          display: flex;
          gap: 4px;
          padding: 8px 12px 0;
          flex-shrink: 0;
        }
        .cmd-tab {
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: color var(--transition-fast), background var(--transition-fast);
        }
        .cmd-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
        .cmd-tab--active { color: var(--accent); background: var(--accent-dim); }
        .cmd-search-wrap {
          position: relative;
          margin: 8px 12px;
          flex-shrink: 0;
        }
        .cmd-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .cmd-search {
          width: 100%;
          height: 32px;
          padding: 0 10px 0 32px;
          background: var(--bg-input);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .cmd-search:focus { border-color: var(--accent); }
        .cmd-loading {
          padding: 12px;
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
        }
        .cmd-list {
          overflow-y: auto;
          flex: 1;
          padding: 4px 8px 8px;
        }
        .cmd-empty {
          padding: 24px 0;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }
        .cmd-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background var(--transition-fast);
        }
        .cmd-item:hover,
        .cmd-item--active { background: var(--bg-hover); }
        .cmd-item-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .cmd-item-desc {
          font-size: 11px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .cmd-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .cmd-tag--local { background: var(--layer-active); color: var(--text-secondary); }
        .cmd-tag--prompt { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
        .cmd-tag--mcp { background: color-mix(in srgb, #a855f7 15%, transparent); color: #a855f7; }
        .cmd-policy-list { padding: 4px 8px 8px; }
        .cmd-policy-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 10px;
          border-radius: var(--radius-md);
        }
        .cmd-policy-name { font-size: 13px; font-weight: 500; color: var(--text-primary); min-width: 120px; }
        .cmd-policy-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .cmd-policy-toggle input { cursor: pointer; }
      `}</style>
    </div>
  )
}
