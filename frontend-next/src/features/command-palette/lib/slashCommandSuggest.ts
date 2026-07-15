export interface SlashCommandContext {
  query: string
  replaceStart: number
  replaceEnd: number
}

/**
 * Detect slash-command context inside a textarea/input value.
 * Returns null when the caret is not inside an active `/command` token.
 */
export function getSlashCommandContext(text: string, caretIndex: number): SlashCommandContext | null {
  if (typeof text !== 'string' || caretIndex == null || caretIndex < 0) {
    return null
  }

  const beforeCaret = text.slice(0, caretIndex)
  const lineStart = beforeCaret.lastIndexOf('\n') + 1
  const linePrefix = beforeCaret.slice(lineStart)
  const match = linePrefix.match(/^\/([\w:.-]*)$/)
  if (!match) return null

  const query = match[1] || ''
  const replaceStart = lineStart
  const replaceEnd = caretIndex
  return { query, replaceStart, replaceEnd }
}

export function filterSlashCommandSuggestions(
  commands: Array<{ name: string; description?: string; isUserInvocable?: boolean; type?: string }>,
  query = ''
) {
  const q = String(query || '').toLowerCase()
  const invokable = (commands || []).filter(
    (cmd) =>
      cmd &&
      cmd.isUserInvocable !== false &&
      cmd.type !== 'mcp' &&
      cmd.type !== 'local' &&
      cmd.type !== 'local-jsx'
  )

  if (!q) return invokable
  return invokable.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(q) ||
      String(cmd.description || '').toLowerCase().includes(q)
  )
}

export function buildSlashCommandInput(
  text: string,
  context: SlashCommandContext,
  commandName: string
): string {
  if (!context || !commandName) return text
  const prefix = text.slice(0, context.replaceStart)
  const suffix = text.slice(context.replaceEnd)
  return `${prefix}/${commandName} ${suffix}`
}
