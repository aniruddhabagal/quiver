import { WS_URL } from './api'
import { tokens } from './token-store'
import { createEventSink, useLiveStore } from '../stores/live-store'
import type { WsEvent } from './types'

/** Real socket with backoff. Same event union as demo-live. */
export function startLiveSocket(onEvent?: (e: WsEvent) => void) {
  if (!WS_URL) return () => {}
  const sink = createEventSink()
  let ws: WebSocket | null = null
  let attempt = 0
  let closed = false
  let timer = 0

  const connect = () => {
    if (closed) return
    const token = tokens.access
    if (!token) {
      timer = window.setTimeout(connect, 1500)
      return
    }
    useLiveStore.getState().setConnection(attempt === 0 ? 'offline' : 'reconnecting')
    ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`)
    ws.onopen = () => {
      attempt = 0
      useLiveStore.getState().setConnection('live')
    }
    ws.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data as string) as WsEvent
        if (e.type === 'ping') return
        sink(e)
        onEvent?.(e)
      } catch {
        /* ignore malformed frames */
      }
    }
    ws.onclose = () => {
      if (closed) return
      useLiveStore.getState().setConnection('reconnecting')
      attempt += 1
      timer = window.setTimeout(connect, Math.min(15000, 500 * 2 ** attempt))
    }
    ws.onerror = () => ws?.close()
  }
  connect()

  return () => {
    closed = true
    window.clearTimeout(timer)
    ws?.close()
    useLiveStore.getState().setConnection('offline')
  }
}
