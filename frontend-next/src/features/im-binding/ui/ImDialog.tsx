'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useImBinding } from '../model/useImBinding'
import { ChannelPicker } from './ChannelPicker'
import { ChannelInitDialog, type UiData as ChannelInitUiData } from './ChannelInitDialog'
import { PromptBinder } from './PromptBinder'

interface ImDialogProps {
  visible: boolean
  sessionId?: string
  projectId?: string
  onClose: () => void
  onPrompt?: (prompt: string) => void
  onNavigateSession?: (sessionId: string) => void
}

export function ImDialog({ visible, sessionId = '', projectId = '', onClose, onPrompt, onNavigateSession }: ImDialogProps) {
  const {
    bindingState, loading, error, availableChannels, initRequired, syncResult,
    isBound, isBinding,
    fetchChannels, fetchStatus,
    handleCreateChannel, handleDeleteChannel, handleRenameChannel,
    handleBind, handleComplete, handleUnbind,
    handleInitialize, handleResetChannel, handleSyncContext,
    clearInitRequired, clearSyncResult, resetState,
  } = useImBinding()

  const [selectedInstance, setSelectedInstance] = useState<{
    id: string; name?: string; channel_type?: string; display_name?: string; init_status?: string
  } | null>(null)
  const [bindUiData, setBindUiData] = useState<{ mode?: string; prompt?: string; description?: string } | null>(null)
  const [friendUserId, setFriendUserId] = useState('')
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const bindingMode = bindingState?.ui_data?.mode || ''

  const stage = (() => {
    if (bindUiData) return 'prompt-confirm' as const
    if (isBound) return 'bound' as const
    if (initRequired) return 'init' as const
    if (isBinding) return bindingMode === 'prompt' ? 'prompt-binding' as const : 'qr-binding' as const
    return 'pick' as const
  })()

  // Reset on open
  useEffect(() => {
    if (visible) {
      resetState()
      setSelectedInstance(null)
      setBindUiData(null)
      setFriendUserId('')
      if (sessionId) fetchStatus(sessionId)
      fetchChannels()
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [visible, sessionId, fetchStatus, fetchChannels, resetState])

  // Render QR code when binding
  useEffect(() => {
    if (isBinding && bindingState?.ui_data?.qr_code_data && qrCanvasRef.current) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(qrCanvasRef.current!, bindingState!.ui_data!.qr_code_data!, {
          width: 200, margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).catch(() => {})
      })
    }
  }, [isBinding, bindingState?.ui_data?.qr_code_data])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [visible, onClose])

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => { closeTimerRef.current = null; onClose() }, 600)
  }, [onClose])

  // ── Handlers ──

  const onInstanceSelect = useCallback(async (instance: { id: string; name?: string; channel_type?: string; display_name?: string }) => {
    setSelectedInstance(instance)
    const result = await handleBind(sessionId, instance.id)
    if (!result) return
    if (result.action === 'init_required') return
    if (result.ui_data?.mode === 'prompt') {
      setBindUiData(result.ui_data as { mode?: string; prompt?: string; description?: string })
    } else if (result.binding_status === 'bound') {
      scheduleClose()
    }
  }, [sessionId, handleBind, scheduleClose])

  const onChannelCreate = useCallback(async (channelType: string, name: string) => {
    const result = await handleCreateChannel(channelType, name || channelType)
    if (result?.id) {
      const inst = { id: result.id, name: result.name, channel_type: result.channel_type, init_status: result.init_status }
      setSelectedInstance(inst)
      const bindResult = await handleBind(sessionId, result.id)
      if (!bindResult || bindResult.action === 'init_required') return
      if (bindResult.ui_data?.mode === 'prompt') {
        setBindUiData(bindResult.ui_data as { mode?: string; prompt?: string; description?: string })
      } else if (bindResult.binding_status === 'bound') {
        scheduleClose()
      }
    }
  }, [sessionId, handleCreateChannel, handleBind, scheduleClose])

  const onInitSubmit = useCallback(async (params: Record<string, string>) => {
    const channelId = initRequired?.channel_id || selectedInstance?.id
    if (!channelId) return
    const result = await handleInitialize(channelId, params)
    if (!result) return
    const initResult = result as unknown as { init_status: string; ui_data?: { prompt?: string; mode?: string }; error_message?: string }
    if (initResult.init_status === 'ready') {
      const bindResult = await handleBind(sessionId, channelId)
      clearInitRequired()
      if (bindResult?.ui_data?.mode === 'prompt') {
        setBindUiData(bindResult.ui_data as { mode?: string; prompt?: string; description?: string })
      } else if (bindResult?.binding_status === 'bound') {
        scheduleClose()
      }
    } else if (initResult.ui_data?.prompt) {
      onPrompt?.(initResult.ui_data.prompt)
      clearInitRequired()
      onClose()
    } else if (initResult.init_status === 'initializing' && initResult.ui_data) {
      // Update init state with new ui_data
    }
  }, [initRequired, selectedInstance, handleInitialize, handleBind, sessionId, clearInitRequired, scheduleClose, onPrompt, onClose])

  const onPromptStart = useCallback(async () => {
    const prompt = bindUiData?.prompt
    if (!prompt) return
    const channelId = selectedInstance?.id || bindingState?.channel_id
    if (channelId) await handleComplete(sessionId, channelId)
    onPrompt?.(prompt)
    onClose()
  }, [bindUiData, selectedInstance, bindingState, handleComplete, sessionId, onPrompt, onClose])

  const onQrComplete = useCallback(() => {
    const fid = friendUserId.trim()
    if (!fid) return
    const channelId = bindingState?.channel_id || selectedInstance?.id
    if (!channelId) return
    handleComplete(sessionId, channelId, { friend_user_id: fid })
  }, [friendUserId, bindingState, selectedInstance, handleComplete, sessionId])

  const onUnbind = useCallback(() => {
    handleUnbind(sessionId)
    setSelectedInstance(null)
    setBindUiData(null)
  }, [handleUnbind, sessionId])

  const onSyncContext = useCallback(async () => {
    clearSyncResult()
    const result = await handleSyncContext(sessionId)
    if (result && (result as Record<string, unknown>).synced != null && !(result as Record<string, unknown>).error) {
      scheduleClose()
    }
  }, [clearSyncResult, handleSyncContext, sessionId, scheduleClose])

  const onBack = useCallback(() => {
    setSelectedInstance(null)
    setBindUiData(null)
    clearInitRequired()
  }, [clearInitRequired])

  if (!visible) return null

  const renderStage = () => {
    switch (stage) {
      case 'pick':
        return (
          <div className="dialog-body">
            {loading ? (
              <div className="loading-state"><div className="spinner" /><span>Loading...</span></div>
            ) : (
              <ChannelPicker
                channels={availableChannels}
                currentSessionId={sessionId}
                onSelect={onInstanceSelect}
                onCreate={onChannelCreate}
                onDelete={(id) => handleDeleteChannel(id)}
                onRename={(id, name) => handleRenameChannel(id, name)}
                onNavigateSession={(sid) => { onNavigateSession?.(sid); onClose() }}
              />
            )}
          </div>
        )

      case 'init':
        return (
          <div className="dialog-body">
            <ChannelInitDialog
              channelType={initRequired?.channel_type || selectedInstance?.channel_type || ''}
              displayName={initRequired?.display_name || selectedInstance?.display_name || ''}
              initMode={initRequired?.init_mode || 'credentials'}
              initFields={initRequired?.init_fields || []}
              description={initRequired?.description || ''}
              initStatus={initRequired?.init_status || 'not_initialized'}
              uiData={(initRequired?.ui_data || {}) as ChannelInitUiData}
              disabled={loading}
              onSubmit={onInitSubmit}
              onBack={() => { clearInitRequired(); setSelectedInstance(null) }}
            />
          </div>
        )

      case 'prompt-confirm':
        return (
          <div className="dialog-body">
            <PromptBinder
              channelName={selectedInstance?.display_name || selectedInstance?.name || ''}
              description={bindUiData?.description || ''}
              prompt={bindUiData?.prompt || ''}
              disabled={loading}
              onStart={onPromptStart}
              onBack={onBack}
            />
          </div>
        )

      case 'qr-binding':
        return (
          <div className="dialog-body">
            <div className="state-section">
              <button className="back-link" onClick={onBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <div className="qr-container"><canvas ref={qrCanvasRef} /></div>
              <p className="state-desc">Scan the QR code with your IM app to add this session as a friend.</p>
              {bindingState?.im_user_id && (
                <div className="state-info">
                  <span className="info-label">IM User ID:</span>
                  <span className="info-value">{bindingState.im_user_id}</span>
                </div>
              )}
              <div className="complete-section">
                <p className="complete-hint">After scanning, enter the friend user ID to complete binding:</p>
                <div className="complete-row">
                  <input
                    className="complete-input"
                    placeholder="Friend User ID"
                    value={friendUserId}
                    onChange={(e) => setFriendUserId(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onQrComplete() }}
                  />
                  <button className="btn-primary btn-sm" onClick={onQrComplete} disabled={loading || !friendUserId.trim()}>
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'prompt-binding':
        return (
          <div className="dialog-body">
            <div className="state-section">
              <div className="bound-badge binding-badge">
                <div className="spinner-small" /> Binding...
              </div>
              <p className="state-desc">Channel binding is in progress.</p>
            </div>
          </div>
        )

      case 'bound':
        return (
          <div className="dialog-body">
            <div className="state-section">
              <div className="bound-badge"><span className="bound-dot" /> Connected</div>
              <div className="state-info">
                <span className="info-label">Channel:</span>
                <span className="info-value">{bindingState?.channel_type}</span>
              </div>
              {bindingState?.channel_address && (
                <div className="state-info">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{bindingState.channel_address}</span>
                </div>
              )}
              <div className="bound-actions">
                <button className="btn-sync" onClick={onSyncContext} disabled={loading}>
                  {loading && syncResult == null ? (
                    <><div className="spinner-small" /> Syncing...</>
                  ) : syncResult && (syncResult as Record<string, unknown>).synced != null ? (
                    <>Synced</>
                  ) : 'Sync Context'}
                </button>
                <button className="btn-switch" onClick={async () => { await handleUnbind(sessionId); setSelectedInstance(null); setBindUiData(null) }} disabled={loading}>
                  Switch Channel
                </button>
                <button className="btn-danger" onClick={onUnbind} disabled={loading}>Unbind</button>
              </div>
              {(syncResult != null && (syncResult as Record<string, unknown>).error != null) ? (
                <p className="sync-error">{String((syncResult as Record<string, unknown>).error)}</p>
              ) : null}
            </div>
          </div>
        )
    }
  }

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true" aria-label="IM Integration">
      <div className="dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">IM Integration</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {renderStage()}

        <div className="dialog-footer">
          <span className="footer-hint">Session: {sessionId || 'N/A'}</span>
        </div>
      </div>
    </div>
  )
}
