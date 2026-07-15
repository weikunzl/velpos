export function formatRelativeTime(input: number | string | undefined | null): string {
  if (!input) return ''
  const ts = typeof input === 'number' ? input : new Date(input).getTime()
  const diffMs = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(ts).toLocaleDateString()
}

export function formatDuration(ms: number | undefined | null, fallback = ''): string {
  if (!ms) return fallback
  const s = (ms / 1000).toFixed(1)
  return `${s}s`
}

export function formatDurationLong(ms: number | undefined | null, fallback = ''): string {
  if (!ms) return fallback
  const secs = Math.floor(Math.max(0, ms) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = secs % 60
  if (mins < 60) return `${mins}m ${remainSecs}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}
