'use client'

interface Props {
  block: { html?: string }
}

export function AssistantBlock({ block }: Props) {
  if (!block.html) return null
  return <div className="msg-text markdown-body" dangerouslySetInnerHTML={{ __html: block.html }} />
}
