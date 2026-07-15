'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { useSettingsManager } from '../model/useSettingsManager'
import type { ChannelProfile } from '../api/settingsApi'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const {
    settings,
    profiles,
    loading,
    saving,
    operating,
    error,
    fetchedModels,
    fetchingModels,
    loadData,
    saveSettings,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handleFetchModels,
  } = useSettingsManager()

  const [tab, setTab] = useState<'general' | 'profiles'>('general')
  const [settingsData, setSettingsData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  useEffect(() => {
    if (settings) {
      setSettingsData(settings as unknown as Record<string, unknown>)
    }
  }, [settings])

  async function handleSave() {
    await saveSettings(settingsData)
  }

  function renderGeneralTab() {
    const boolSetter = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setSettingsData((prev) => ({ ...prev, [key]: e.target.checked }))

    return (
      <div className="settings-section">
        {loading ? (
          <div className="settings-loading">Loading...</div>
        ) : (
          <>
            <div className="settings-field">
              <label className="settings-label">Default Permission Mode</label>
              <select
                className="settings-select"
                value={(settingsData?.permissions as Record<string, string>)?.defaultMode || 'default'}
                onChange={(e) =>
                  setSettingsData((prev) => ({
                    ...prev,
                    permissions: { ...((prev.permissions as Record<string, string>) || {}), defaultMode: e.target.value },
                  }))
                }
              >
                <option value="default">Default</option>
                <option value="acceptEdits">Accept Edits</option>
                <option value="plan">Plan</option>
                <option value="bypass">Bypass</option>
              </select>
            </div>

            <div className="settings-field">
              <label className="settings-label">Effort Level</label>
              <select
                className="settings-select"
                value={(settingsData?.effortLevel as string) || ''}
                onChange={(e) => setSettingsData((prev) => ({ ...prev, effortLevel: e.target.value || undefined }))}
              >
                <option value="">Default</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="settings-field settings-toggle-row">
              <span className="settings-label">Completed Onboarding</span>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settingsData?.hasCompletedOnboarding !== false}
                  onChange={(e) => setSettingsData((prev) => ({ ...prev, hasCompletedOnboarding: e.target.checked }))}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-field settings-toggle-row">
              <span className="settings-label">Skip Dangerous Mode Prompt</span>
              <label className="settings-toggle">
                <input type="checkbox" checked={!!settingsData?.skipDangerousPrompt} onChange={boolSetter('skipDangerousPrompt')} />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-field settings-toggle-row">
              <span className="settings-label">Disable Non-Essential Traffic</span>
              <label className="settings-toggle">
                <input type="checkbox" checked={!!settingsData?.disableNonEssential} onChange={boolSetter('disableNonEssential')} />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-field settings-toggle-row">
              <span className="settings-label">Agent Teams</span>
              <label className="settings-toggle">
                <input type="checkbox" checked={!!settingsData?.agentTeams} onChange={boolSetter('agentTeams')} />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-field settings-toggle-row">
              <span className="settings-label">Tool Search</span>
              <label className="settings-toggle">
                <input type="checkbox" checked={!!settingsData?.toolSearch} onChange={boolSetter('toolSearch')} />
                <span className="settings-toggle-slider" />
              </label>
            </div>

            <div className="settings-field">
              <label className="settings-label">Attribution Text</label>
              <input
                className="settings-input"
                type="text"
                value={(settingsData?.attribution as string) || ''}
                onChange={(e) => setSettingsData((prev) => ({ ...prev, attribution: e.target.value }))}
              />
            </div>

            {error && <div className="settings-error">{error}</div>}

            <button className="settings-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </>
        )}
      </div>
    )
  }

  const [addFormOpen, setAddFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const emptyForm = { name: '', host: '', api_key: '', auth_env_name: 'ANTHROPIC_API_KEY', model_config: {} as Record<string, string> }
  const [addForm, setAddForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  function renderProfilesTab() {
    return (
      <div className="settings-section">
        {loading ? (
          <div className="settings-loading">Loading...</div>
        ) : (
          <>
            <div className="settings-profiles-list">
              {profiles.length === 0 && (
                <div className="settings-empty">No channel profiles configured</div>
              )}
              {profiles.map((profile) => (
                <div key={profile.id} className={`settings-profile-card ${profile.is_active ? 'profile-active' : ''}`}>
                  <div className="profile-card-header">
                    <span className="profile-name">{profile.name}</span>
                    {profile.is_active && <span className="profile-active-badge">Active</span>}
                  </div>
                  <div className="profile-card-details">
                    <div className="profile-detail">
                      <span className="detail-label">Host</span>
                      <span className="detail-value">{profile.host}</span>
                    </div>
                    <div className="profile-detail">
                      <span className="detail-label">Auth</span>
                      <span className="detail-value">{profile.auth_env_name}</span>
                    </div>
                  </div>
                  <div className="profile-card-actions">
                    {!profile.is_active && (
                      <button
                        className="settings-btn settings-btn-primary"
                        onClick={() => handleActivate(profile.id)}
                        disabled={operating === profile.id}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      className="settings-btn"
                      onClick={() => {
                        setEditingId(profile.id)
                        setEditForm({
                          name: profile.name,
                          host: profile.host,
                          api_key: profile.api_key,
                          auth_env_name: profile.auth_env_name,
                          model_config: profile.model_config || {},
                        })
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="settings-btn settings-btn-danger"
                      onClick={() => handleDelete(profile.id)}
                      disabled={operating === profile.id}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {addFormOpen && (
              <div className="settings-profile-form">
                <h4 className="settings-form-title">New Channel Profile</h4>
                <ProfileFormFields form={addForm} onChange={setAddForm} />
                <div className="settings-form-actions">
                  <button className="settings-btn" onClick={() => { setAddFormOpen(false); setAddForm(emptyForm) }}>
                    Cancel
                  </button>
                  <button
                    className="settings-btn settings-btn-primary"
                    onClick={async () => {
                      await handleCreate(addForm)
                      setAddFormOpen(false)
                      setAddForm(emptyForm)
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {editingId && (
              <div className="settings-profile-form">
                <h4 className="settings-form-title">Edit Channel Profile</h4>
                <ProfileFormFields form={editForm} onChange={setEditForm} />
                <div className="settings-form-actions">
                  <button className="settings-btn" onClick={() => setEditingId(null)}>Cancel</button>
                  <button
                    className="settings-btn settings-btn-primary"
                    onClick={async () => {
                      await handleUpdate(editingId, editForm)
                      setEditingId(null)
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {!addFormOpen && !editingId && (
              <button className="settings-btn settings-btn-primary settings-add-btn" onClick={() => setAddFormOpen(true)}>
                + Add Channel Profile
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Settings" width="600px">
      <div className="settings-tabs">
        <button
          className={`settings-tab ${tab === 'general' ? 'settings-tab-active' : ''}`}
          onClick={() => setTab('general')}
        >
          General
        </button>
        <button
          className={`settings-tab ${tab === 'profiles' ? 'settings-tab-active' : ''}`}
          onClick={() => setTab('profiles')}
        >
          Channel Profiles
        </button>
      </div>

      {tab === 'general' ? renderGeneralTab() : renderProfilesTab()}
    </Modal>
  )
}

function ProfileFormFields({
  form,
  onChange,
}: {
  form: { name: string; host: string; api_key: string; auth_env_name: string; model_config: Record<string, string> }
  onChange: (f: typeof form) => void
}) {
  return (
    <>
      <div className="settings-field">
        <label className="settings-label">Name</label>
        <input className="settings-input" type="text" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
      </div>
      <div className="settings-field">
        <label className="settings-label">Host</label>
        <input className="settings-input" type="text" value={form.host} onChange={(e) => onChange({ ...form, host: e.target.value })} />
      </div>
      <div className="settings-field">
        <label className="settings-label">API Key</label>
        <input className="settings-input" type="password" value={form.api_key} onChange={(e) => onChange({ ...form, api_key: e.target.value })} />
      </div>
      <div className="settings-field">
        <label className="settings-label">Auth Environment Variable</label>
        <select className="settings-select" value={form.auth_env_name} onChange={(e) => onChange({ ...form, auth_env_name: e.target.value })}>
          <option value="ANTHROPIC_API_KEY">ANTHROPIC_API_KEY</option>
          <option value="ANTHROPIC_AUTH_TOKEN">ANTHROPIC_AUTH_TOKEN</option>
        </select>
      </div>
    </>
  )
}
