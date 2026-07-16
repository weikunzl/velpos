'use client'

import { useState, useCallback } from 'react'

interface PdfPreviewProps {
  src: string
}

export function PdfPreview({ src }: PdfPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleError = useCallback(() => {
    setLoading(false)
    setError('Failed to load PDF')
  }, [])

  return (
    <div className="pdf-preview">
      {loading && <div className="pdf-status">Loading PDF...</div>}
      {error && <div className="pdf-status pdf-error">{error}</div>}
      <iframe
        src={src}
        className="pdf-iframe"
        title="PDF Preview"
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: loading || error ? 'none' : 'block' }}
      />
    </div>
  )
}
