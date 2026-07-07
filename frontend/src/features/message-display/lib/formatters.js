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
  if (input == null || input === '') return ''
  if (typeof input !== 'object') return String(input)
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

export function formatToolValue(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  return formatInput(value)
}

function uriToPath(uri) {
  if (typeof uri !== 'string' || !uri) return ''
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri
}

function pathFromLocation(location) {
  if (!location || typeof location !== 'object') return ''
  return (
    location.path
    || location.file
    || location.filePath
    || location.file_path
    || location.relativePath
    || uriToPath(location.uri)
    || ''
  )
}

export function formatToolDisplayName(name) {
  const raw = String(name || '').trim()
  if (!raw) return 'tool'

  const mcpMatch = raw.match(/^mcp[_-](.+)$/i)
  if (mcpMatch) {
    return `MCP · ${mcpMatch[1].replace(/[_-]+/g, ' / ')}`
  }

  if (/^callmcptool$/i.test(raw)) return 'MCP · call'
  if (/^getmcptools$/i.test(raw)) return 'MCP · list tools'

  if (raw.toLowerCase().startsWith('mcp ')) {
    return raw
  }

  return raw
}

function mcpToolInputSummary(input) {
  if (!input || typeof input !== 'object') return ''
  const server = input.server || input.mcpServer || input.mcp_server
  const toolName = input.toolName || input.tool_name || input.name
  if (server && toolName) return `${server} · ${toolName}`
  if (server) return String(server)
  if (toolName) return String(toolName)
  return ''
}

export function toolInputSummary(input, block = null) {
  const mcpSummary = mcpToolInputSummary(input)
  if (mcpSummary) return mcpSummary

  if (input && typeof input === 'object') {
    const path = input.path || input.file || input.filePath || input.file_path || input.target
    if (path) return String(path)
    const pattern = input.pattern || input.query || input.regex || input.glob
    if (pattern) return String(pattern)
    const command = input.command
    if (command) {
      const text = String(command)
      return text.length > 80 ? `${text.slice(0, 77)}...` : text
    }
    if (input.value != null && input.value !== '') return String(input.value)
    const keys = Object.keys(input)
    if (keys.length === 1) return String(input[keys[0]])
  }

  const locations = block?.locations
  if (Array.isArray(locations) && locations.length > 0) {
    const path = pathFromLocation(locations[0])
    if (path) return path
  }

  return ''
}

export function toolBlockHasDetails(block) {
  if (!block || typeof block !== 'object') return false
  const input = block.input
  if (input && typeof input === 'object' && Object.keys(input).length > 0) return true
  if (block.output != null && block.output !== '') return true
  if (Array.isArray(block.locations) && block.locations.length > 0) return true
  return false
}
