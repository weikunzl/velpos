'use client'

import { useState, useMemo } from 'react'
import { useProjects } from '@/entities/project/api/useProjectQuery'
import type { Project } from '@/shared/types/api'

interface Props {
  currentProjectId: string | null
  sidebarMode: string
  onSelect: (project: Project) => void
  onClose: () => void
  onNewProject: () => void
}

export function ProjectPickerSheet({
  currentProjectId,
  sidebarMode,
  onSelect,
  onClose,
  onNewProject,
}: Props) {
  const { data: projectsData } = useProjects()
  const [keyword, setKeyword] = useState('')

  const projects = projectsData as Project[] | undefined

  const filteredProjects = useMemo(() => {
    const list = (projects || []).filter((p: Project) =>
      sidebarMode === 'teams'
        ? (p as Project & { project_type?: string }).project_type === 'team'
        : (p as Project & { project_type?: string }).project_type !== 'team'
    )
    const kw = keyword.trim().toLowerCase()
    if (!kw) return list
    return list.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(kw) ||
        ((p as Project & { dir_path?: string }).dir_path || '').toLowerCase().includes(kw)
    )
  }, [projects, keyword, sidebarMode])

  function projectDisplayName(p: Project) {
    const pt = (p as Project & { project_type?: string }).project_type
    const agents = (p as Project & { agents?: { current?: unknown } }).agents
    if (pt === 'team' || !agents?.current) return p.name || ''
    return `${p.name} (agent)`
  }

  function sessionCount(p: Project) {
    return (p as Project & { session_count?: number }).session_count ?? 0
  }

  return (
    <div className="pp-root" onClick={onClose}>
      <div className="pp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-header">
          <span className="pp-title">选择项目</span>
          <button className="pp-close-btn" onClick={onClose} aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pp-search-wrap">
          <svg className="pp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="pp-search"
            type="search"
            placeholder="搜索项目…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="pp-list">
          {filteredProjects.length === 0 && (
            <div className="pp-empty">{keyword ? '没有匹配的项目' : '还没有项目，点击下方新建'}</div>
          )}
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className={`pp-item${p.id === currentProjectId ? ' pp-item--active' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="pp-item-info">
                <span className="pp-item-name">{projectDisplayName(p)}</span>
                {(p as Project & { dir_path?: string }).dir_path && (
                  <span className="pp-item-path">{(p as Project & { dir_path?: string }).dir_path}</span>
                )}
              </div>
              {sessionCount(p) > 0 && (
                <span className="pp-item-count">{sessionCount(p)}</span>
              )}
            </div>
          ))}
        </div>

        <button className="pp-new-btn" onClick={onNewProject}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建项目</span>
        </button>
      </div>

      <style>{`
        .pp-root {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: var(--overlay-glass);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: pp-bg-in var(--motion-medium) var(--ease-out) both;
        }
        .pp-sheet {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          border-top: 1px solid var(--glass-border);
          max-height: 80dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-glass);
          padding-bottom: var(--safe-bottom, 0px);
          animation: pp-sheet-in var(--motion-emphasis) var(--ease-spring) both;
        }
        .pp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 8px;
          flex-shrink: 0;
        }
        .pp-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
        .pp-close-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          background: var(--bg-hover); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); color: var(--text-secondary); cursor: pointer;
        }
        .pp-close-btn:hover { background: var(--layer-active); color: var(--accent); }
        .pp-search-wrap {
          position: relative;
          margin: 8px 20px;
          flex-shrink: 0;
        }
        .pp-search-icon {
          position: absolute; left: 12px; top: 50%;
          transform: translateY(-50%); color: var(--text-muted); pointer-events: none;
        }
        .pp-search {
          width: 100%; height: 40px;
          padding: 0 12px 0 36px;
          background: var(--bg-input); border: 1px solid var(--glass-border);
          border-radius: var(--radius-md); color: var(--text-primary);
          font-size: 14px; outline: none;
        }
        .pp-search:focus { border-color: var(--accent); }
        .pp-list {
          overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1;
          padding: 4px 12px 8px;
        }
        .pp-empty {
          padding: 32px 0; text-align: center;
          color: var(--text-muted); font-size: 14px;
        }
        .pp-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer;
          transition: background var(--transition-fast);
        }
        .pp-item:hover, .pp-item--active { background: var(--bg-hover); }
        .pp-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .pp-item-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .pp-item-path { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pp-item-count {
          font-size: 12px; color: var(--text-muted);
          background: var(--bg-hover); padding: 2px 8px; border-radius: 999px;
        }
        .pp-new-btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin: 8px 20px 12px; padding: 10px;
          background: var(--accent-dim); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
          border-radius: var(--radius-md); color: var(--accent); cursor: pointer;
          font-size: 14px; font-weight: 500; transition: background var(--transition-fast);
        }
        .pp-new-btn:hover { background: color-mix(in srgb, var(--accent) 20%, transparent); }
        @keyframes pp-bg-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pp-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  )
}
