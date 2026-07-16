'use client'

import { useState } from 'react'

interface ImagePreviewProps {
  src: string
  path?: string
}

export function ImagePreview({ src, path = '' }: ImagePreviewProps) {
  const [scale, setScale] = useState(1)
  const filename = path?.split('/').pop() || src?.split('/').pop() || 'image'

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 5))
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25))
  const resetZoom = () => setScale(1)

  return (
    <div className="image-preview">
      <div className="image-toolbar">
        <span className="image-name">{filename}</span>
        <button className="zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
        <button className="zoom-btn" onClick={resetZoom} title="Reset">{Math.round(scale * 100)}%</button>
        <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
      </div>
      <div className="image-viewport">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={filename}
          draggable={false}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        />
      </div>
    </div>
  )
}
