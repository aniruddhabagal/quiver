import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { PageHeader, Skeleton, Badge } from '../../components/ui/Bits'
import { useLoadouts, useOverview } from '../../lib/hooks'
import { useLiveStore } from '../../stores/live-store'
import { fmtCount, fmtTime } from '../../lib/format'
import { CallStatusStamp } from '../../features/calls/CallStatusStamp'
import { OverloadChip } from '../../features/loadouts/OverloadChip'
import { cn } from '../../lib/cn'

function Stat({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: 'held' | 'denied' | 'arc' }) {
  return (
    <div className="panel stat-tile p-5">
      <div className="t-caption text-fg-3">{label}</div>
      <div className={cn('font-display font-semibold text-[2.25rem] leading-none mt-2', tone === 'held' ? 'text-held' : tone === 'denied' ? 'text-denied' : tone === 'arc' ? 'text-arc-bright' : 'text-fg-1')}>{value}</div>
      {delta && <div className="t-caption text-fg-3 mt-2">{delta}</div>}
    </div>
  )
}

export default function Overview() {
  const overview = useOverview()
  const loadouts = useLoadouts()
  const events = useLiveStore((s) => s.events)
  const finished = events.filter((e) => e.type === 'call.finished').slice(0, 8)

  const o = overview.data
  const delta = o ? o.calls_24h - o.calls_prev_24h : 0

  return (
    <>
      <PageHeader title="Overview" description="What your agents did in the last day, and what is waiting on you." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {o ? (
          <>
            <Stat label="Calls, last 24 h" value={fmtCount(o.calls_24h)} delta={`${delta >= 0 ? '+' : ''}${delta} vs the day before`} />
            <Stat label="Held right now" value={String(o.held_now)} tone={o.held_now ? 'held' : undefined} delta={o.held_now ? 'Waiting for a decision' : 'Nothing waiting'} />
            <Stat label="Denied, last 24 h" value={fmtCount(o.denied_24h)} tone={o.denied_24h ? 'denied' : undefined} delta="Policy and rate limits" />
            <Stat label="Mean overload" value={String(o.mean_overload)} tone="arc" delta="Across published loadouts" />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[7.5rem]" />)
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] mt-8 items-start">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
            <h2 className="t-title">Live</h2>
            <Link to="/app/calls" className="link t-body-sm inline-flex items-center gap-1">
              All calls <ArrowUpRight size={14} />
            </Link>
          </div>
          {finished.length === 0 ? (
            <p className="px-5 py-8 t-body-sm text-fg-3">Waiting for the first call to finish.</p>
          ) : (
            <ul className="m-0 p-0 list-none">
              {finished.map((e) => {
                if (e.type !== 'call.finished') return null
                return (
                  <li key={e.payload.call_id} className="row-flash grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 px-5 py-2.5 border-t border-hairline first:border-t-0 t-mono">
                    <span className="text-fg-4 t-mono-xs">{fmtTime(e.ts)}</span>
                    <span className="text-fg-1 truncate">{e.payload.alias}</span>
                    <span className="text-fg-3 t-mono-xs">{e.payload.duration_ms} ms</span>
                    <CallStatusStamp status={e.payload.status} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
            <h2 className="t-title">Loadouts</h2>
            <Link to="/app/loadouts" className="link t-body-sm inline-flex items-center gap-1">
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          <ul className="m-0 p-0 list-none">
            {(loadouts.data ?? []).map((l) => (
              <li key={l.id} className="border-t border-hairline first:border-t-0">
                <Link to={`/app/loadouts/${l.id}`} className="flex items-center gap-3 px-5 py-3 no-underline hover:bg-glass transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg-1 truncate">{l.name}</span>
                      {l.published ? <Badge tone="ion">published</Badge> : <Badge>draft</Badge>}
                    </div>
                    <div className="t-caption text-fg-3 mt-0.5">
                      {l.tools.filter((t) => t.enabled).length} tools, v{l.current_version}
                    </div>
                  </div>
                  <OverloadChip score={l.overload.score} />
                </Link>
              </li>
            ))}
            {loadouts.isLoading && <li className="p-5"><Skeleton className="h-10" /></li>}
          </ul>
        </section>
      </div>
    </>
  )
}
