import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Download, Pause, Play } from 'lucide-react'
import { PageHeader, Skeleton, EmptyState } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { Input, NativeSelect } from '../../components/ui/Field'
import { CallStatusStamp } from '../../features/calls/CallStatusStamp'
import { CallDetailDrawer } from '../../features/calls/CallDetailDrawer'
import { useCalls, useLoadouts } from '../../lib/hooks'
import { apiFetch } from '../../lib/api'
import { fmtMs, fmtTime, fmtDate } from '../../lib/format'
import type { Call, CallStatus } from '../../lib/types'

const STATUSES: CallStatus[] = ['ok', 'held_approved', 'held_denied', 'denied', 'rate_limited', 'expired', 'error']

export default function Calls() {
  const [loadout, setLoadout] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState<Call | null>(null)
  const loadouts = useLoadouts()
  const calls = useCalls({ loadout_id: loadout || undefined, status: status || undefined, q: q || undefined, limit: 400 })
  const [frozen, setFrozen] = useState<Call[]>([])
  const rows = useMemo(() => (paused ? frozen : calls.data ?? []), [paused, frozen, calls.data])
  const togglePause = () => {
    if (!paused) setFrozen(calls.data ?? [])
    setPaused(!paused)
  }

  const parentRef = useRef<HTMLDivElement>(null)
  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 44, overscan: 12 })

  const exportJson = async () => {
    const data = await apiFetch<Call[]>('/calls/export')
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiver-calls.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <PageHeader
        title="Calls"
        description="Every tool call through every loadout, with what the policy did to it."
        actions={
          <>
            <Button variant="subtle" size="sm" onClick={togglePause}>
              {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? 'Resume' : 'Pause'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void exportJson()}>
              <Download size={14} /> Export
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <NativeSelect className="w-44" value={loadout} onChange={(e) => setLoadout(e.target.value)} aria-label="Loadout">
          <option value="">All loadouts</option>
          {(loadouts.data ?? []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect className="w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All outcomes</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </NativeSelect>
        <Input className="w-56" placeholder="Search tool or agent" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      </div>

      {calls.isLoading ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState title="No calls match." body="Loosen the filters, or wait for an agent to do something." />
      ) : (
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-[5.5rem_1fr_7rem_5rem_6.5rem] md:grid-cols-[5.5rem_1fr_8rem_8rem_5rem_6.5rem] gap-x-4 px-4 py-2 t-caption text-fg-3 border-b border-hairline">
            <span>Time</span>
            <span>Tool</span>
            <span className="hidden md:block">Loadout</span>
            <span>Agent</span>
            <span className="text-right">Took</span>
            <span className="text-right">Outcome</span>
          </div>
          <div ref={parentRef} className="max-h-[calc(100vh-22rem)] overflow-auto">
            <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
              {virt.getVirtualItems().map((v) => {
                const c = rows[v.index]
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="absolute left-0 right-0 grid grid-cols-[5.5rem_1fr_7rem_5rem_6.5rem] md:grid-cols-[5.5rem_1fr_8rem_8rem_5rem_6.5rem] gap-x-4 items-center px-4 text-left border-t border-hairline hover:bg-glass transition-colors"
                    style={{ transform: `translateY(${v.start}px)`, height: v.size }}
                  >
                    <span className="t-mono-xs text-fg-4">
                      {fmtDate(c.started_at)} {fmtTime(c.started_at)}
                    </span>
                    <span className="t-mono text-fg-1 truncate">
                      {c.alias}
                      {c.source === 'playground' && <span className="text-fg-4 ml-2 t-mono-xs">playground</span>}
                    </span>
                    <span className="hidden md:block t-body-sm text-fg-3 truncate">{c.loadout_slug}</span>
                    <span className="t-body-sm text-fg-3 truncate">{c.agent}</span>
                    <span className="t-mono-xs text-fg-2 text-right">{fmtMs(c.duration_ms)}</span>
                    <span className="flex justify-end">
                      <CallStatusStamp status={c.status} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <CallDetailDrawer call={selected} onClose={() => setSelected(null)} />
    </>
  )
}
