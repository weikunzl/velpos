'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Message } from '@/shared/types/api'

export interface RewindItem {
  key: string
  index: number
  label: string
  text: string
  messageId?: string
}

interface RewindPickerProps {
  open: boolean
  items: RewindItem[]
  onRewindTo: (item: RewindItem) => void
  onClose: () => void
}

export function RewindPicker({ open, items, onRewindTo, onClose }: RewindPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const filteredItems = searchQuery
    ? items.filter((item) => item.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setActiveIndex(0)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open])

  // Focus picker for keyboard events
  useEffect(() => {
    if (open) {
      pickerRef.current?.focus()
    }
  }, [open])

  const handleRewindTo = useCallback(
    (item: RewindItem) => {
      onRewindTo(item)
      onClose()
    },
    [onRewindTo, onClose],
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (filteredItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleRewindTo(filteredItems[activeIndex])
    }
  }

  if (!open) return null

  return (
    <div className="rewind-overlay" onClick={onClose}>
      <div
        ref={pickerRef}
        className="rewind-picker"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rewind-header">
          <div>
            <div className="rewind-title">Rewind to previous input</div>
            <div className="rewind-subtitle">
              Select a message to rewind — removes that input and all subsequent context
            </div>
          </div>
          <button className="rewind-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="rewind-search-wrapper">
          <svg className="rewind-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            className="rewind-search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(0) }}
            placeholder="Search history..."
          />
        </div>
        <div className="rewind-list">
          {filteredItems.map((item, index) => (
            <button
              key={item.key}
              className={`rewind-item ${index === activeIndex ? 'rewind-item--active' : ''}`}
              onClick={() => handleRewindTo(item)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="rewind-item-meta">
                <span className="rewind-item-label">{item.label}</span>
                <span className="rewind-item-type">user input</span>
              </span>
              <span className="rewind-item-text">{item.text || '(empty input)'}</span>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="rewind-empty">
              {searchQuery ? 'No matching history' : 'No rewindable inputs'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
