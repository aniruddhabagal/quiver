import { useEffect, useRef, useState } from 'react'
import type { Outcome } from '../../../components/brand/OutcomeStamp'
import type { Layout } from './layout'

export type Phase = 'in' | 'park' | 'out' | 'flash'

export interface Pulse {
  id: number
  toolIdx: number
  outcome: Outcome
  phase: Phase
}

export interface Stamp {
  id: number
  outcome: Outcome
}

const IN_MS = 1300
const OUT_MS = 900
const PARK_MS = 4000
const FLASH_MS = 320
const STAMP_MS = 1400

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function decide(policy: 'allow' | 'approve'): Outcome {
  const r = Math.random()
  if (policy === 'approve') return r < 0.72 ? 'held' : r < 0.93 ? 'allowed' : 'denied'
  return r < 0.88 ? 'allowed' : 'denied'
}

/**
 * Drives the hero traffic: a pulse leaves a lit tool, reaches the cartridge,
 * a stamp lands, and the pulse either continues to the endpoint, parks for
 * approval, or dies. Each pulse is a chain of timeouts; nothing runs per frame.
 */
export function usePulses(layout: Layout, active: boolean) {
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [stamps, setStamps] = useState<Stamp[]>([])
  const timers = useRef<Set<number>>(new Set())
  const nextId = useRef(1)

  useEffect(() => {
    if (!active) return
    const pending = timers.current
    const litIdx = layout.tools.map((r, i) => (r.tool.lit ? i : -1)).filter((i) => i >= 0)
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        pending.delete(id)
        fn()
      }, ms)
      pending.add(id)
    }
    const setPhase = (id: number, phase: Phase) =>
      setPulses((ps) => ps.map((p) => (p.id === id ? { ...p, phase } : p)))
    const remove = (id: number) => setPulses((ps) => ps.filter((p) => p.id !== id))
    const stamp = (id: number, outcome: Outcome) => {
      setStamps((s) => [...s.slice(-2), { id, outcome }])
      later(STAMP_MS, () => setStamps((s) => s.filter((x) => x.id !== id)))
    }

    const launch = () => {
      const toolIdx = pick(litIdx)
      const outcome = decide(layout.tools[toolIdx].tool.policy)
      const id = nextId.current++
      setPulses((ps) => (ps.length >= 6 ? ps : [...ps, { id, toolIdx, outcome, phase: 'in' }]))
      later(IN_MS, () => {
        stamp(id, outcome)
        if (outcome === 'allowed') {
          setPhase(id, 'out')
          later(OUT_MS, () => remove(id))
        } else if (outcome === 'denied') {
          setPhase(id, 'flash')
          later(FLASH_MS, () => remove(id))
        } else {
          setPhase(id, 'park')
          later(PARK_MS, () => {
            const approved = Math.random() < 0.7
            stamp(id + 100000, approved ? 'allowed' : 'denied')
            if (approved) {
              setPhase(id, 'out')
              later(OUT_MS, () => remove(id))
            } else {
              setPhase(id, 'flash')
              later(FLASH_MS, () => remove(id))
            }
          })
        }
      })
    }

    let cancelled = false
    const loop = () => {
      if (cancelled) return
      launch()
      later(1500 + Math.random() * 700, loop)
    }
    later(200, loop)

    return () => {
      cancelled = true
      for (const id of pending) window.clearTimeout(id)
      pending.clear()
      setPulses([])
      setStamps([])
    }
  }, [layout, active])

  return { pulses, stamps }
}
