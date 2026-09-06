import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLiveStore } from '../../stores/live-store'
import { useDemoMode } from '../../lib/demo-mode'
import { startDemoLive } from '../../lib/demo-live'
import { startLiveSocket } from '../../lib/ws'
import { cn } from '../../lib/cn'

/** Opens the fake or real stream and invalidates queries as events land. */
export function useLiveConnection() {
  const demo = useDemoMode()
  const qc = useQueryClient()
  useEffect(() => {
    const onEvent = (e: { type: string }) => {
      if (e.type === 'call.finished') {
        void qc.invalidateQueries({ queryKey: ['calls'] })
        void qc.invalidateQueries({ queryKey: ['analytics'] })
      }
      if (e.type.startsWith('approval.')) {
        void qc.invalidateQueries({ queryKey: ['approvals'] })
        void qc.invalidateQueries({ queryKey: ['analytics', 'overview'] })
      }
      if (e.type === 'server.status') void qc.invalidateQueries({ queryKey: ['servers'] })
    }
    return demo ? startDemoLive(onEvent) : startLiveSocket(onEvent)
  }, [demo, qc])
}

export function ConnectionDot({ withLabel = true }: { withLabel?: boolean }) {
  const c = useLiveStore((s) => s.connection)
  const color = c === 'live' ? 'bg-ion shadow-[0_0_8px_rgba(46,230,214,0.7)]' : c === 'demo' ? 'bg-held' : c === 'reconnecting' ? 'bg-held animate-pulse' : 'bg-fg-4'
  const label = c === 'live' ? 'Live' : c === 'demo' ? 'Simulated' : c === 'reconnecting' ? 'Reconnecting' : 'Offline'
  return (
    <span className="inline-flex items-center gap-2 t-caption text-fg-3">
      <span className={cn('inline-block w-2 h-2 rounded-full', color)} />
      {withLabel && label}
    </span>
  )
}

export function LiveBadge() {
  const n = useLiveStore((s) => s.pendingCount)
  if (!n) return null
  return (
    <span key={n} className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-held text-[#1a1200] t-caption font-semibold animate-[pop-badge_400ms_var(--ease-ui)]">
      {n}
    </span>
  )
}
