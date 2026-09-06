import { useSyncExternalStore } from 'react'

/**
 * Demo mode serves the whole app from in-memory fixtures. It is on when no API
 * is configured, when the API cannot be reached, or when a visitor asks for it.
 * The route table in demo-api.ts mirrors the real API paths one to one.
 */
const listeners = new Set<() => void>()
let enabled = !import.meta.env.VITE_API_URL
let manual = false

function notify() {
  for (const l of listeners) l()
}

export const demoMode = {
  get enabled() {
    return enabled
  },
  get manual() {
    return manual
  },
  set(on: boolean, byUser = false) {
    if (enabled === on && manual === (on && byUser)) return
    enabled = on
    manual = on && byUser
    notify()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}

export function useDemoMode() {
  return useSyncExternalStore(demoMode.subscribe, () => enabled, () => enabled)
}

export class DemoModeError extends Error {
  constructor(what = 'This action') {
    super(`${what} is disabled in demo mode. Sign in to use it for real.`)
    this.name = 'DemoModeError'
  }
}
