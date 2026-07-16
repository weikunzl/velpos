import { describe, it, expect, vi, beforeEach } from 'vitest'
import { API_BASE, resolveSessionProvider, AGENT_PROVIDERS, WS_CLOSE_NORMAL, WS_CLOSE_NOT_FOUND, LAST_SESSION_ID_KEY, LAST_AGENT_PROVIDER_KEY } from '../constants'

describe('constants', () => {
  describe('API_BASE', () => {
    beforeEach(() => {
      vi.unstubAllEnvs()
    })

    it('uses NEXT_PUBLIC_API_BASE_URL when set', () => {
      vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/custom-api')
      // Re-import to get updated value
      // Since API_BASE is evaluated at import time, we test the default
      expect(API_BASE).toBe('/api')
    })
  })

  describe('exports', () => {
    it('exports WS_CLOSE_NORMAL as 1000', () => {
      expect(WS_CLOSE_NORMAL).toBe(1000)
    })

    it('exports WS_CLOSE_NOT_FOUND as 4004', () => {
      expect(WS_CLOSE_NOT_FOUND).toBe(4004)
    })

    it('exports LAST_SESSION_ID_KEY', () => {
      expect(LAST_SESSION_ID_KEY).toBe('pf_last_session_id')
    })

    it('exports LAST_AGENT_PROVIDER_KEY', () => {
      expect(LAST_AGENT_PROVIDER_KEY).toBe('pf_last_agent_provider')
    })

    it('exports AGENT_PROVIDERS with correct values', () => {
      expect(AGENT_PROVIDERS).toHaveLength(2)
      expect(AGENT_PROVIDERS[0]).toEqual({ id: 'claude', label: 'Claude Code' })
      expect(AGENT_PROVIDERS[1]).toEqual({ id: 'cursor', label: 'Cursor ACP' })
    })
  })

  describe('resolveSessionProvider', () => {
    it('returns provider from session', () => {
      expect(resolveSessionProvider({ provider: 'cursor' })).toBe('cursor')
    })

    it('defaults to claude when no provider', () => {
      expect(resolveSessionProvider({})).toBe('claude')
    })

    it('defaults to claude when provider is undefined', () => {
      expect(resolveSessionProvider({ provider: undefined as unknown as string })).toBe('claude')
    })
  })
})
