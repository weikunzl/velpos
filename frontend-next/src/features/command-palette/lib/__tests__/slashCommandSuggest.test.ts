import { describe, it, expect } from 'vitest'
import {
  buildSlashCommandInput,
  filterSlashCommandSuggestions,
  getSlashCommandContext,
} from '../slashCommandSuggest'

const commands = [
  { name: 'demo-skill', type: 'skill' as const, description: 'Demo skill', isUserInvocable: true },
  { name: 'review', type: 'skill' as const, description: 'Review code', isUserInvocable: true },
  { name: 'demo', type: 'mcp' as const, description: 'stdio MCP', isUserInvocable: false },
]

describe('slashCommandSuggest', () => {
  describe('getSlashCommandContext', () => {
    it('detects slash at line start', () => {
      const ctx = getSlashCommandContext('/de', 3)
      expect(ctx).not.toBeNull()
      expect(ctx!.query).toBe('de')
      expect(ctx!.replaceStart).toBe(0)
      expect(ctx!.replaceEnd).toBe(3)
    })

    it('detects slash after newline', () => {
      const text = 'hello\n/rev'
      const ctx = getSlashCommandContext(text, text.length)
      expect(ctx).not.toBeNull()
      expect(ctx!.query).toBe('rev')
      expect(ctx!.replaceStart).toBe(6)
    })

    it('ignores slash in middle of line', () => {
      expect(getSlashCommandContext('say /demo', 9)).toBeNull()
    })
  })

  describe('filterSlashCommandSuggestions', () => {
    it('filters invokable commands by name', () => {
      const filtered = filterSlashCommandSuggestions(commands, 'de')
      expect(filtered.map((item) => item.name)).toEqual(['demo-skill', 'review'])
    })
  })

  describe('buildSlashCommandInput', () => {
    it('builds replacement input', () => {
      const ctx = getSlashCommandContext('/de', 3)!
      const next = buildSlashCommandInput('/de', ctx, 'demo-skill')
      expect(next).toBe('/demo-skill ')
    })
  })
})
