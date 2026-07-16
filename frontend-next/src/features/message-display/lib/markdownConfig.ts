'use client'

import { marked } from 'marked'
import { escapeHtml } from '@/shared/lib/escapeHtml'
import { sanitizeHtml } from '@/shared/lib/sanitizeHtml'

// Cache for parsed markdown
const _mdCache = new Map<string, string>()
const MD_CACHE_MAX = 300

export function cachedParse(text: string | null | undefined): string {
  if (!text) return ''
  const cached = _mdCache.get(text)
  if (cached) return cached
  const html = configuredMarked(text)
  if (_mdCache.size >= MD_CACHE_MAX) {
    const first = _mdCache.keys().next().value
    if (first) _mdCache.delete(first)
  }
  _mdCache.set(text, html)
  return html
}

// ── Configure marked ─────────────────────────────────────────

let _initialized = false
function initMarked() {
  if (_initialized) return
  _initialized = true

  const renderer = new marked.Renderer()

  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : ''
    const code = escapeHtml(text)
    return `<pre><code${langAttr} class="hljs${lang ? ` language-${escapeHtml(lang)}` : ''}">${code}</code></pre>`
  }

  renderer.link = function ({ href, text }: { href: string | null; text: string }) {
    const url = href || ''
    const isExternal = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${escapeHtml(url)}"${target}>${text}</a>`
  }

  renderer.image = function ({ href, text }: { href: string | null; text: string }) {
    const url = href || ''
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" />`
  }

  marked.setOptions({
    breaks: true,
    gfm: true,
    renderer,
  })
}

initMarked()

export function configuredMarked(text: string): string {
  const raw = marked.parse(text) as string
  return sanitizeHtml(raw)
}
