import { Page, Route } from '@playwright/test'
import type { ApiResponse, SessionSummary, Session, Project, Message } from '../src/shared/types/api'

/* ── Mock data ── */

export const MOCK_PROJECTS: Project[] = [
  { id: 'proj-1', name: 'My App', path: '/home/user/my-app' },
  { id: 'proj-2', name: 'Docs Site', path: '/home/user/docs' },
]

export const MOCK_SESSIONS: SessionSummary[] = [
  {
    session_id: 'ses-1',
    name: 'Fix login bug',
    project_id: 'proj-1',
    project_dir: '/home/user/my-app',
    status: 'running',
    provider: 'claude',
    created_at: '2026-07-15T10:00:00Z',
    updated_at: '2026-07-15T12:30:00Z',
    model: 'claude-opus-4-6',
    permission_mode: 'acceptEdits',
    git_branch: 'fix/login',
  },
  {
    session_id: 'ses-2',
    name: 'Refactor API',
    project_id: 'proj-1',
    project_dir: '/home/user/my-app',
    status: 'completed',
    provider: 'claude',
    created_at: '2026-07-14T08:00:00Z',
    updated_at: '2026-07-14T16:00:00Z',
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 1500, output_tokens: 3200 },
  },
  {
    session_id: 'ses-3',
    name: 'Homepage redesign',
    project_id: 'proj-2',
    project_dir: '/home/user/docs',
    status: 'idle',
    provider: 'claude',
    created_at: '2026-07-13T14:00:00Z',
    updated_at: '2026-07-15T09:00:00Z',
  },
  {
    session_id: 'ses-4',
    name: 'Unplanned work',
    project_id: '',
    project_dir: '',
    status: 'error',
    provider: 'claude',
    created_at: '2026-07-12T10:00:00Z',
    updated_at: '2026-07-12T11:00:00Z',
  },
]

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    type: 'user',
    role: 'user',
    content: { text: 'Can you fix the login redirect issue?' },
    timestamp: Date.now() - 60000,
  },
  {
    id: 'msg-2',
    type: 'text',
    role: 'assistant',
    content: { text: "I'll look into the login redirect. Let me check the auth flow first." },
    timestamp: Date.now() - 50000,
  },
  {
    id: 'msg-3',
    type: 'tool_use',
    role: 'assistant',
    content: { text: 'Reading auth middleware...' },
    timestamp: Date.now() - 40000,
  },
]

export const MOCK_SETTINGS = {
  permissions: { defaultMode: 'acceptEdits' },
  effortLevel: 'medium',
  hasCompletedOnboarding: true,
  skipDangerousPrompt: false,
  disableNonEssential: false,
  agentTeams: false,
  toolSearch: true,
  attribution: '',
}

export const MOCK_CHANNEL_PROFILES = [
  {
    id: 'cp-1',
    name: 'Anthropic Direct',
    host: 'https://api.anthropic.com',
    api_key: 'sk-ant-****',
    auth_env_name: 'ANTHROPIC_API_KEY',
    model_config: { 'claude-opus-4-6': 'claude-opus-4-6' },
    is_active: true,
  },
  {
    id: 'cp-2',
    name: 'OpenRouter',
    host: 'https://openrouter.ai/api/v1',
    api_key: 'sk-or-****',
    auth_env_name: 'ANTHROPIC_API_KEY',
    model_config: {},
    is_active: false,
  },
]

/* ── API route interceptor helpers ── */

/** Wrap data in a standard ApiResponse envelope with code 0 (success). */
function ok<T>(data: T): string {
  const resp: ApiResponse<T> = { code: 0, message: 'ok', data }
  return JSON.stringify(resp)
}

function jsonHeaders() {
  return { 'content-type': 'application/json' }
}

/** Wrap error in ApiResponse with non-zero code. */
function fail(message: string, code = 1): string {
  const resp: ApiResponse<null> = { code, message, data: null }
  return JSON.stringify(resp)
}

/**
 * Install REST API mocks on the page.
 * Call this in `test.beforeEach` or at the top of each test group.
 */
