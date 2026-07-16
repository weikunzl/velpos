'use client'

// Lightweight HTML sanitizer using native DOM parsing.
// Replaces DOMPurify to avoid Turbopack ESM interop issues.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del', 'ins',
  'a', 'img',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'code', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'dl', 'dt', 'dd',
  'details', 'summary',
  'input', 'button',
])

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'class', 'id', 'style', 'loading',
  'data-lang', 'lang', 'width', 'height',
  'start', 'type', 'reversed',
  'checked', 'disabled', 'value', 'name',
])

export function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const template = document.createElement('template')
  template.innerHTML = html
  const content = template.content

  // Walk all nodes, remove disallowed
  function cleanNode(node: Node): Node | null {
    if (node.nodeType === 1) {
      // Element
      const el = node as Element
      const tag = el.tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace with its children (unwrap)
        const fragment = document.createDocumentFragment()
        for (let child = el.firstChild; child; child = el.firstChild) {
          const cleaned = cleanNode(child)
          if (cleaned) fragment.appendChild(cleaned)
        }
        return fragment.childNodes.length > 0 ? fragment : null
      }

      // Clean attributes
      const attrs = Array.from(el.attributes)
      for (const attr of attrs) {
        if (!ALLOWED_ATTRS.has(attr.name)) {
          el.removeAttribute(attr.name)
        }
      }

      // Ensure href starts with safe protocol
      const href = el.getAttribute('href')
      if (href && !/^(https?:\/\/|\/|#|mailto:)/.test(href)) {
        el.setAttribute('href', '#')
      }

      // External links: target=_blank
      if (tag === 'a' && href) {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
          if (!el.getAttribute('target')) el.setAttribute('target', '_blank')
          el.setAttribute('rel', 'noopener noreferrer')
        }
      }

      // Clean children
      const childNodes = Array.from(el.childNodes)
      for (const child of childNodes) {
        const cleaned = cleanNode(child)
        if (cleaned !== child && cleaned !== null) {
          el.replaceChild(cleaned, child)
        } else if (cleaned === null && child.parentNode) {
          child.parentNode.removeChild(child)
        }
      }

      return el
    }

    if (node.nodeType === 3) {
      // Text — keep as is
      return node
    }

    // Remove comments and other node types
    return null
  }

  const childNodes = Array.from(content.childNodes)
  for (const child of childNodes) {
    const cleaned = cleanNode(child)
    if (cleaned === null) {
      child.remove()
    } else if (cleaned !== child) {
      child.replaceWith(cleaned)
    }
  }

  // Serialize to string via a temporary container
  const container = document.createElement('div')
  container.appendChild(content)
  return container.innerHTML
}
