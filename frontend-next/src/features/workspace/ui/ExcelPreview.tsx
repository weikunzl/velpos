'use client'

import { useState, useEffect } from 'react'

interface ExcelPreviewProps {
  src: string
}

export function ExcelPreview({ src }: ExcelPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    // Attempt to fetch as CSV (simple structured data fallback)
    fetch(src)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        if (cancelled) return

        // Try parsing as CSV
        const lines = text.split('\n').filter(Boolean).slice(0, 501)
        if (lines.length > 0) {
          const parsed = lines.map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()))
          setHeaders(parsed[0].map((h, i) => h || `Col ${i + 1}`))
          setRows(parsed.slice(1))
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load file')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (loading) return <div className="excel-status">Loading...</div>
  if (error) return <div className="excel-status excel-error">{error}</div>
  if (rows.length === 0) return <div className="excel-status">Empty sheet</div>

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
