import { API_BASE } from '@/shared/lib/constants'
import type { ApiResponse } from '@/shared/types/api'

class HttpClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: number,
  ) {
    super(message)
    this.name = 'HttpClientError'
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = `${API_BASE}${url}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
    })

    if (!res.ok) {
      let errorMsg = `HTTP error: ${res.status} ${res.statusText}`
      try {
        const body = (await res.json()) as { message?: string }
        if (body?.message) {
          errorMsg = body.message
        }
      } catch {
        // ignore
      }
      throw new HttpClientError(errorMsg, res.status)
    }

    const contentType = res.headers.get('content-type')
    if (res.status === 204 || !contentType || !contentType.includes('application/json')) {
      return null as T
    }

    const json = (await res.json()) as ApiResponse<T>

    if (json.code !== 0) {
      throw new HttpClientError(json.message || 'Unknown API error', res.status, json.code)
    }

    return json.data
  } finally {
    clearTimeout(timeout)
  }
}

export function get<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET' })
}

export function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' })
}

export function patch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function put<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export { HttpClientError }
