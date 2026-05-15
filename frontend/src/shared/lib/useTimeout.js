import { onBeforeUnmount, getCurrentInstance } from 'vue'

export function useTimeout() {
  const timers = new Set()

  function set(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
    return id
  }

  function clear(id) {
    clearTimeout(id)
    timers.delete(id)
  }

  function clearAll() {
    timers.forEach(id => clearTimeout(id))
    timers.clear()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(clearAll)
  }

  return { set, clear, clearAll }
}
