import { describe, it, expect } from 'vitest'
import {
  formatInput,
  formatToolDisplayName,
  formatToolValue,
  toolInputSummary,
  toolBlockHasDetails,
} from '../formatters'

describe('formatters', () => {
  describe('toolInputSummary', () => {
    it('returns path from input', () => {
      expect(toolInputSummary({ path: 'README.md' })).toBe('README.md')
    })

    it('returns URI from locations', () => {
      expect(
        toolInputSummary({}, { locations: [{ uri: 'file://src/app/App.vue' }] }),
      ).toBe('src/app/App.vue')
    })

    it('returns scalar value', () => {
      expect(toolInputSummary({ value: 'pattern' })).toBe('pattern')
    })

    it('returns MCP server · toolName', () => {
      expect(
        toolInputSummary({ server: 'figma', toolName: 'search' }),
      ).toBe('figma · search')
    })
  })

  describe('toolBlockHasDetails', () => {
    it('returns false for empty input', () => {
      expect(toolBlockHasDetails({ input: {} })).toBe(false)
    })

    it('returns true when input has a path', () => {
      expect(toolBlockHasDetails({ input: { path: 'a.txt' } })).toBe(true)
    })

    it('returns true when output is present', () => {
      expect(toolBlockHasDetails({ output: 'hello' })).toBe(true)
    })

    it('returns true when locations has items', () => {
      expect(toolBlockHasDetails({ locations: [{ path: 'a.txt' }] })).toBe(true)
    })
  })

  describe('formatToolValue', () => {
    it('returns string as-is', () => {
      expect(formatToolValue('hello')).toBe('hello')
    })

    it('formats object via formatInput', () => {
      expect(formatToolValue({ path: 'a.txt' })).toBe(formatInput({ path: 'a.txt' }))
    })
  })

  describe('formatToolDisplayName', () => {
    it('handles MCP tools', () => {
      expect(formatToolDisplayName('CallMcpTool')).toBe('MCP · call')
      expect(formatToolDisplayName('mcp_plugin-figma_search')).toBe('MCP · plugin / figma / search')
    })
  })
})
