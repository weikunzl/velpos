/** Unified API response from backend */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** Session summary (from list endpoint) */
export interface SessionSummary {
  session_id: string
  name: string
  project_id: string
  project_dir: string
  status: string
  provider: string
  created_at: string
  updated_at: string
  model?: string
  permission_mode?: string
  git_branch?: string
  waiting_for_slot?: boolean
  recovery?: {
    pending_request?: unknown
    queued_command?: { prompt?: string }
    cancel_requested?: boolean
  }
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/** Full session detail */
export interface Session {
  session_id: string
  name: string
  project_id: string
  project_dir: string
  status: string
  provider: string
  model: string
  permission_mode: string
  created_at: string
  updated_at: string
  git_branch?: string
  waiting_for_slot?: boolean
  recovery?: SessionRecovery
  usage?: TokenUsage
}

export interface SessionRecovery {
  pending_request?: unknown
  queued_command?: { prompt?: string; type?: string }
  cancel_requested?: boolean
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  total_cost_usd?: number
}

export interface Project {
  id: string
  name: string
  path: string
  project_type?: string
  agents?: { current?: string }
}

export interface Message {
  _id?: number
  id?: string
  type: 'result' | 'text' | 'system' | 'interactive' | 'tool_use' | 'user' | 'assistant' | 'tool_result'
  content: Record<string, unknown>
  timestamp?: number
  role?: string
  update_last?: boolean
  update_message_index?: number
}

export interface RunStep {
  id: string
  run_id?: string
  step_type?: string
  name?: string
  status?: string
  started_time?: string
  completed_time?: string
  progress?: { current?: number; total?: number; label?: string }
  result?: string
  error?: string
}

export interface TimelineEvent {
  id: string
  run_id?: string
  seq?: number
  type?: string
  subtype?: string
  timestamp?: string
  data?: Record<string, unknown>
}

export interface QueryHistoryEntry {
  timestamp: number
  duration_ms: number
  num_turns: number
  is_error: boolean
  usage: { input_tokens: number; output_tokens: number }
  total_cost_usd: number
}

/** Per-session state held in memory */
export interface SessionState {
  session: Session | null
  messages: Message[]
  status: string
  error: string | null
  queryHistory: QueryHistoryEntry[]
  runSteps: RunStep[]
  timelineEvents: TimelineEvent[]
  queued: boolean
  queuedPrompt: string
  canceling: boolean
  cancelledHint: boolean
  queryStartedAt: number | null
  interactiveAnsweredKey: string | null
  queuedCommand: string | null
  restoredPrompt: string
}

// ---- WebSocket event types ----

export type WsEvent =
  | WsConnectedEvent
  | WsMessageEvent
  | WsStatusChangeEvent
  | WsMessagesSyncEvent
  | WsErrorEvent
  | WsDisconnectedEvent
  | WsCommandsUpdatedEvent
  | WsMessageQueuedEvent
  | WsResourceWaitingEvent
  | WsStreamWaitingEvent
  | WsAutoContinueEvent
  | WsRunStepEvent
  | WsTimelineEvent
  | WsUserChoiceEvent
  | WsPermissionRequestEvent
  | WsImUnboundEvent
  | WsVbEvent
  | WsCancelRewindEvent
  | WsStatusInfoEvent
  | WsGlobalEvent

interface WsBase {
  event: string
}

export interface WsConnectedEvent extends WsBase {
  event: 'connected'
  session: Session
  messages: Message[]
}

export interface WsMessageEvent extends WsBase {
  event: 'message'
  data: Message
}

export interface WsStatusChangeEvent extends WsBase {
  event: 'status_change'
  status: string
}

export interface WsMessagesSyncEvent extends WsBase {
  event: 'messages_sync'
  messages: Message[]
  session?: Session
}

export interface WsErrorEvent extends WsBase {
  event: 'error'
  message: string
}

export interface WsDisconnectedEvent extends WsBase {
  event: 'ws_disconnected'
  code?: number
}

export interface WsCommandsUpdatedEvent extends WsBase {
  event: 'commands_updated'
  commands: unknown[]
}

export interface WsMessageQueuedEvent extends WsBase {
  event: 'message_queued'
  prompt?: string
}

export interface WsResourceWaitingEvent extends WsBase {
  event: 'resource_waiting'
}

export interface WsStreamWaitingEvent extends WsBase {
  event: 'stream_waiting'
}

export interface WsAutoContinueEvent extends WsBase {
  event: 'auto_continue'
  attempt: number
  max: number
}

export interface WsRunStepEvent extends WsBase {
  event: 'run_step_started' | 'run_step_progress' | 'run_step_completed' | 'run_step_failed'
  step: RunStep
}

export interface WsTimelineEvent extends WsBase {
  event: 'timeline_event'
  timeline_event: TimelineEvent
}

export interface WsUserChoiceEvent extends WsBase {
  event: 'user_choice_request'
  tool_name: string
  questions: unknown[]
}

export interface WsPermissionRequestEvent extends WsBase {
  event: 'permission_request'
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface WsImUnboundEvent extends WsBase {
  event: 'im_unbound'
}

export interface WsVbEvent extends WsBase {
  event: 'vb_started' | 'vb_completed' | 'vb_failed'
  message?: string
}

export interface WsCancelRewindEvent extends WsBase {
  event: 'cancel_rewind'
  session: Session
  messages: Message[]
  prompt?: string
}

export interface WsStatusInfoEvent extends WsBase {
  event: 'status'
  session: Partial<Session>
}

export interface WsGlobalEvent extends WsBase {
  event: string
  session_id?: string
  [key: string]: unknown
}
