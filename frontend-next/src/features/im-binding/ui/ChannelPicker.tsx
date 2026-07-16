'use client'

import { useState, useRef, useCallback } from 'react'

interface ImInstance {
  id: string
  name?: string
  app_id?: string
  bound_session_id?: string
  channel_type?: string
  display_name?: string
  icon?: string
  binding_mode?: string
}

interface ImChannel {
  id: string
  channel_type: string
  display_name?: string
  name?: string
  icon?: string
  binding_mode?: string
  instances?: ImInstance[]
}

interface ChannelPickerProps {
  channels: ImChannel[]
  currentSessionId: string
  onSelect: (instance: ImInstance) => void
  onCreate: (channelType: string, name: string) => void
  onDelete: (channelId: string) => void
  onRename: (channelId: string, name: string) => void
  onNavigateSession: (sessionId: string) => void
}

const ICON_SVGS: Record<string, { viewBox: string; path: string }> = {
  openim: {
    viewBox: '0 0 24 24',
    path: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
  },
  lark: {
    viewBox: '0 0 24 24',
    path: '<path d="M4 4l6 6"/><path d="M14 10l6-6"/><path d="M12 14l-4 8"/><path d="M12 14l4 8"/><path d="M12 14V6"/><circle cx="12" cy="4" r="2"/>',
  },
  qq: {
    viewBox: '0 0 24 24',
    path: '<ellipse cx="12" cy="10" rx="7" ry="8"/><path d="M5 14c-1 2-1.5 4-.5 4.5s2-.5 3-1.5"/><path d="M19 14c1 2 1.5 4 .5 4.5s-2-.5-3-1.5"/><circle cx="9.5" cy="9" r="1.2"/><circle cx="14.5" cy="9" r="1.2"/>',
  },
  weixin: {
    viewBox: '0 0 24 24',
    path: '<path d="M9 4C5.13 4 2 6.58 2 9.8c0 1.81 1.02 3.43 2.6 4.5l-.65 1.95 2.35-1.18c.86.24 1.78.38 2.7.38.33 0 .65-.02.97-.06"/><path d="M15 8c-3.31 0-6 2.24-6 5s2.69 5 6 5c.7 0 1.37-.1 2-.3l1.8.9-.5-1.5c1.27-.88 2.1-2.25 2.1-3.8 0-2.49-2.24-4.3-5.4-5.3"/><circle cx="8" cy="9" r="0.8"/><circle cx="11" cy="9" r="0.8"/><circle cx="13.5" cy="12" r="0.7"/><circle cx="16.5" cy="12" r="0.7"/>',
  },
}

const DISABLED_CHANNELS = new Set(['openim'])

function getIcon(icon?: string) {
  return ICON_SVGS[icon || ''] || ICON_SVGS.openim
}

