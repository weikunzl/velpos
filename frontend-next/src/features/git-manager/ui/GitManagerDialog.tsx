'use client'

import { useEffect, useState, useCallback } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { getGitConfig, setGitConfig, listSshKeys, generateSshKey } from '../api/gitApi'
import type { GitConfig, SshKey } from '../api/gitApi'

interface Props {
  open: boolean
  onClose: () => void
}

export function GitManagerDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [configSaved, setConfigSaved] = useState(false)

  const [sshKeys, setSshKeys] = useState<SshKey[]>([])
  const [generating, setGenerating] = useState(false)
  const [showGenForm, setShowGenForm] = useState(false)
  const [genKeyType, setGenKeyType] = useState('ed25519')
  const [genComment, setGenComment] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setConfigSaved(false)
    try {
      const [config, keys] = await Promise.all([getGitConfig(), listSshKeys()])
      setUserName(config.user_name || '')
      setUserEmail(config.user_email || '')
      setSshKeys(keys.keys || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load git config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadData()
      setShowGenForm(false)
    }
  }, [open, loadData])

  useEffect(() => {
    if (!configSaved) return
    const t = setTimeout(() => setConfigSaved(false), 2000)
    return () => clearTimeout(t)
  }, [configSaved])

  async function handleSaveConfig() {
    setSaving(true)
    setError('')
    setConfigSaved(false)
    try {
      const result = await setGitConfig(userName, userEmail)
      setUserName(result.user_name)
      setUserEmail(result.user_email)
      setConfigSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save git config')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      await generateSshKey(genKeyType, genComment)
      setShowGenForm(false)
      setGenComment('')
      const keys = await listSshKeys()
      setSshKeys(keys.keys || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate SSH key')
    } finally {
      setGenerating(false)
    }
  }

  async function copyPublicKey(publicKey: string, keyName: string) {
    try {
      await navigator.clipboard.writeText(publicKey)
      setCopiedKey(keyName)
      setTimeout(() => setCopiedKey(''), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = publicKey
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedKey(keyName)
      setTimeout(() => setCopiedKey(''), 2000)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Git Management" width="560px">
      {error && <div className="settings-error">{error}</div>}

      {loading ? (
        <div className="settings-loading">Loading...</div>
      ) : (
        <>
          {renderIdentitySection()}
          {renderSshSection()}
        </>
      )}
    </Modal>
  )

  function renderIdentitySection() {
    return (
      <div className="git-section">
        <h3 className="git-section-title">Git Identity</h3>
        <p className="git-section-desc">Configure the global git user for commits.</p>
        <div className="git-field-row">
          <label>user.name</label>
          <input
            className="settings-input git-mono-input"
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Velpos"
          />
        </div>
        <div className="git-field-row">
          <label>user.email</label>
          <input
            className="settings-input git-mono-input"
            type="text"
            value={userEmail}
            onChange={e => setUserEmail(e.target.value)}
            placeholder="velpos@local"
          />
        </div>
        <div className="git-section-actions">
          <button
            className="settings-btn settings-btn-primary"
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? 'Saving...' : configSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  function renderSshSection() {
    return (
      <div className="git-section">
        <div className="git-section-header">
          <div>
            <h3 className="git-section-title">SSH Keys</h3>
            <p className="git-section-desc">Manage SSH keys for GitHub authentication.</p>
          </div>
          {!showGenForm && (
            <button className="settings-btn" onClick={() => setShowGenForm(true)}>
              + Generate Key
            </button>
          )}
        </div>

        {showGenForm && (
          <div className="git-gen-form">
            <div className="git-field-row">
              <label>Type</label>
              <select className="settings-select" value={genKeyType} onChange={e => setGenKeyType(e.target.value)}>
                <option value="ed25519">Ed25519 (recommended)</option>
                <option value="rsa">RSA</option>
                <option value="ecdsa">ECDSA</option>
              </select>
            </div>
            <div className="git-field-row">
              <label>Comment</label>
              <input
                className="settings-input"
                type="text"
                value={genComment}
                onChange={e => setGenComment(e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
            <div className="git-gen-actions">
              <button className="settings-btn settings-btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating...' : 'Generate'}
              </button>
              <button className="settings-btn" onClick={() => setShowGenForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {sshKeys.length === 0 && !showGenForm && (
          <div className="git-empty">No SSH keys found. Generate one to get started.</div>
        )}

        {sshKeys.map(key => (
          <div key={key.name} className="git-key-card">
            <div className="git-key-info">
              <div className="git-key-name">{key.name}</div>
              <div className="git-key-meta">{key.type} &middot; {key.fingerprint}</div>
            </div>
            <button
              className={`git-btn-copy${copiedKey === key.name ? ' copied' : ''}`}
              onClick={() => copyPublicKey(key.public_key, key.name)}
              title={copiedKey === key.name ? 'Copied!' : 'Copy public key'}
            >
              {copiedKey === key.name ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
              {copiedKey === key.name ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    )
  }
}
