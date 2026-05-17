import { reactive, onUnmounted } from 'vue'
import { useGlobalHotkeys } from './useGlobalHotkeys'

const dialogs = reactive(new Map())

export function useDialogManager() {
  function registerDialog(key, ref) {
    dialogs.set(key, ref)
  }

  function unregisterDialog(key) {
    dialogs.delete(key)
  }

  function closeTopmostDialog() {
    // 按照注册顺序的倒序检查，优先关闭最后打开的弹窗
    const keys = Array.from(dialogs.keys()).reverse()
    for (const key of keys) {
      const ref = dialogs.get(key)
      if (ref && ref.value === true) {
        ref.value = false
        return true
      }
    }
    return false
  }

  function hasOpenDialogs() {
    for (const [key, ref] of dialogs.entries()) {
      if (ref && ref.value === true) {
        return true
      }
    }
    return false
  }

  // 自动清理的注册函数
  function useDialog(key, ref) {
    registerDialog(key, ref)
    onUnmounted(() => {
      unregisterDialog(key)
    })
  }

  return {
    registerDialog,
    unregisterDialog,
    closeTopmostDialog,
    hasOpenDialogs,
    useDialog,
    dialogs
  }
}

export function useVisibleProxy(props, emit, event = 'close') {
  return {
    get value() { return props.visible },
    set value(v) { if (!v) emit(event) },
  }
}

export function useEscapeToClose(isVisible, close, priority = 100) {
  useGlobalHotkeys({
    keys: 'Escape',
    handler: () => {
      if (isVisible()) {
        close()
        return false
      }
      return true
    },
    priority,
  })
}