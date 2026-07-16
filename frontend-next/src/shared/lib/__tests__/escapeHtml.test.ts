import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../escapeHtml'

describe('escapeHtml', () => {
  it('escapes & to &amp;', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b')
  })

  it('escapes < to &lt;', () => {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;')
  })

  it('escapes > to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes " to &quot;', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it("escapes ' to &#39;", () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('escapes all special characters together', () => {
    expect(escapeHtml('<script>alert("xss") & \'test\'</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;',
    )
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('returns the same string when no special characters', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})
