import { create } from 'zustand'
import type { ConnectionState, WsEvent } from '../lib/types'

const CAP = 500

interface LiveState {
  events: WsEvent[]
  connection: ConnectionState
  pendingCount: number
  lastEventAt: number
  push: (events: WsEvent[]) => void
  setConnection: (c: ConnectionState) => void
  setPending: (n: number) => void
}

export const useLiveStore = create<LiveState>((set) => ({
  events: [],
  connection: 'offline',
  pendingCount: 0,
  lastEventAt: 0,
  push: (incoming) =>
    set((s) => {
      let pending = s.pendingCount
      for (const e of incoming) {
        if (e.type === 'approval.pending') pending += 1
        if (e.type === 'approval.decided') pending = Math.max(0, pending - 1)
      }
      const events = [...incoming.reverse(), ...s.events].slice(0, CAP)
      return { events, pendingCount: pending, lastEventAt: Date.now() }
    }),
  setConnection: (connection) => set({ connection }),
  setPending: (pendingCount) => set({ pendingCount }),
}))

/** Batches events per animation frame so a burst never re-renders per event. */
export function createEventSink() {
  let queue: WsEvent[] = []
  let scheduled = false
  return (e: WsEvent) => {
    queue.push(e)
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      const batch = queue
      queue = []
      scheduled = false
      useLiveStore.getState().push(batch)
    })
  }
}
