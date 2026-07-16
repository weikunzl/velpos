export function formatInput(input: unknown): string {
  if (input == null || input === '') return ''
  if (typeof input !== 'object') return String(input)
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return String(input)
  }
}

export function formatToolValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  return formatInput(value)
}

function uriToPath(uri: string): string {
  if (!uri) return ''
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri
}

function pathFromLocation(location: Record<string, unknown> | null | undefined): string {
  if (!location || typeof location !== 'object') return ''
  return (
    (location.path as string) ||
    (location.file as string) ||
    (location.filePath as string) ||
    (location.file_path as string) ||
    (location.relativePath as string) ||
    uriToPath((location.uri as string) || '') ||
    ''
  )
}

export function formatToolDisplayName(name: string): string {
  const raw = String(name || '').trim()
  if (!raw) return 'tool'

  const mcpMatch = raw.match(/^mcp[_-](.+)$/i)
  if (mcpMatch) {
    return `MCP · ${mcpMatch[1].replace(/[_-]+/g, ' / ')}`
  }

  if (/^callmcptool$/i.test(raw)) return 'MCP · call'
  if (/^getmcptools$/i.test(raw)) return 'MCP · list tools'

  if (raw.toLowerCase().startsWith('mcp ')) return raw

  return raw
}

function mcpToolInputSummary(input: Record<string, unknown>): string {
  if (!input || typeof input !== 'object') return ''
  const server = (input.server || input.mcpServer || input.mcp_server) as string | undefined
  const toolName = (input.toolName || input.tool_name || input.name) as string | undefined
  if (server && toolName) return `${server} · ${toolName}`
  if (server) return String(server)
  if (toolName) return String(toolName)
  return ''
}

export function toolInputSummary(input: Record<string, unknown> | null | undefined, block?: Record<string, unknown> | null): string {
  const mcpSummary = mcpToolInputSummary(input || {})
  if (mcpSummary) return mcpSummary

  if (input && typeof input === 'object') {
    const path = (input.path || input.file || input.filePath || input.file_path || input.target) as string | undefined
    if (path) return String(path)
    const pattern = (input.pattern || input.query || input.regex || input.glob) as string | undefined
    if (pattern) return String(pattern)
    const command = input.command as string | undefined
    if (command) {
      const text = String(command)
      return text.length > 80 ? `${text.slice(0, 77)}...` : text
    }
    if (input.value != null && input.value !== '') return String(input.value)
    const keys = Object.keys(input)
    if (keys.length === 1) return String(input[keys[0]])
  }

  const locations = block?.locations as Array<Record<string, unknown>> | undefined
  if (Array.isArray(locations) && locations.length > 0) {
    const p = pathFromLocation(locations[0])
    if (p) return p
  }

  return ''
}

export function toolBlockHasDetails(block: Record<string, unknown> | null | undefined): boolean {
  if (!block || typeof block !== 'object') return false
  const input = block.input
  if (input && typeof input === 'object' && Object.keys(input as Record<string, unknown>).length > 0) return true
  if (block.output != null && block.output !== '') return true
  if (Array.isArray(block.locations) && block.locations.length > 0) return true
  return false
}