export async function mockApiRoutes(page: Page) {
  // Catch-all first so later, more-specific routes take precedence (LIFO matching).
  await page.route('**/api/**', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null) })
  })

  // ── Sessions ──
  await page.route('**/api/sessions', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ headers: jsonHeaders(), body: ok({ sessions: MOCK_SESSIONS }) })
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON?.() || {}
      const newSession: Session = {
        session_id: `ses-${Date.now()}`,
        name: body.name || 'New Session',
        project_id: body.project_id || '',
        project_dir: body.project_dir || '',
        status: 'idle',
        provider: body.provider || 'claude',
        model: 'claude-opus-4-6',
        permission_mode: 'acceptEdits',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await route.fulfill({ headers: jsonHeaders(), body: ok(newSession) })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Single session ──
  await page.route('**/api/sessions/*', async (route: Route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (method === 'DELETE') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else if (method === 'PATCH') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else if (method === 'GET') {
      const sessionId = url.split('/').pop() || ''
      const summary = MOCK_SESSIONS.find((s) => s.session_id === sessionId)
      if (summary) {
        const full: Session = { ...summary, model: summary.model || 'claude-opus-4-6', permission_mode: summary.permission_mode || 'acceptEdits' }
        await route.fulfill({ headers: jsonHeaders(), body: ok(full)  })
      } else {
        await route.fulfill({ headers: jsonHeaders(), status: 404, body: fail('Session not found')  })
      }
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Session: branches ──
  await page.route('**/api/sessions/*/branches', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ headers: jsonHeaders(), body: ok([])  })
    } else if (route.request().method() === 'POST') {
      await route.fulfill({ headers: jsonHeaders(), body: ok({ session_id: 'branch-new', name: 'Branch', status: 'idle', provider: 'claude', created_at: new Date().toISOString(), updated_at: new Date().toISOString()  }) })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Session: compare ──
  await page.route('**/api/sessions/*/compare*', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok({ message_diff: [], git_diff_summary: ''  }) })
  })

  // ── Session: clear-context ──
  await page.route('**/api/sessions/*/clear-context', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  // ── Session: compact ──
  await page.route('**/api/sessions/*/compact', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  // ── Session converge ──
  await page.route('**/api/sessions/*/branches/converge', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  // ── Session batch delete ──
  await page.route('**/api/sessions/batch-delete', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  // ── Session models ──
  await page.route('**/api/sessions/meta/models*', async (route: Route) => {
    await route.fulfill({
      body: ok([
        { id: 'claude-opus-4-6', name: 'Claude Opus 4' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4' },
        { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5' },
      ]),
    })
  })

  // ── Projects ──
  await page.route('**/api/projects', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(MOCK_PROJECTS)  })
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON?.() || {}
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: body.name || 'New Project',
        path: body.path || '/tmp/new-project',
      }
      await route.fulfill({ headers: jsonHeaders(), body: ok(newProject)  })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Single project ──
  await page.route('**/api/projects/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Projects reorder ──
  await page.route('**/api/projects/reorder', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  // ── Settings ──
  await page.route('**/api/settings', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(MOCK_SETTINGS)  })
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Channel profiles ──
  await page.route('**/api/im/channel-profiles*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(MOCK_CHANNEL_PROFILES)  })
    } else if (route.request().method() === 'POST') {
      await route.fulfill({ headers: jsonHeaders(), body: ok({ id: 'cp-new', ...route.request().postDataJSON?.()  }) })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  await page.route('**/api/im/channel-profiles/*/activate', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
  })

  await page.route('**/api/im/channel-profiles/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({ headers: jsonHeaders(), body: ok(null)  })
    } else {
      await route.fulfill({ headers: jsonHeaders(), status: 405  })
    }
  })

  // ── Plugin list ──
  await page.route('**/api/plugins*', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok([])  })
  })

  // ── Workspace / git ──
  await page.route('**/api/workspace/**', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok({ entries: [], recent_changes: []  }) })
  })

  await page.route('**/api/git/**', async (route: Route) => {
    await route.fulfill({ headers: jsonHeaders(), body: ok({}) })
  })

  // ── Intercept WebSocket ──
  await page.route('**/ws/**', async (route: Route) => {
    route.abort()
  })
}

/**
 * Wait for the app to finish loading (skeleton screen gone).
 */
export async function waitForAppReady(page: Page) {
  // Wait for the sidebar to render sessions (the "No sessions yet" text won't appear
  // because we mock sessions, so wait for a session item to appear).
  await page.waitForSelector('[data-session-id]', { timeout: 15000 })
}

/**
 * Helper: create a session via the sidebar "New session" button.
 */
export async function createSessionViaSidebar(page: Page) {
  // Click the + button in the sidebar header
  const newBtn = page.locator('.sidebar-header-btn[title="New session"]')
  await newBtn.click()
  await page.waitForTimeout(500)
}

/**
 * Helper: open a dialog by clicking its toolbar button.
 */
export async function openToolbarDialog(page: Page, dialogTitle: string) {
  const btn = page.locator(`.header-toolbar-btn[title="${dialogTitle}"]`)
  await btn.click()
  await page.waitForTimeout(300)
}
