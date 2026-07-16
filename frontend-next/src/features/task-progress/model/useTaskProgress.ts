import { useMemo } from 'react'

interface ToolUseBlock {
  type: 'tool_use'
  id?: string
  name: string
  input?: Record<string, unknown>
}

interface ToolResultContent {
  tool_use_id: string
  content: unknown
}

interface Message {
  type: string
  content?: {
    blocks?: ToolUseBlock[]
    results?: ToolResultContent[]
    subtype?: string
    task_id?: string
    description?: string
    status?: string
    summary?: string
    last_tool_name?: string
  }
  timestamp?: number
}

const TASK_TOOL_NAMES = new Set(['TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet'])

function normalizePlanStatus(status?: string): string {
  if (status === 'running') return 'in_progress'
  if (status === 'done') return 'completed'
  return status || 'pending'
}

function toTaskId(value: unknown): string {
  if (value == null || value === '') return ''
  return String(value)
}

function parseToolResultContent(content: unknown): unknown {
  if (content == null) return null
  if (Array.isArray(content) || typeof content === 'object') return content
  if (typeof content === 'number') return content
  if (typeof content !== 'string') return null
  const trimmed = content.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

interface TaskRecord {
  id: string
  subject: string
  status: string
  description: string
  activeForm: string
}

function normalizeTaskRecord(rawTask: unknown, fallback: Partial<TaskRecord> = {}): TaskRecord | null {
  if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) return null
  const r = rawTask as Record<string, unknown>
  const id = toTaskId(r.taskId ?? r.task_id ?? r.id ?? fallback.id)
  if (!id) return null
  return {
    id,
    subject: String(r.subject || r.content || fallback.subject || ''),
    status: normalizePlanStatus(String(r.status || fallback.status || 'pending')),
    description: String(r.description || fallback.description || ''),
    activeForm: String(r.activeForm || r.active_form || fallback.activeForm || ''),
  }
}

function extractTaskRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>
    if (Array.isArray(p.tasks)) return p.tasks
    if (Array.isArray(p.items)) return p.items
    if (p.taskId != null || p.task_id != null || p.id != null) return [payload]
  }
  return []
}

function buildPendingTask(input: Record<string, unknown> = {}, tempId: string): TaskRecord {
  return {
    id: tempId,
    subject: String(input.subject || input.content || ''),
    status: normalizePlanStatus(String(input.status || 'pending')),
    description: String(input.description || ''),
    activeForm: String(input.activeForm || ''),
  }
}

interface RuntimeTask {
  task_id: string
  description: string
  status: string
  startTime: number
  endTime: number | null
  last_tool_name: string
  summary: string
}

interface PlanTaskCounts {
  pending: number
  in_progress: number
  completed: number
  total: number
}

interface RuntimeTaskCounts {
  running: number
  completed: number
  failed: number
  total: number
}

function buildTodoWriteTasks(messages: Message[], sessionRunning: boolean): TaskRecord[] {
  let latestTodos: Array<Record<string, unknown>> | null = null

  for (const msg of messages) {
    if (msg.type !== 'assistant' || !msg.content?.blocks) continue
    for (const block of msg.content.blocks) {
      if (block.type === 'tool_use' && block.name === 'TodoWrite' && block.input?.todos) {
        latestTodos = block.input.todos as Array<Record<string, unknown>>
      }
    }
  }

  if (!latestTodos) return []

  return latestTodos.map((todo, i) => {
    let todoStatus = normalizePlanStatus(String(todo.status || 'pending'))
    if (!sessionRunning && todoStatus === 'in_progress') {
      todoStatus = 'completed'
    }
    return {
      id: `plan-${i}`,
      subject: String(todo.subject || todo.content || ''),
      status: todoStatus,
      description: String(todo.description || ''),
      activeForm: String(todo.activeForm || ''),
    }
  })
}

function upsertTask(tasks: Record<string, TaskRecord>, order: string[], taskId: string, patch: Partial<TaskRecord>) {
  const prev = tasks[taskId] || { id: taskId, subject: '', status: 'pending', description: '', activeForm: '' }
  tasks[taskId] = { ...prev, ...patch, id: taskId, status: normalizePlanStatus(patch.status || prev.status) }
  if (!order.includes(taskId)) order.push(taskId)
}

function replaceTaskId(tasks: Record<string, TaskRecord>, order: string[], oldId: string, newId: string, patch: Partial<TaskRecord> = {}) {
  const prev = tasks[oldId] || {}
  delete tasks[oldId]
  const index = order.indexOf(oldId)
  if (index !== -1) order.splice(index, 1, newId)
  upsertTask(tasks, order, newId, { ...prev, ...patch, id: newId })
}

