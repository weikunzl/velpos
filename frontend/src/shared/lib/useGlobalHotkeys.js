import { onMounted, onBeforeUnmount, reactive } from 'vue'

const hotkeyRegistry = reactive(new Map())
let _listenerRefCount = 0

/**
 * Normalize key combination to a standardized string
 */
function normalizeKeyCombo(event) {
  const parts = []

  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Cmd')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')

  // Handle special keys
  const specialKeys = [
    'Escape', 'Enter', 'Tab', 'Backspace', 'Delete',
    'Insert', 'Home', 'End', 'PageUp', 'PageDown',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ]

  if (specialKeys.includes(event.key)) {
    parts.push(event.key)
  } else if (event.key.length === 1) {
    // Regular character key
    parts.push(event.key.toUpperCase())
  }

  return parts.join('+')
}

function generateHotkeyId() {
  return `hotkey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Normalize hotkey string to standard format and sort modifier order
 */
function normalizeHotkeyString(key) {
  const parts = key.split('+').map(p => p.trim())
  const modifiers = []
  let mainKey = ''
  const modOrder = { 'ctrl': 0, 'cmd': 1, 'meta': 1, 'shift': 2, 'alt': 3, 'option': 3 }
  const modNames = { 'ctrl': 'Ctrl', 'cmd': 'Cmd', 'meta': 'Cmd', 'shift': 'Shift', 'alt': 'Alt', 'option': 'Alt' }

  for (const p of parts) {
    const lower = p.toLowerCase()
    if (lower in modOrder) {
      modifiers.push({ order: modOrder[lower], name: modNames[lower] })
    } else {
      mainKey = p.length === 1 ? p.toUpperCase() : p
    }
  }

  modifiers.sort((a, b) => a.order - b.order)
  const seen = new Set()
  const uniqueMods = modifiers.filter(m => {
    if (seen.has(m.name)) return false
    seen.add(m.name)
    return true
  })

  return [...uniqueMods.map(m => m.name), mainKey].filter(Boolean).join('+')
}

function handleGlobalKeydown(event) {
  const combo = normalizeKeyCombo(event)

  // Find all handlers for this key combination
  const handlers = hotkeyRegistry.get(combo)
  if (!handlers || handlers.length === 0) return

  // Sort by priority (higher priority first)
  const sortedHandlers = [...handlers].sort((a, b) => b.priority - a.priority)

  // Execute handlers and check if any wants to handle the event
  let hasHandler = false
  for (const handler of sortedHandlers) {
    const result = handler.callback(event)
    // If callback returns anything other than true, it means the handler processed the event
    if (result !== true) {
      hasHandler = true
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation() // 阻止其他同级别监听器（包括原生DOM事件）
      break
    }
    // If callback returns true, the handler explicitly wants to ignore this event
    // Continue to next handler or let the event pass through
  }

  // If no handler processed the event, let it continue naturally
  // without any intervention from the global hotkey system
  if (!hasHandler) {
    // Don't prevent default or stop propagation - let the event continue
    return
  }
}

export function useGlobalHotkeys({ keys, handler, priority = 0, condition = null }) {
  let keyList = Array.isArray(keys) ? keys : [keys]
  const handlerIds = []

  const registerHandler = () => {
    for (const key of keyList) {
      const normalizedKey = normalizeHotkeyString(key)

      if (!hotkeyRegistry.has(normalizedKey)) {
        hotkeyRegistry.set(normalizedKey, [])
      }

      const handlerId = generateHotkeyId()
      hotkeyRegistry.get(normalizedKey).push({
        id: handlerId,
        callback: (event) => {
          if (condition && !condition()) {
            return true
          }
          return handler(event)
        },
        priority,
      })

      handlerIds.push({ key: normalizedKey, id: handlerId })
    }
  }

  const unregisterHandler = () => {
    for (const { key, id } of handlerIds) {
      const handlers = hotkeyRegistry.get(key)
      if (handlers) {
        const index = handlers.findIndex(h => h.id === id)
        if (index !== -1) {
          handlers.splice(index, 1)
        }
        // Clean up empty arrays
        if (handlers.length === 0) {
          hotkeyRegistry.delete(key)
        }
      }
    }
  }

  onMounted(() => {
    if (_listenerRefCount++ === 0) {
      window.addEventListener('keydown', handleGlobalKeydown)
    }
    registerHandler()
  })

  onBeforeUnmount(() => {
    unregisterHandler()
    if (--_listenerRefCount === 0) {
      window.removeEventListener('keydown', handleGlobalKeydown)
    }
  })

  return {
    unregister: unregisterHandler,
    reregister: (newKeys) => {
      unregisterHandler()
      keyList = Array.isArray(newKeys) ? newKeys : [newKeys]
      registerHandler()
    },
  }
}

