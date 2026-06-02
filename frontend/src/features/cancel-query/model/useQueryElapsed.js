import { ref, watch, onBeforeUnmount, unref } from 'vue'
import { formatDurationLong } from '@features/message-display'

export function useQueryElapsed(startTimeSource, activeSource) {
  const elapsedLabel = ref('')
  let timer = null

  function resolveStartTime() {
    const value = typeof startTimeSource === 'function'
      ? startTimeSource()
      : unref(startTimeSource)
    return typeof value === 'number' && value > 0 ? value : null
  }

  function resolveActive() {
    const value = typeof activeSource === 'function'
      ? activeSource()
      : unref(activeSource)
    return Boolean(value)
  }

  function tick() {
    const start = resolveStartTime()
    if (!resolveActive() || start == null) {
      elapsedLabel.value = ''
      return
    }
    elapsedLabel.value = formatDurationLong(Date.now() - start)
  }

  function stopTimer() {
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  function startTimer() {
    stopTimer()
    tick()
    timer = setInterval(tick, 1000)
  }

  watch(
    () => [resolveStartTime(), resolveActive()],
    ([start, active]) => {
      if (active && start != null) {
        startTimer()
      } else {
        stopTimer()
        elapsedLabel.value = ''
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(stopTimer)

  return { elapsedLabel }
}
