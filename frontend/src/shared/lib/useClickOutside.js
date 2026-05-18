import { onMounted, onBeforeUnmount } from 'vue'

export function useClickOutside(elementRef, callback, options = {}) {
  const { event = 'mousedown' } = options

  function handler(e) {
    const el = elementRef.value
    if (!el || el.contains(e.target)) return
    callback(e)
  }

  onMounted(() => {
    document.addEventListener(event, handler, true)
  })

  onBeforeUnmount(() => {
    document.removeEventListener(event, handler, true)
  })
}
