import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get, post, del, patch, put, HttpClientError } from '../httpClient'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/api')
})
afterEach(() => {
  vi.unstubAllEnvs()
  mockFetch.mockReset()
})

async function flush(): Promise<void> {
  // small delay to let microtasks flush
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('HttpClientError', () => {
  it('creates error with message only', () => {
    const err = new HttpClientError('oops')
    expect(err.message).toBe('oops')
    expect(err.status).toBeUndefined()
    expect(err.code).toBeUndefined()
    expect(err.name).toBe('HttpClientError')
  })

  it('creates error with status and code', () => {
    const err = new HttpClientError('not found', 404, 1001)
    expect(err.message).toBe('not found')
    expect(err.status).toBe(404)
    expect(err.code).toBe(1001)
  })
})

describe('get', () => {
  it('returns data on successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: { id: 1 } }),
    })
    const result = await get<{ id: number }>('/sessions')
    expect(result).toEqual({ id: 1 })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('throws HttpClientError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ message: 'server error' }),
    })
    const err = await get<never>('/fail').catch(e => e)
    expect(err).toBeInstanceOf(HttpClientError)
    expect(err.message).toBe('server error')
  })

  it('throws with status text when JSON body has no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map(),
      json: () => Promise.resolve({}),
    })
    await expect(get('/notfound')).rejects.toThrow('HTTP error: 404 Not Found')
  })

  it('throws generic on json parse failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Map(),
      json: () => Promise.reject(new SyntaxError('bad json')),
    })
    await expect(get('/bad')).rejects.toThrow('HTTP error: 400 Bad Request')
  })

  it('returns null for 204 no content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Map(),
      json: () => Promise.resolve({}),
    })
    const result = await get('/empty')
    expect(result).toBeNull()
  })

  it('returns null when content-type is not json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      json: () => Promise.resolve({}),
    })
    const result = await get('/text')
    expect(result).toBeNull()
  })

  it('throws when API code is non-zero', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 1001, message: 'permission denied', data: null }),
    })
    await expect(get('/perm')).rejects.toThrow('permission denied')
  })

  it('throws generic when API code non-zero with no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 9999, message: '', data: null }),
    })
    await expect(get('/unknown')).rejects.toThrow('Unknown API error')
  })

  it('starts fetch with a signal for timeout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: 'ok' }),
    })
    const result = await get<string>('/signal-test')
    expect(result).toBe('ok')
    expect(mockFetch.mock.calls[0][1].signal).toBeDefined()
  })

  it('aborts and rejects on network failure (e.g. timeout)', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    mockFetch.mockRejectedValueOnce(abortError)
    try {
      await get('/abort-test')
    } catch {
      /* expected */
    }
    expect(mockFetch.mock.calls[0][1].signal).toBeDefined()
  })

  it('fires abort callback on 30s timeout', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: (...args: unknown[]) => unknown, _ms: number, ...args: unknown[]) => {
      (fn as Function)(...args)
      return 1 as unknown as NodeJS.Timeout
    })
    mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
    await expect(get<never>('/abort-fire')).rejects.toThrow()
    vi.restoreAllMocks()
  })
})

describe('post', () => {
  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: { id: 2 } }),
    })
    const result = await post('/sessions', { name: 'test' })
    expect(result).toEqual({ id: 2 })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    )
  })

  it('sends POST without body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: null }),
    })
    await post('/no-body')
    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.body).toBeUndefined()
  })
})

describe('del', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: null }),
    })
    await del('/sessions/1')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('patch', () => {
  it('sends PATCH with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: null }),
    })
    await patch('/sessions/1', { status: 'active' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }),
    )
  })
})

describe('put', () => {
  it('sends PUT with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ code: 0, message: '', data: null }),
    })
    await put('/sessions/1', { name: 'updated' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sessions/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      }),
    )
  })
})
