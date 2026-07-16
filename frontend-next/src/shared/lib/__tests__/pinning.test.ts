import { describe, it, expect, beforeEach } from 'vitest'
import { loadPinnedIds, savePinnedIds, togglePinnedId, compareSessions, splitPinnedProjects } from '../pinning'

describe('pinning', () => {
  beforeEach(() => localStorage.clear())

  describe('loadPinnedIds', () => {
    it('returns empty set when no stored data', () => {
      expect(loadPinnedIds('test')).toEqual(new Set())
    })

    it('loads stored ids', () => {
      localStorage.setItem('test', JSON.stringify(['a', 'b']))
      expect(loadPinnedIds('test')).toEqual(new Set(['a', 'b']))
    })

    it('returns empty set on corrupt data', () => {
      localStorage.setItem('test', '{invalid')
      expect(loadPinnedIds('test')).toEqual(new Set())
    })
  })

  describe('savePinnedIds', () => {
    it('saves ids to localStorage', () => {
      savePinnedIds('test', new Set(['x', 'y']))
      expect(JSON.parse(localStorage.getItem('test')!)).toEqual(['x', 'y'])
    })
  })

  describe('togglePinnedId', () => {
    it('adds an id not in the set', () => {
      const result = togglePinnedId(new Set(['a']), 'b')
      expect(result).toEqual(new Set(['a', 'b']))
    })

    it('removes an id already in the set', () => {
      const result = togglePinnedId(new Set(['a', 'b']), 'a')
      expect(result).toEqual(new Set(['b']))
    })

    it('does not mutate original set', () => {
      const original = new Set(['a'])
      togglePinnedId(original, 'b')
      expect(original).toEqual(new Set(['a']))
    })
  })

  describe('compareSessions', () => {
    const base = { session_id: '1', status: 'idle', updated_time: '2026-01-01T00:00:00Z' }

    it('puts pinned sessions first', () => {
      const a = { ...base, session_id: 'a' }
      const b = { ...base, session_id: 'b' }
      expect(compareSessions(a, b, new Set(['a']))).toBeLessThan(0)
    })

    it('puts pinned b before a when b is pinned', () => {
      const a = { ...base, session_id: 'a' }
      const b = { ...base, session_id: 'b' }
      expect(compareSessions(a, b, new Set(['b']))).toBeGreaterThan(0)
    })

    it('puts running sessions before idle', () => {
      const a = { ...base, session_id: 'a', status: 'running' }
      const b = { ...base, session_id: 'b', status: 'idle' }
      expect(compareSessions(a, b)).toBeLessThan(0)
    })

    it('puts idle after running when b is running', () => {
      const a = { ...base, session_id: 'a', status: 'idle' }
      const b = { ...base, session_id: 'b', status: 'running' }
      expect(compareSessions(a, b)).toBeGreaterThan(0)
    })

    it('sorts by updated_time descending', () => {
      const a = { ...base, session_id: 'a', updated_time: '2026-02-01T00:00:00Z' }
      const b = { ...base, session_id: 'b', updated_time: '2026-01-01T00:00:00Z' }
      expect(compareSessions(a, b)).toBeLessThan(0)
    })

    it('handles missing updated_time', () => {
      const a = { session_id: 'a' }
      const b = { session_id: 'b', updated_time: '2026-01-01T00:00:00Z' }
      expect(compareSessions(a, b)).toBeGreaterThan(0)
    })

    it('handles both missing updated_time', () => {
      const a = { session_id: 'a' }
      const b = { session_id: 'b' }
      expect(compareSessions(a, b)).toBe(0)
    })
  })

  describe('splitPinnedProjects', () => {
    const projects = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

    it('splits pinned and unpinned', () => {
      const result = splitPinnedProjects(projects, new Set(['a', 'c']))
      expect(result.pinnedProjects).toEqual([{ id: 'a' }, { id: 'c' }])
      expect(result.unpinnedProjects).toEqual([{ id: 'b' }])
    })

    it('handles empty pinned set', () => {
      const result = splitPinnedProjects(projects)
      expect(result.pinnedProjects).toEqual([])
      expect(result.unpinnedProjects).toEqual(projects)
    })
  })
})
