'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useScheduler } from '../model/useScheduler'

interface Props {
  visible: boolean
  projectId: string
  onClose: () => void
}

type ScheduleType = 'minutes' | 'hourly' | 'daily' | 'weekly'

interface FormState {
  name: string
  prompt: string
  schedule_type: ScheduleType
  interval_minutes: number
  interval_hours: number
  time: string
  weekday: number
  auto_unbind_after_run: boolean
  delete_session_on_success: boolean
}

const weekdays = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

const initialForm: FormState = {
  name: '',
  prompt: '',
  schedule_type: 'hourly',
  interval_minutes: 30,
  interval_hours: 1,
  time: '09:00',
  weekday: 0,
  auto_unbind_after_run: true,
  delete_session_on_success: false,
}

function parseTime(value: string) {
  const [hour, minute] = (value || '09:00').split(':').map(n => Number.parseInt(n, 10))
  return { hour: Number.isInteger(hour) ? hour : 9, minute: Number.isInteger(minute) ? minute : 0 }
}

function toCronExpr(value: FormState) {
  const time = parseTime(value.time)
  if (value.schedule_type === 'minutes') return `*/${Math.max(Number(value.interval_minutes) || 30, 1)} * * * *`
  if (value.schedule_type === 'hourly') return `${time.minute} */${Math.max(Number(value.interval_hours) || 1, 1)} * * *`
  if (value.schedule_type === 'daily') return `${time.minute} ${time.hour} * * *`
  return `${time.minute} ${time.hour} * * ${Number(value.weekday) || 0}`
}

function describeCron(expr: string) {
  const [minute, hour, , , weekday] = expr.split(' ')
  if (minute?.startsWith('*/')) return `Every ${minute.slice(2)} minutes`
  if (hour?.startsWith('*/')) return `Every ${hour.slice(2)} hours at minute ${minute}`
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  if (weekday !== '*') return `Every ${weekdays.find(day => day.value === Number(weekday))?.label || 'week'} at ${timeStr}`
  return `Every day at ${timeStr}`
}

function formatTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export function SchedulerDialog({ visible, projectId, onClose }: Props) {
  const { tasks, loading, saving, error, loadSchedules, saveNewSchedule, toggleSchedule, removeSchedule, runNow } = useScheduler()
  const [form, setForm] = useState<FormState>(initialForm)

  useEffect(() => {
    if (visible && projectId) {
      loadSchedules(projectId)
    }
  }, [visible, projectId, loadSchedules])

  const cronExpr = useMemo(() => toCronExpr(form), [form])

  const updateForm = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const submit = useCallback(async () => {
    await saveNewSchedule({
      project_id: projectId,
      name: form.name || 'Scheduled task',
      prompt: form.prompt,
      cron_expression: cronExpr,
      auto_unbind: form.auto_unbind_after_run,
      delete_on_success: form.delete_session_on_success,
    })
    if (!error) setForm(initialForm)
  }, [projectId, form, cronExpr, saveNewSchedule, error])

  if (!visible) return null

  return (
    <div className="scheduler-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="scheduler-dialog" role="dialog" aria-modal="true">
        <div className="scheduler-header">
          <div>
            <span className="scheduler-eyebrow">Automation timeline</span>
            <h3>Project Clock</h3>
            <p>Create sessions in this project and run scheduled work automatically.</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close scheduler">×</button>
        </div>

        {error && <div className="notice">{error}</div>}

        <div className="scheduler-body">
          <section className="schedule-form">
            <input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Name" aria-label="Schedule name" />

            <div className="schedule-type-grid">
              {(['minutes', 'hourly', 'daily', 'weekly'] as ScheduleType[]).map(type => (
                <button key={type} type="button" className={form.schedule_type === type ? 'active' : ''} onClick={() => updateForm('schedule_type', type)}>
                  {type === 'minutes' ? 'Every N minutes' : type === 'hourly' ? 'Every N hours' : type === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>

            {form.schedule_type === 'minutes' && (
              <input type="number" min={1} max={59} value={form.interval_minutes} onChange={e => updateForm('interval_minutes', Number(e.target.value))} placeholder="Minutes" />
            )}
            {form.schedule_type === 'hourly' && (
              <input type="number" min={1} max={23} value={form.interval_hours} onChange={e => updateForm('interval_hours', Number(e.target.value))} placeholder="Hours" />
            )}
            {form.schedule_type === 'weekly' && (
              <select value={form.weekday} onChange={e => updateForm('weekday', Number(e.target.value))}>
                {weekdays.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            )}
            {form.schedule_type !== 'minutes' && (
              <input type="time" value={form.time} onChange={e => updateForm('time', e.target.value)} />
            )}

            <div className="schedule-summary">{describeCron(cronExpr)}</div>

            <textarea
              value={form.prompt}
              onChange={e => updateForm('prompt', e.target.value)}
              placeholder="Describe the work this project session should run"
            />

            <label className="checkbox-field schedule-option">
              <input type="checkbox" checked={form.auto_unbind_after_run} onChange={e => updateForm('auto_unbind_after_run', e.target.checked)} />
              <span>Disconnect IM after each run</span>
            </label>
            <label className="checkbox-field schedule-option">
              <input type="checkbox" checked={form.delete_session_on_success} onChange={e => updateForm('delete_session_on_success', e.target.checked)} />
              <span>Delete successful execution session</span>
            </label>

            <button className="primary-btn" type="button" disabled={saving || !form.prompt || !projectId} onClick={submit}>
              {saving ? 'Saving...' : 'Create Project Clock'}
            </button>
          </section>

          <section className="schedule-list">
            <div className="schedule-list-header">
              <div>
                <span className="scheduler-eyebrow">Scheduled runs</span>
                <strong>{tasks.length} timeline{tasks.length !== 1 ? 's' : ''}</strong>
              </div>
            </div>

            {loading ? (
              <div className="empty">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="empty">No schedules</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`schedule-item${!task.enabled ? ' schedule-item--disabled' : ''}`}>
                  <div className="schedule-main">
                    <div className="schedule-title-row">
                      <div className="schedule-title">{task.name}</div>
                    </div>
                    <div className="schedule-meta">
                      {describeCron(task.cron_expression)} · next {formatTime(task.next_run_at)}
                      {task.auto_unbind && <span> · auto-disconnect</span>}
                      {task.delete_on_success && <span> · delete on success</span>}
                    </div>
                    <div className="schedule-prompt">{task.prompt}</div>
                    {task.runs?.length ? (
                      <div className="schedule-meta">
                        last run: {task.runs[0].status}{task.runs[0].result_session_id ? ` → ${task.runs[0].result_session_id}` : ''}
                      </div>
                    ) : null}
                  </div>
                  <div className="schedule-actions">
                    <button onClick={() => runNow(task.id)} disabled={saving}>Run now</button>
                    <button onClick={() => toggleSchedule(task)} disabled={saving}>{task.enabled ? 'Disable' : 'Enable'}</button>
                    <button className="danger" onClick={() => removeSchedule(task.id)} disabled={saving}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
