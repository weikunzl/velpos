'use client'

interface Props {
  content: string
}

export function SystemBlock({ content }: Props) {
  return (
    <div className="msg-system">
      <span className="system-label">System</span>
      {content}
    </div>
  )
}
