import { ref } from 'vue'

const toast = ref(null)
let dismissTimer = null

export function useAppToast() {
  function showToast(message, type = 'error', duration = 4000) {
    if (!message) return
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
    toast.value = { message, type }
    dismissTimer = setTimeout(() => {
      toast.value = null
      dismissTimer = null
    }, duration)
  }

  function dismissToast() {
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
    toast.value = null
  }

  return {
    toast,
    showToast,
    dismissToast,
  }
}
