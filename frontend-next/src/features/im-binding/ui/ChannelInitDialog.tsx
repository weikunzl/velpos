'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UiData {
  verification_url?: string
  qr_code_url?: string
  qrcode?: string
  login_status?: string
}

interface ChannelInitDialogProps {
  channelType: string
  displayName?: string
  initMode?: string
  initFields?: string[]
  description?: string
  initStatus?: string
  uiData?: UiData
  disabled?: boolean
  onSubmit: (data: Record<string, string>) => void
  onBack: () => void
}

const FIELD_LABELS: Record<string, string> = {
  app_id: 'App ID',
  app_secret: 'App Secret',
  api_addr: 'API Address',
  ws_addr: 'WebSocket Address',
  admin_secret: 'Admin Secret',
  admin_user_id: 'Admin User ID',
  bot_token: 'Bot Token',
}

export function ChannelInitDialog({
  channelType,
  displayName = '',
  initMode = 'credentials',
  initFields = [],
  description = '',
  initStatus = 'not_initialized',
  uiData = {},
  disabled = false,
  onSubmit,
  onBack,
}: ChannelInitDialogProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [autoPolling, setAutoPolling] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isCredentialsMode = initMode === 'credentials'
  const isQrMode = initMode === 'qr_login'
  const isPromptMode = initMode === 'prompt'
  const hasVerificationUrl = !!uiData?.verification_url
  const hasQrImage = !!uiData?.qr_code_url

  // Auto-poll for QR login
  useEffect(() => {
    const shouldPoll = (uiData?.verification_url || uiData?.qr_code_url) && uiData?.qrcode
    if (shouldPoll && !pollTimerRef.current) {
      setAutoPolling(true)
      pollTimerRef.current = setInterval(() => {
        if (!disabled) {
          onSubmit({ step: 'poll', qrcode: uiData?.qrcode || '' })
        }
      }, 2500)
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      setAutoPolling(false)
    }
  }, [uiData?.verification_url, uiData?.qr_code_url, uiData?.qrcode, disabled, onSubmit])

  // Generate QR code from verification URL
  useEffect(() => {
    if (hasVerificationUrl && qrCanvasRef.current && uiData.verification_url) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(qrCanvasRef.current!, uiData.verification_url!, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        }).catch(() => {})
      })
    }
  }, [hasVerificationUrl, uiData.verification_url])

  const pollStatusText = uiData?.login_status === 'scaned' || uiData?.login_status === 'scanned'
    ? 'Scanned — confirm on your device'
    : 'Waiting for scan...'

  const loginStatusClass = uiData?.login_status === 'scaned' || uiData?.login_status === 'scanned'
    ? 'status-scanned' : 'status-waiting'

  const handleSubmit = useCallback(() => {
    onSubmit({ ...formValues })
  }, [formValues, onSubmit])

  const handlePollQr = useCallback(() => {
    onSubmit({ step: 'poll', qrcode: uiData?.qrcode || '' })
  }, [onSubmit, uiData?.qrcode])

  const updateField = useCallback((field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }))
  }, [])

  return (
    <div className="channel-init">
      <button className="back-link" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="init-header">
        <h3 className="init-title">Initialize {displayName || channelType}</h3>
        {description && <p className="init-desc">{description}</p>}
      </div>

      {/* Credentials mode */}
      {isCredentialsMode && (
        <>
          <div className="form-fields">
            {initFields.map((field) => (
              <div key={field} className="form-field">
                <label className="field-label">{FIELD_LABELS[field] || field}</label>
                <input
                  className="field-input"
                  type={field.includes('secret') || field.includes('token') ? 'password' : 'text'}
                  placeholder={FIELD_LABELS[field] || field}
                  value={formValues[field] || ''}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button className="btn-init" disabled={disabled} onClick={handleSubmit}>
            Initialize
          </button>
        </>
      )}

      {/* QR login mode */}
      {isQrMode && (
        <>
          {hasVerificationUrl ? (
            <div className="qr-section">
              <div className="qr-container">
                <canvas ref={qrCanvasRef} />
              </div>
              <a href={uiData.verification_url} target="_blank" rel="noopener" className="verify-link">
                Or open verification link
              </a>
              <div className="poll-status">
                <div className={`poll-indicator ${loginStatusClass}`}>
                  <div className="spinner-tiny" />
                  <span>{pollStatusText}</span>
                </div>
              </div>
              {!autoPolling && (
                <button className="btn-init" disabled={disabled} onClick={handlePollQr}>
                  Check Status
                </button>
              )}
            </div>
          ) : hasQrImage ? (
            <div className="qr-section">
              <div className="qr-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uiData.qr_code_url} alt="QR Code" className="qr-image" />
              </div>
              <p className="qr-hint">Scan with WeChat to connect</p>
              <div className="poll-status">
                <div className={`poll-indicator ${loginStatusClass}`}>
                  <div className="spinner-tiny" />
                  <span>{pollStatusText}</span>
                </div>
              </div>
              {!autoPolling && (
                <button className="btn-init" disabled={disabled} onClick={handlePollQr}>
                  Check Status
                </button>
              )}
            </div>
          ) : (
            <div className="qr-section">
              <button className="btn-init" disabled={disabled} onClick={() => onSubmit({ step: 'start' })}>
                Get QR Code
              </button>
            </div>
          )}
        </>
      )}

      {/* Prompt-based init mode */}
      {isPromptMode && (
        <div className="prompt-section">
          <p className="prompt-hint">
            This will send setup instructions to your Claude session.
            Follow the prompts to complete initialization (including QR scan if required).
          </p>
          <button className="btn-init" disabled={disabled} onClick={() => onSubmit({ step: 'start' })}>
            Start Setup
          </button>
        </div>
      )}
    </div>
  )
}