export function ChannelPicker({
  channels,
  currentSessionId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onNavigateSession,
}: ChannelPickerProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<ImInstance | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const currentChannel = selectedType ? channels.find((ch) => ch.channel_type === selectedType) || null : null
  const instances = currentChannel?.instances || []

  const isBoundToCurrentSession = (inst: ImInstance) =>
    inst.bound_session_id === currentSessionId

  const selectType = useCallback((ch: ImChannel) => {
    if (DISABLED_CHANNELS.has(ch.channel_type)) return
    setSelectedType(ch.channel_type)
    if ((ch.instances || []).length === 0) {
      onCreate(ch.channel_type, ch.display_name || ch.channel_type)
    }
  }, [onCreate])

  const backToTypes = useCallback(() => {
    setSelectedType(null)
    setConfirmingDelete(null)
    setEditingId(null)
  }, [])

  const selectInstance = useCallback((inst: ImInstance) => {
    if (isBoundToCurrentSession(inst) || editingId === inst.id) return
    onSelect({ ...inst, channel_type: currentChannel?.channel_type, display_name: currentChannel?.display_name })
  }, [currentChannel, editingId, onSelect])

  const createInstance = useCallback(() => {
    if (!currentChannel) return
    onCreate(currentChannel.channel_type, '')
  }, [currentChannel, onCreate])

  const requestDelete = useCallback((inst: ImInstance) => {
    setConfirmingDelete(inst)
  }, [])

  const confirmDelete = useCallback(() => {
    const inst = confirmingDelete
    setConfirmingDelete(null)
    if (inst) onDelete(inst.id)
  }, [confirmingDelete, onDelete])

  const cancelDelete = useCallback(() => {
    setConfirmingDelete(null)
  }, [])

  const startRename = useCallback((inst: ImInstance) => {
    setEditingId(inst.id)
    setEditingName(inst.name || inst.id)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }, [])

  const submitRename = useCallback((instId: string) => {
    const name = editingName.trim()
    const orig = instances.find((i) => i.id === instId)
    if (name && name !== (orig?.name || '')) {
      onRename(instId, name)
    }
    setEditingId(null)
  }, [editingName, instances, onRename])

  const cancelRename = useCallback(() => {
    setEditingId(null)
  }, [])

  // Level 1: Channel type grid
  if (!selectedType) {
    return (
      <div className="channel-picker">
        <p className="picker-title">Select IM Channel</p>
        <div className="channel-grid">
          {channels.map((ch) => {
            const disabled = DISABLED_CHANNELS.has(ch.channel_type)
            return (
              <button
                key={ch.channel_type}
                className={`channel-card${disabled ? ' channel-card--disabled' : ''}`}
                disabled={disabled}
                onClick={() => selectType(ch)}
              >
                <svg width="28" height="28" viewBox={getIcon(ch.icon).viewBox} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: getIcon(ch.icon).path }}
                />
                <span className="channel-name">{ch.display_name}</span>
                {instances.length > 0 && (
                  <span className="instance-count">
                    {instances.length} instance{instances.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="channel-mode">{ch.binding_mode === 'qr_code' ? 'QR Code' : ch.binding_mode}</span>
              </button>
            )
          })}
        </div>
        {channels.length === 0 && (
          <p className="picker-empty">No IM channels available. Install a plugin first.</p>
        )}
      </div>
    )
  }

  // Level 2: Instance table
  return (
    <div className="channel-picker">
      <div className="instance-header">
        <button className="back-link" onClick={backToTypes}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <p className="picker-title">{currentChannel?.display_name} Instances</p>
      </div>

      {instances.length > 0 && (
        <div className="inst-table">
          <div className="inst-row inst-row--head">
            <span className="inst-col inst-col--channel">Channel</span>
            <span className="inst-col inst-col--name">Name</span>
            <span className="inst-col inst-col--appid">AppID</span>
            <span className="inst-col inst-col--session">Session</span>
            <span className="inst-col inst-col--actions"></span>
          </div>

          {instances.map((inst) => {
            const boundCurrent = isBoundToCurrentSession(inst)
            const boundOther = inst.bound_session_id && !boundCurrent
            return (
              <div
                key={inst.id}
                className={`inst-row${boundCurrent ? ' inst-row--bound' : ''}${boundOther ? ' inst-row--other' : ''}`}
                onClick={() => selectInstance(inst)}
              >
                <span className="inst-col inst-col--channel">
                  <svg width="16" height="16" viewBox={getIcon(currentChannel?.icon).viewBox} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: getIcon(currentChannel?.icon).path }}
                  />
                  {currentChannel?.display_name}
                </span>

                <span className="inst-col inst-col--name">
                  {editingId === inst.id ? (
                    <input
                      ref={renameInputRef}
                      className="rename-input"
                      value={editingName}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.stopPropagation(); submitRename(inst.id) }
                        if (e.key === 'Escape') { e.stopPropagation(); cancelRename() }
                      }}
                      onBlur={() => submitRename(inst.id)}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  ) : (
                    <>
                      <span className="name-text" title={inst.name || inst.id}>{inst.name || inst.id}</span>
                      <button className="edit-btn" onClick={(e) => { e.stopPropagation(); startRename(inst) }} title="Rename">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </>
                  )}
                </span>

                <span className="inst-col inst-col--appid" title={inst.app_id || '-'}>
                  <span className="appid-text">{inst.app_id || '-'}</span>
                </span>

                <span className="inst-col inst-col--session">
                  {inst.bound_session_id ? (
                    <a
                      className={`session-link${boundCurrent ? ' session-link--current' : ''}`}
                      href="#"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onNavigateSession(inst.bound_session_id!) }}
                      title={`Go to session ${inst.bound_session_id}`}
                    >{inst.bound_session_id.slice(0, 8)}</a>
                  ) : (
                    <span className="session-empty">-</span>
                  )}
                </span>

                <span className="inst-col inst-col--actions">
                  <button className="action-btn action-btn--delete" onClick={(e) => { e.stopPropagation(); requestDelete(inst) }} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                    </svg>
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      <button className="add-btn" onClick={createInstance}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Instance
      </button>

      {instances.length === 0 && <p className="picker-empty">No instances yet. Creating one...</p>}

      {/* Delete confirmation overlay */}
      {confirmingDelete && (
        <div className="confirm-overlay" onClick={cancelDelete}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <p className="confirm-title">Delete instance?</p>
            <p className="confirm-desc">
              <strong>{confirmingDelete.name || confirmingDelete.id}</strong> will be removed.
              {confirmingDelete.bound_session_id && ' The bound session will be disconnected.'}
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--cancel" onClick={cancelDelete}>Cancel</button>
              <button className="confirm-btn confirm-btn--ok" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