export function useTaskProgress(messages: Message[], status: string) {
  const allTasks: RuntimeTask[] = useMemo(() => {
    const taskMap: Record<string, RuntimeTask> = {}
    const now = Date.now()

    for (const msg of messages) {
      if (msg.type !== 'system' || !msg.content) continue
      const { subtype, task_id, description, status: taskStatus, summary, last_tool_name } = msg.content
      if (!task_id) continue

      if (subtype === 'task_started') {
        taskMap[task_id] = {
          task_id,
          description: description || '',
          status: 'running',
          startTime: msg.timestamp || now,
          endTime: null,
          last_tool_name: '',
          summary: '',
        }
      } else if (subtype === 'task_progress') {
        if (taskMap[task_id]) {
          if (description) taskMap[task_id].description = description
          if (last_tool_name) taskMap[task_id].last_tool_name = last_tool_name
        } else {
          taskMap[task_id] = {
            task_id,
            description: description || '',
            status: 'running',
            startTime: now,
            endTime: null,
            last_tool_name: last_tool_name || '',
            summary: '',
          }
        }
      } else if (subtype === 'task_notification') {
        if (taskMap[task_id]) {
          taskMap[task_id].status = taskStatus || 'completed'
          taskMap[task_id].summary = summary || ''
          taskMap[task_id].endTime = now
        }
      }
    }

    const all = Object.values(taskMap)
    const sessionRunning = status === 'running'
    if (!sessionRunning) {
      for (const t of all) {
        if (t.status === 'running') {
          t.status = 'completed'
          t.endTime = t.endTime || Date.now()
        }
      }
    }
    const running = all.filter(t => t.status === 'running').sort((a, b) => a.startTime - b.startTime)
    const done = all.filter(t => t.status !== 'running').sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    return [...running, ...done]
  }, [messages, status])

  const taskCounts: RuntimeTaskCounts = useMemo(() => {
    const counts = { running: 0, completed: 0, failed: 0, total: 0 }
    for (const t of allTasks) {
      counts.total++
      if (t.status === 'running') counts.running++
      else if (t.status === 'completed') counts.completed++
      else counts.failed++
    }
    return counts
  }, [allTasks])

  const planTasks: TaskRecord[] = useMemo(() => {
    const sessionRunning = status === 'running'
    const fallbackTodos = buildTodoWriteTasks(messages, sessionRunning)

    let hasTaskToolActivity = false
    let tasks: Record<string, TaskRecord> = {}
    let order: string[] = []
    const toolUseById: Record<string, { name: string; input?: Record<string, unknown> }> = {}
    const pendingCreatesByUseId: Record<string, TaskRecord> = {}

    for (const msg of messages) {
      if (msg.type === 'assistant' && msg.content?.blocks) {
        for (const block of msg.content.blocks) {
          if (block.type !== 'tool_use') continue

          if (TASK_TOOL_NAMES.has(block.name)) {
            hasTaskToolActivity = true
            if (block.id) toolUseById[block.id] = block
          }

          if (block.name === 'TaskCreate' && block.id) {
            const tempId = `pending:${block.id}`
            const pendingTask = buildPendingTask((block.input || {}) as Record<string, unknown>, tempId)
            pendingCreatesByUseId[block.id] = pendingTask
            upsertTask(tasks, order, tempId, pendingTask)
          }

          if (block.name === 'TaskUpdate') {
            const taskId = toTaskId((block.input as Record<string, unknown>)?.taskId ?? (block.input as Record<string, unknown>)?.task_id)
            if (!taskId) continue
            upsertTask(tasks, order, taskId, {
              subject: (block.input as Record<string, unknown>)?.subject as string,
              status: (block.input as Record<string, unknown>)?.status as string,
              description: (block.input as Record<string, unknown>)?.description as string,
              activeForm: (block.input as Record<string, unknown>)?.activeForm as string,
            })
          }
        }
      }

      if (msg.type === 'tool_result' && msg.content?.results) {
        for (const result of msg.content.results) {
          const toolUse = toolUseById[result.tool_use_id]
          if (!toolUse || !TASK_TOOL_NAMES.has(toolUse.name)) continue

          hasTaskToolActivity = true
          const parsed = parseToolResultContent(result.content)

          if (toolUse.name === 'TaskCreate') {
            const pendingTask = pendingCreatesByUseId[result.tool_use_id]
            let createdTask = normalizeTaskRecord(parsed, pendingTask)
            if (!createdTask && pendingTask) {
              const createdTaskId = toTaskId(parsed)
              if (createdTaskId) {
                createdTask = { ...pendingTask, id: createdTaskId }
              }
            }
            if (pendingTask && createdTask) {
              replaceTaskId(tasks, order, pendingTask.id, createdTask.id, createdTask)
            }
            continue
          }

          if (toolUse.name === 'TaskList') {
            const listedTasks = extractTaskRecords(parsed)
              .map((item: unknown) => normalizeTaskRecord(item))
              .filter((t): t is TaskRecord => t !== null)

            if (listedTasks.length > 0) {
              const nextTasks: Record<string, TaskRecord> = {}
              const nextOrder: string[] = []
              for (const task of listedTasks) {
                nextTasks[task.id] = { ...(tasks[task.id] || {}), ...task }
                nextOrder.push(task.id)
              }
              for (const existingId of order) {
                if (!nextTasks[existingId] && tasks[existingId]) {
                  nextTasks[existingId] = tasks[existingId]
                  nextOrder.push(existingId)
                }
              }
              tasks = nextTasks
              order = nextOrder
            }
            continue
          }

          if (toolUse.name === 'TaskGet') {
            const fetchedTask = normalizeTaskRecord(parsed)
            if (fetchedTask) {
              upsertTask(tasks, order, fetchedTask.id, fetchedTask)
            }
          }
        }
      }
    }

    let finalTasks = hasTaskToolActivity
      ? order.map(id => tasks[id]).filter(Boolean)
      : fallbackTodos

    if (!hasTaskToolActivity && finalTasks.length === 0) return []
    if (hasTaskToolActivity && finalTasks.length === 0) finalTasks = fallbackTodos

    if (!sessionRunning) {
      finalTasks = finalTasks.map(task => (
        task.status === 'in_progress'
          ? { ...task, status: 'completed' }
          : task
      ))
    }

    return finalTasks
  }, [messages, status])

  const planTaskCounts: PlanTaskCounts = useMemo(() => {
    const counts = { pending: 0, in_progress: 0, completed: 0, total: 0 }
    for (const t of planTasks) {
      counts.total++
      if (t.status === 'in_progress') counts.in_progress++
      else if (t.status === 'completed') counts.completed++
      else counts.pending++
    }
    return counts
  }, [planTasks])

  const hasPlanTasks = planTasks.length > 0

  return { allTasks, taskCounts, planTasks, planTaskCounts, hasPlanTasks }
}
