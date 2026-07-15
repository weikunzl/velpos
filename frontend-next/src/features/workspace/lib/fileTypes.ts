const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif',
])

const PDF_EXTENSIONS = new Set(['pdf'])

const EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])

export type PreviewType = 'image' | 'pdf' | 'excel' | null

export function getFilePreviewType(path: string): PreviewType {
  const ext = (path || '').split('.').pop()?.toLowerCase() || ''
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (PDF_EXTENSIONS.has(ext)) return 'pdf'
  if (EXCEL_EXTENSIONS.has(ext)) return 'excel'
  return null
}

export function getFileRawUrl(projectId: string, filePath: string): string {
  return `/api/projects/${projectId}/workspace/file-raw?path=${encodeURIComponent(filePath)}`
}
