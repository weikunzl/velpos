import { describe, it, expect } from 'vitest'
import { createDiffRow, splitLines, buildSideBySideDiff } from '../diff'

describe('splitLines', () => {
  it('splits content by newlines', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c'])
  })

  it('returns [""] for empty string', () => {
    expect(splitLines('')).toEqual([''])
  })

  it('returns [""] for nullish', () => {
    expect(splitLines(null as unknown as string)).toEqual([''])
    expect(splitLines(undefined as unknown as string)).toEqual([''])
  })
})

describe('createDiffRow', () => {
  it('creates a "same" row', () => {
    const row = createDiffRow('same', 'hello', 'hello', 1, 1)
    expect(row.type).toBe('same')
    expect(row.beforeLine).toBe('hello')
    expect(row.afterLine).toBe('hello')
    expect(row.beforeLineNo).toBe(1)
    expect(row.afterLineNo).toBe(1)
    expect(row.displayLine).toBe('hello')
    expect(row.displayLineNo).toBe(1)
    expect(row.id).toContain('same-1-1')
  })

  it('creates an "added" row with display from afterLine', () => {
    const row = createDiffRow('added', '', 'new line', null, 2)
    expect(row.type).toBe('added')
    expect(row.displayLine).toBe('new line')
    expect(row.displayLineNo).toBe(2)
  })

  it('creates a "removed" row with display from beforeLine', () => {
    const row = createDiffRow('removed', 'old line', '', 3, null)
    expect(row.type).toBe('removed')
    expect(row.displayLine).toBe('old line')
    expect(row.displayLineNo).toBe(3)
  })

  it('accepts custom phase', () => {
    const row = createDiffRow('same', 'a', 'a', 1, 1, 'editing')
    expect(row.phase).toBe('editing')
  })

  it('defaults phase to "stable"', () => {
    const row = createDiffRow('same', 'a', 'a', 1, 1)
    expect(row.phase).toBe('stable')
  })
})

describe('buildSideBySideDiff', () => {
  it('returns empty array for empty inputs', () => {
    expect(buildSideBySideDiff([], [])).toEqual([])
  })

  it('shows same lines', () => {
    const rows = buildSideBySideDiff(['a', 'b'], ['a', 'b'])
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('same')
    expect(rows[1].type).toBe('same')
  })

  it('shows removed lines when after has fewer lines', () => {
    const rows = buildSideBySideDiff(['a', 'b', 'c'], ['a', 'b'])
    expect(rows).toHaveLength(3)
    expect(rows[0].type).toBe('same')
    expect(rows[1].type).toBe('same')
    expect(rows[2].type).toBe('removed')
  })

  it('shows added lines when before has fewer lines', () => {
    const rows = buildSideBySideDiff(['a'], ['a', 'b', 'c'])
    expect(rows).toHaveLength(3)
    expect(rows[0].type).toBe('same')
    expect(rows[1].type).toBe('added')
    expect(rows[2].type).toBe('added')
  })

  it('shows changes as removed+added adjacent', () => {
    const rows = buildSideBySideDiff(['old'], ['new'])
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('removed')
    expect(rows[0].beforeLine).toBe('old')
    expect(rows[1].type).toBe('added')
    expect(rows[1].afterLine).toBe('new')
  })

  it('uses fallback sequential diff for very large inputs (1000000 threshold)', () => {
    const bigBefore = Array.from({ length: 1001 }, (_, i) => `line${i}`)
    const bigAfter = Array.from({ length: 1001 }, (_, i) => `line${i}`)
    const rows = buildSideBySideDiff(bigBefore, bigAfter)
    expect(rows).toHaveLength(1001)
    expect(rows[0].type).toBe('same')
  })

  it('sequential diff handles extra lines in after array', () => {
    const before = Array.from({ length: 1002 }, (_, i) => `line${i}`)
    const after = Array.from({ length: 1005 }, (_, i) => `line${i}`)
    const rows = buildSideBySideDiff(before, after)
    expect(rows).toHaveLength(1005)
    expect(rows[1002].type).toBe('added')
    expect(rows[1003].type).toBe('added')
    expect(rows[1004].type).toBe('added')
  })

  it('sequential diff handles extra lines in before array', () => {
    const before = Array.from({ length: 1005 }, (_, i) => `line${i}`)
    const after = Array.from({ length: 1002 }, (_, i) => `line${i}`)
    const rows = buildSideBySideDiff(before, after)
    expect(rows).toHaveLength(1005)
    expect(rows[1002].type).toBe('removed')
    expect(rows[1003].type).toBe('removed')
    expect(rows[1004].type).toBe('removed')
  })

  it('sequential diff handles interleaved changes', () => {
    const before = Array.from({ length: 1002 }, (_, i) => i === 500 ? 'old-line' : `line${i}`)
    const after = Array.from({ length: 1002 }, (_, i) => i === 500 ? 'new-line' : `line${i}`)
    const rows = buildSideBySideDiff(before, after)
    expect(rows[500].type).toBe('removed')
    expect(rows[500].beforeLine).toBe('old-line')
    expect(rows[501].type).toBe('added')
    expect(rows[501].afterLine).toBe('new-line')
  })

  it('correctly aligns interleaved changes', () => {
    // LCS-based diff for ['a','b','c'] vs ['a','x','c'] produces 4 rows:
    // same('a'), removed('b'), added('x'), same('c')
    const rows = buildSideBySideDiff(['a', 'b', 'c'], ['a', 'x', 'c'])
    expect(rows).toHaveLength(4)
    expect(rows[0].type).toBe('same')
    expect(rows[0].beforeLine).toBe('a')
    expect(rows[1].type).toBe('removed')
    expect(rows[1].beforeLine).toBe('b')
    expect(rows[2].type).toBe('added')
    expect(rows[2].afterLine).toBe('x')
    expect(rows[3].type).toBe('same')
    expect(rows[3].beforeLine).toBe('c')
  })
})
