export function formatDuration(ms, fallback = '') {
  if (!ms) return fallback
  const s = (ms / 1000).toFixed(1)
  return `${s}s`
}

export function formatDurationLong(ms, fallback = '') {
  if (!ms) return fallback
  const secs = Math.floor(Math.max(0, ms) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = secs % 60
  if (mins < 60) return `${mins}m ${remainSecs}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

export function formatInput(input) {
  if (!input || typeof input !== 'object') return ''
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

export function toolInputSummary(input) {
  if (!input || typeof input !== 'object') return ''
  const path = input.path || input.file || input.filePath || input.file_path
  if (path) return String(path)
  const pattern = input.pattern || input.query || input.regex || input.glob
  if (pattern) return String(pattern)
  const command = input.command
  if (command) {
    const text = String(command)
    return text.length > 80 ? `${text.slice(0, 77)}...` : text
  }
  const keys = Object.keys(input)
  if (keys.length === 1) return String(input[keys[0]])
  return ''
}
