import { demoMode } from './demo-mode'
import { demoRequest } from './demo-api'
import { tokens } from './token-store'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? (API_URL ? API_URL.replace(/^http/, 'ws') + '/ws' : '')

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | null | undefined>
  auth?: boolean
}

function withParams(path: string, params?: Options['params']) {
  if (!params) return path
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${path}${path.includes('?') ? '&' : '?'}${s}` : path
}

let refreshing: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const rt = tokens.refresh
    if (!rt) return false
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as { access_token: string; refresh_token: string }
      tokens.set(data.access_token, data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/**
 * The one HTTP client. Paths omit /api/v1. In demo mode the request is served
 * from memory; a network failure against a real API flips demo mode on so the
 * page keeps working and says so.
 */
export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const full = withParams(path, opts.params)
  const method = opts.method ?? 'GET'

  if (demoMode.enabled) return (await demoRequest(method, full, opts.body)) as T

  const doFetch = async () => {
    const headers: Record<string, string> = {}
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (opts.auth !== false && tokens.access) headers.Authorization = `Bearer ${tokens.access}`
    return fetch(`${API_URL}/api/v1${full}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  }

  let res: Response
  try {
    res = await doFetch()
  } catch (err) {
    if (err instanceof TypeError) {
      demoMode.set(true)
      return (await demoRequest(method, full, opts.body)) as T
    }
    throw err
  }

  if (res.status === 401 && opts.auth !== false) {
    const ok = await refreshTokens()
    if (ok) res = await doFetch()
    if (res.status === 401) {
      tokens.clear()
      if (!location.pathname.startsWith('/login')) location.assign('/login')
    }
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : undefined
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | undefined)?.detail
    throw new ApiError(res.status, typeof detail === 'string' ? detail : `Request failed (${res.status})`, data)
  }
  return data as T
}
