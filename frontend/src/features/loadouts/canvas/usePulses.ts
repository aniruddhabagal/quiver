import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveStore } from '../../../stores/live-store'
import type { ToolSpec, WsEvent } from '../../../lib/types'
import type { Pulse } from './PulseEdge'

const IN_MS = 1200
const OUT_MS = 900
const CAP = 12

/**
 * Turns the live event stream into dots on the editor's wires for one loadout:
 * a call starts → a dot runs tool → quiver; a hold parks at the quiver; a
 * finished call that reached upstream runs quiver → endpoint.
 */
export function usePulses(loadoutId: string, tools: ToolSpec[]) {
  const [byEdge, setByEdge] = useState<Record<string, Pulse[]>>({})
  const [held, setHeld] = useState(0)
  const seen = useRef(0)
  const calls = useRef(new Map<string, string>()) // call_id -> tool id
  const timers = useRef(new Set<number>())
  const aliasMap = useMemo(() => new Map(tools.map((t) => [t.alias, t.id])), [tools])
  const aliasToTool = useRef(aliasMap)
  useEffect(() => {
    aliasToTool.current = aliasMap
  }, [aliasMap])

  useEffect(() => {
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id)
        fn()
      }, ms)
      timers.current.add(id)
    }
    const add = (edge: string, pulse: Pulse, ms: number) => {
      setByEdge((m) => {
        const cur = m[edge] ?? []
        if (cur.length >= CAP) return m
        return { ...m, [edge]: [...cur, pulse] }
      })
      later(ms, () => setByEdge((m) => ({ ...m, [edge]: (m[edge] ?? []).filter((p) => p.id !== pulse.id) })))
    }
    const handle = (e: WsEvent) => {
      if (e.type === 'call.started' && e.payload.loadout_id === loadoutId) {
        const toolId = aliasToTool.current.get(e.payload.alias)
        if (!toolId) return
        calls.current.set(e.payload.call_id, toolId)
        add(`e:t:${toolId}`, { id: e.payload.call_id, tone: 'arc' }, IN_MS)
      }
      if (e.type === 'call.decision' && e.payload.loadout_id === loadoutId) {
        if (e.payload.action === 'hold') setHeld((n) => n + 1)
      }
      if (e.type === 'call.finished' && e.payload.loadout_id === loadoutId) {
        const toolId = calls.current.get(e.payload.call_id)
        calls.current.delete(e.payload.call_id)
        if (e.payload.status === 'held_approved' || e.payload.status === 'held_denied' || e.payload.status === 'expired') setHeld((n) => Math.max(0, n - 1))
        if (e.payload.status === 'ok' || e.payload.status === 'held_approved') add('e:out', { id: `${e.payload.call_id}:out`, tone: 'ion' }, OUT_MS)
        if (e.payload.status === 'denied' || e.payload.status === 'rate_limited' || e.payload.status === 'held_denied') {
          if (toolId) add(`e:t:${toolId}`, { id: `${e.payload.call_id}:deny`, tone: 'denied' }, 500)
        }
      }
    }
    // replay nothing from the past; watch from now
    seen.current = useLiveStore.getState().events.length
    const unsub = useLiveStore.subscribe((s, prev) => {
      if (s.events === prev.events) return
      const fresh = s.events.length - prev.events.length
      if (fresh <= 0) return
      // events are prepended, newest first: process the first `fresh` in chronological order
      for (let i = fresh - 1; i >= 0; i--) handle(s.events[i])
    })
    return () => {
      unsub()
      for (const id of timers.current) window.clearTimeout(id)
      timers.current.clear()
    }
  }, [loadoutId])

  return { byEdge, held }
}
