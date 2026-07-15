'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import hljs from 'highlight.js/lib/common'
import { useWorkspace } from '../model/useWorkspace'
import { getFilePreviewType, getFileRawUrl } from '../lib/fileTypes'
import { buildSideBySideDiff, splitLines, createDiffRow } from '@/shared/lib/diff'
import type { FileEntry } from '../api/workspaceApi'

interface Props {
  visible: boolean
  project: { id: string; dir_path?: string } | null
  onClose: () => void
}

interface TreeNode {
  key: string
  name: string
  type: 'dir' | 'file'
  path?: string
  depth: number
  children?: TreeNode[]
  is_changed?: boolean
  git_status?: string
}

const languageByExtension: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  vue: 'xml', py: 'python', json: 'json', md: 'markdown', css: 'css',
  scss: 'scss', html: 'xml', htm: 'xml', sh: 'bash', bash: 'bash',
  zsh: 'bash', go: 'go', java: 'java', rs: 'rust', yaml: 'yaml',
  yml: 'yaml', sql: 'sql', xml: 'xml',
}

function languageForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return languageByExtension[ext] || ''
}

export default function WorkspacePanel({ visible, project, onClose }: Props) {
  const {
    files, selectedFile, selectedDiff, fileHistory,
    loading, reading, historyLoading, error,
    loadFiles, openFile, loadFileHistory,
    openHistoricalFile, clearSelection,
  } = useWorkspace()

  const [changedOnly, setChangedOnly] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [contentOpen, setContentOpen] = useState(false)
  const [contentFullscreen, setContentFullscreen] = useState(false)
  const [selectedNodeKeys, setSelectedNodeKeys] = useState<Set<string>>(new Set())
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState(-1)
  const [copyStatus, setCopyStatus] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  const projectId = project?.id || ''

  // Refresh files when project changes
  useEffect(() => {
    if (visible && projectId) {
      loadFiles(projectId, { changedOnly, keyword })
    }
  }, [visible, projectId, loadFiles])

  useEffect(() => {
    if (visible && projectId && changedOnly) {
      loadFiles(projectId, { changedOnly, keyword })
    }
  }, [changedOnly])

  async function refreshFiles() {
    await loadFiles(projectId, { changedOnly, keyword })
  }

  async function selectFile(path: string) {
    await openFile(projectId, path)
    setContentOpen(true)
  }

  const treeNodes = useMemo(() => buildTree(files), [files])
  const treeRows = useMemo(() => flattenTree(treeNodes, expandedDirs), [treeNodes, expandedDirs])

  const selectedPaths = useMemo(() => {
    const paths: string[] = []
    function collect(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (selectedNodeKeys.has(node.key) && node.path) paths.push(node.path)
        if (node.children) collect(node.children)
      }
    }
    collect(treeNodes)
    return paths
  }, [treeNodes, selectedNodeKeys])

  const hasWorkspaceSelection = selectedPaths.length > 0

  function toggleDir(key: string) {
    const next = new Set(expandedDirs)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedDirs(next)
  }

  function handleTreeRowClick(node: TreeNode, index: number, event: React.MouseEvent) {
    if ((event as unknown as { shiftKey: boolean }).shiftKey && lastSelectedRowIndex >= 0) {
      const start = Math.min(lastSelectedRowIndex, index)
      const end = Math.max(lastSelectedRowIndex, index)
      const next = new Set(selectedNodeKeys)
      for (let i = start; i <= end; i += 1) {
        const row = treeRows[i]
        if (row?.path) next.add(row.key)
      }
      setSelectedNodeKeys(next)
    } else if (event.metaKey || event.ctrlKey) {
      const next = new Set(selectedNodeKeys)
      if (next.has(node.key)) next.delete(node.key)
      else next.add(node.key)
      setSelectedNodeKeys(next)
      setLastSelectedRowIndex(index)
    } else {
      setSelectedNodeKeys(node.path ? new Set([node.key]) : new Set())
      setLastSelectedRowIndex(index)
    }

    if (node.type === 'file' && !(event as unknown as { shiftKey: boolean }).shiftKey && !event.metaKey && !event.ctrlKey) {
      selectFile(node.path!)
    }
  }

  function clearWorkspaceSelection() {
    setSelectedNodeKeys(new Set())
    setLastSelectedRowIndex(-1)
  }

  function showCopyStatus(message: string) {
    setCopyStatus(message)
    setTimeout(() => setCopyStatus(''), 1600)
  }

  async function copyText(text: string, message: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showCopyStatus(message)
    } catch {
      showCopyStatus('Copy failed')
    }
  }

  async function copySelectedPaths() {
    await copyText(selectedPaths.join('\n'), 'Paths copied')
  }

  function shellQuote(value: string) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`
  }

  async function copySelectedCpCommand() {
    const sources = selectedPaths.map(shellQuote).join(' ')
    await copyText(`cp -R ${sources} ./`, 'cp command copied')
  }

  async function downloadSelectionZip() {
    if (!projectId || !hasWorkspaceSelection || exportLoading) return
    setExportLoading(true)
    try {
      const { downloadWorkspaceSelection } = await import('../api/workspaceApi')
      await downloadWorkspaceSelection(projectId, selectedPaths)
    } catch (e: unknown) {
      showCopyStatus(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  function closeContent() {
    setContentOpen(false)
    clearSelection()
  }

  const fileLines = useMemo(() => (selectedFile?.content || '').split('\n'), [selectedFile])
  const binaryPreviewType = selectedFile ? getFilePreviewType(selectedFile.path) : null
  const binaryPreviewUrl = selectedFile && projectId ? getFileRawUrl(projectId, selectedFile.path) : ''

  const selectionSummary = selectedPaths.length === 0
    ? 'No selection'
    : selectedPaths.length === 1
      ? selectedPaths[0]
      : `${selectedPaths.length} items selected`

  // ── Version Comparison State ──
  const [compareMode, setCompareMode] = useState(false)
  const [versionCursor, setVersionCursor] = useState(0)
  const [versionContents, setVersionContents] = useState<Record<string, string>>({})
  const [diffCursor, setDiffCursor] = useState(-1)
  const [historyRows, setHistoryRows] = useState<unknown[]>([])

  const versionNodes = useMemo(() => {
    if (!selectedFile) return []
    const currentLabel = selectedDiff?.patch ? 'Uncommitted' : 'Current'
    return [
      { ref: 'current', short_hash: currentLabel, author_name: '', message: selectedFile?.path || '', current: true },
      ...fileHistory.map((c) => ({ ...c, current: false })),
    ]
  }, [selectedFile, selectedDiff, fileHistory])

  const activeVersion = versionNodes[versionCursor] || null
  const compareFromNode = !versionNodes.length ? null
    : versionCursor === 0 ? (versionNodes[1] || null)
    : versionNodes[versionCursor - 1] || null

  function getVersionContent(node: { ref: string; current?: boolean } | null) {
    if (!node) return ''
    if (node.current) return selectedFile?.content || ''
    return versionContents[node.ref] || ''
  }

  async function ensureVersionContent(node: { ref: string; current?: boolean } | null) {
    if (!node || node.current || !selectedFile) return
    if (Object.prototype.hasOwnProperty.call(versionContents, node.ref)) return
    const file = await openHistoricalFile(projectId, selectedFile.path, node.ref)
    setVersionContents((prev) => ({ ...prev, [node.ref]: file?.content || '' }))
  }

  async function ensureCompareContent() {
    await Promise.all([ensureVersionContent(compareFromNode), ensureVersionContent(activeVersion)])
  }

  const compareFromLines = useMemo(
    () => (selectedFile ? getVersionContent(compareFromNode).split('\n') : []),
    [compareFromNode, versionContents, selectedFile],
  )
  const compareToLines = useMemo(
    () => (selectedFile ? getVersionContent(activeVersion).split('\n') : []),
    [activeVersion, versionContents, selectedFile],
  )

  async function toggleCompare() {
    const next = !compareMode
    setCompareMode(next)
    if (!next || !selectedFile) {
      setVersionCursor(0)
      setVersionContents({})
      setHistoryRows([])
      return
    }
    setVersionCursor(0)
    setVersionContents({})
    await loadFileHistory(projectId, selectedFile.path)
    await ensureCompareContent()
  }

  useEffect(() => {
    if (!compareMode || !selectedFile) return
    if (compareFromNode) {
      const beforeLines = splitLines(getVersionContent(compareFromNode))
      const afterLines = splitLines(getVersionContent(activeVersion))
      const rows = buildSideBySideDiff(beforeLines, afterLines)
      const changedLines = new Set<number>()
      for (const row of rows) {
        if (row.type !== 'same' && row.afterLineNo) changedLines.add(row.afterLineNo)
      }
      const settled = afterLines.map((line, index) => {
        const lineNo = index + 1
        const type = changedLines.has(lineNo) ? 'added' : 'same'
        return createDiffRow(type, '', line, null, lineNo, 'stable')
      })
      setHistoryRows(settled)
    } else {
      const settled = splitLines(getVersionContent(activeVersion)).map((line, index) =>
        createDiffRow('same', '', line, null, index + 1, 'stable'),
      )
      setHistoryRows(settled)
    }
  }, [compareMode, versionCursor, compareFromNode, activeVersion, selectedFile, versionContents])

  const diffRowIndexes = useMemo(
    () => (historyRows as Array<{ type: string }>)
      .map((row, index) => (row.type === 'same' ? -1 : index))
      .filter((i) => i >= 0),
    [historyRows],
  )

  function nextDifference() {
    const next = diffRowIndexes.find((i) => i > diffCursor) ?? diffRowIndexes[0]
    if (next === undefined) return
    setDiffCursor(next)
    setTimeout(() => {
      document.querySelector(`[data-diff-row="${next}"]`)?.scrollIntoView({ block: 'center' })
    }, 0)
  }

  function highlightedFileLines() {
    return fileLines.map((line) => highlightLine(line, selectedFile?.path || ''))
  }

  return (
    <>
      {visible && (
        <aside className="workspace-drawer" role="dialog" aria-label="Workspace files">
          <header className="workspace-header">
            <div>
              <h2>Workspace</h2>
              <p>{project?.dir_path || 'No project selected'}</p>
            </div>
            <button className="icon-btn" aria-label="Close workspace" onClick={onClose}>&times;</button>
          </header>

          <div className="workspace-filters">
            <label className="changed-toggle">
              <input type="checkbox" checked={changedOnly} onChange={(e) => setChangedOnly(e.target.checked)} />
              Changed only
            </label>
            <input
              className="file-search"
              placeholder="Search files"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') refreshFiles() }}
            />
            <button className="secondary-btn" disabled={loading} onClick={refreshFiles}>Refresh</button>
          </div>

          {hasWorkspaceSelection && (
            <div className="selection-toolbar">
              <span className="selection-summary" title={selectionSummary}>{selectionSummary}</span>
              <div className="selection-actions">
                <button className="secondary-btn" disabled={exportLoading} onClick={downloadSelectionZip}>
                  {exportLoading ? 'Exporting...' : 'Download Zip'}
                </button>
                <button className="secondary-btn" onClick={copySelectedPaths}>Copy paths</button>
                <button className="secondary-btn" onClick={copySelectedCpCommand}>Copy cp</button>
                <button className="icon-btn small-icon" aria-label="Clear selection" onClick={clearWorkspaceSelection}>&times;</button>
              </div>
              {copyStatus && <span className="copy-status">{copyStatus}</span>}
            </div>
          )}

          {loading ? (
            <div className="workspace-empty">Loading files...</div>
          ) : error ? (
            <div className="workspace-error">{error}</div>
          ) : !treeRows.length ? (
            <div className="workspace-empty">No files</div>
          ) : (
            <div className="tree-list">
              {treeRows.map((node, index) => (
                <button
                  key={node.key}
                  className={`tree-row${selectedFile?.path === node.path ? ' active' : ''}${selectedNodeKeys.has(node.key) ? ' selected' : ''}${node.is_changed ? ' changed' : ''}`}
                  style={{ paddingLeft: `${12 + node.depth * 14}px` }}
                  onClick={(e) => handleTreeRowClick(node, index, e)}
                  onDoubleClick={() => { if (node.type === 'dir') toggleDir(node.key) }}
                >
                  <span className="tree-caret" onClick={(e) => { e.stopPropagation(); if (node.type === 'dir') toggleDir(node.key) }}>
                    {node.type === 'dir' ? (expandedDirs.has(node.key) ? '\u25BE' : '\u25B8') : ''}
                  </span>
                  <span className="tree-name">{node.name}</span>
                  {node.git_status && <span className="file-status">{node.git_status}</span>}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      {selectedFile && visible && contentOpen && (
        <section
          className={`file-content-panel${contentFullscreen ? ' fullscreen' : ''}`}
          aria-label="File content"
        >
          <header className="viewer-header">
            <div>
              <strong>{selectedFile.path}</strong>
              <span>{selectedFile.size} bytes</span>
              {selectedFile.truncated && <span> truncated</span>}
              {selectedFile.is_binary && <span> binary</span>}
            </div>
            <div className="viewer-actions">
              <button className={`secondary-btn${compareMode ? ' active' : ''}`} disabled={selectedFile.is_binary} onClick={toggleCompare}>History</button>
              <button className="icon-btn small-icon" aria-label={contentFullscreen ? 'Shrink file' : 'Fullscreen file'} onClick={() => setContentFullscreen(!contentFullscreen)}>
                {contentFullscreen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 12l7-7" /><path d="M14 5h5v5" />
                    <path d="M12 12l-7 7" /><path d="M10 19H5v-5" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 5h5v5" /><path d="M19 5l-7 7" />
                    <path d="M10 19H5v-5" /><path d="M5 19l7-7" />
                  </svg>
                )}
              </button>
              <button className="icon-btn" aria-label="Close file" onClick={closeContent}>&times;</button>
            </div>
          </header>

          {reading ? (
            <div className="workspace-empty viewer-empty">Reading file...</div>
          ) : selectedFile.is_binary ? (
            <div className="workspace-empty viewer-empty">
              {binaryPreviewType === 'image' ? (
                <img src={binaryPreviewUrl} alt={selectedFile.path} style={{ maxWidth: '100%' }} />
              ) : (
                'Binary file cannot be previewed.'
              )}
            </div>
          ) : compareMode ? (
            <div className="compare-shell">
              <div className="compare-toolbar">
                <div className="history-track" aria-label="File version history">
                  {versionNodes.map((node, index) => (
                    <button
                      key={node.ref}
                      className={`history-node${node.current ? ' current' : ''}${versionCursor === index ? ' active' : ''}`}
                      onClick={() => setVersionCursor(index)}
                    >
                      <strong>{node.short_hash}</strong>
                      <small>{node.current ? 'current' : node.author_name}</small>
                    </button>
                  ))}
                </div>
                <div className="history-keys">
                  <button className="key-hint" disabled={versionCursor <= 0} onClick={() => setVersionCursor((v) => v - 1)}>&larr; newer</button>
                  <button className="key-hint" disabled={versionCursor >= versionNodes.length - 1} onClick={() => setVersionCursor((v) => v + 1)}>older &rarr;</button>
                </div>
                <button className="secondary-btn" disabled={!diffRowIndexes.length} onClick={nextDifference}>Next diff</button>
                <span>Viewing {activeVersion?.short_hash || ''}</span>
              </div>
              <div className="compare-view">
                <div className="history-code-view">
                  <div className="pane-title">{activeVersion?.short_hash || 'Current'}</div>
                  <div className="history-lines">
                    {(historyRows as Array<{ id: string; type: string; phase: string; displayLine: string; displayLineNo: number | null }>).map((row, index) => (
                      <div
                        key={row.id}
                        className={`history-line ${row.type}${row.phase !== 'stable' ? ` ${row.phase}` : ''}${diffCursor === index ? ' current-diff' : ''}`}
                        data-diff-row={index}
                        data-display-line={row.displayLineNo || undefined}
                      >
                        <span className="line-no">{row.displayLineNo || ''}</span>
                        <pre dangerouslySetInnerHTML={{ __html: highlightLine(row.displayLine, selectedFile.path) }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="code-view">
              {highlightedFileLines().map((line, index) => (
                <div key={index} className="code-line" data-line={index + 1}>
                  <span className="line-no">{index + 1}</span>
                  <pre dangerouslySetInnerHTML={{ __html: line }} />
                </div>
              ))}
            </div>
          )}

          {selectedDiff?.patch && !compareMode && (
            <div className="diff-box">
              <div className="diff-title">Diff</div>
              <pre>{selectedDiff.patch}</pre>
            </div>
          )}
        </section>
      )}
    </>
  )
}

function highlightLine(line: string, path: string): string {
  const value = line || ' '
  const language = languageForPath(path)
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(value, { language, ignoreIllegals: true }).value
    }
  } catch {
    return escapeHtml(value)
  }
  return escapeHtml(value)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildTree(fileList: FileEntry[]): TreeNode[] {
  const root: TreeNode = { key: '', name: '', type: 'dir', children: [], depth: -1 }
  const dirs = new Map<string, TreeNode>([['', root]])
  for (const file of fileList) {
    const parts = file.path.split('/').filter(Boolean)
    let currentPath = ''
    let parent = root
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part
      if (isFile) {
        parent.children!.push({
          key: file.path,
          name: part,
          type: 'file',
          path: file.path,
          depth: index,
          is_changed: file.is_changed,
          git_status: file.git_status,
        })
      } else {
        let dir = dirs.get(currentPath)
        if (!dir) {
          dir = { key: currentPath, name: part, type: 'dir', path: currentPath, depth: index, children: [], is_changed: false }
          dirs.set(currentPath, dir)
          parent.children!.push(dir)
        }
        if (file.is_changed) dir.is_changed = true
        parent = dir
      }
    })
  }
  sortTree(root)
  return root.children || []
}

function sortTree(node: TreeNode) {
  node.children?.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const child of node.children || []) {
    if (child.type === 'dir') sortTree(child)
  }
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const rows: TreeNode[] = []
  function visit(node: TreeNode) {
    rows.push(node)
    if (node.type === 'dir' && expanded.has(node.key)) {
      for (const child of node.children || []) visit(child)
    }
  }
  for (const node of nodes) visit(node)
  return rows
}
