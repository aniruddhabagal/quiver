import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Popover } from 'radix-ui'
import { OutcomeStamp } from '../../components/brand/OutcomeStamp'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Field'
import { relTime } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Approval } from '../../lib/types'

interface Props {
  approval: Approval
  onDecide?: (decision: 'approved' | 'denied', reason?: string) => void
  busy?: boolean
  focused?: boolean
  compact?: boolean
}

function useCountdown(expiresAt: string, live: boolean) {
  const calc = () => Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => setLeft(calc()), 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, live])
  return left
}

export function ApprovalCard({ approval: a, onDecide, busy, focused, compact }: Props) {
  const pending = a.status === 'pending'
  const total = Math.max(1, Math.round((new Date(a.expires_at).getTime() - new Date(a.requested_at).getTime()) / 1000))
  const left = useCountdown(a.expires_at, pending)
  const pct = Math.min(1, left / total)
  const r = 14
  const c = 2 * Math.PI * r
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const [note, setNote] = useState('')

  const outcome = a.status === 'approved' ? 'allowed' : a.status === 'denied' ? 'denied' : 'held'

  return (
    <article className={cn('panel p-5 relative transition-shadow', focused && 'ring-2 ring-arc/60', pending && 'border-held/40')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <OutcomeStamp outcome={outcome} />
            {a.status === 'expired' && <span className="t-caption text-fg-3">expired</span>}
            <span className="t-caption text-fg-3">
              from {a.agent}, {relTime(a.requested_at)}
            </span>
          </div>
          <div className="mt-3 font-display font-semibold text-[1.375rem] leading-none text-fg-1 truncate">{a.alias}</div>
          <div className="t-body-sm text-fg-3 mt-1">
            {a.server_name}, via{' '}
            <Link to={`/app/loadouts/${a.loadout_id}`} className="link">
              {a.loadout_slug}
            </Link>
          </div>
        </div>
        {pending && (
          <div className="relative w-10 h-10 shrink-0" aria-label={`Expires in ${mm}:${ss}`}>
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-raised)" strokeWidth="2.5" />
              <circle cx="18" cy="18" r={r} fill="none" stroke={left < 30 ? 'var(--color-denied)' : 'var(--color-held)'} strokeWidth="2.5" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
            </svg>
            <span className="absolute inset-0 grid place-items-center t-mono-xs text-fg-2">{`${mm}:${ss}`}</span>
          </div>
        )}
      </div>

      {!compact && (
        <dl className="mt-4 codeblock p-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 m-0">
          {Object.entries(a.args_redacted).map(([k, v]) => {
            const s = typeof v === 'string' ? v : JSON.stringify(v)
            const redacted = typeof v === 'string' && v.includes('••')
            return (
              <div key={k} className="contents">
                <dt className="text-fg-3">{k}</dt>
                <dd className={cn('m-0 break-all', redacted ? 'text-held' : 'text-fg-1')}>
                  {s}
                  {redacted && <span className="text-fg-4 ml-2">redacted</span>}
                </dd>
              </div>
            )
          })}
          {Object.keys(a.args_redacted).length === 0 && <dd className="col-span-2 text-fg-4 m-0">no arguments</dd>}
        </dl>
      )}

      {pending && onDecide && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button variant="primary" size="sm" disabled={busy} onClick={() => onDecide('approved', note || undefined)}>
            Approve
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onDecide('denied', note || undefined)}>
            Deny
          </Button>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button type="button" className="link t-body-sm ml-1">
                {note ? 'Edit note' : 'Add a note'}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content sideOffset={8} align="start" className="z-50 w-72 panel p-3 shadow-xl">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why, for the audit log" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      )}

      {!pending && (
        <p className="t-caption text-fg-3 mt-4">
          {a.status === 'approved' && `Approved by ${a.decided_by ?? 'someone'} ${relTime(a.decided_at)}.`}
          {a.status === 'denied' && `Denied by ${a.decided_by ?? 'someone'} ${relTime(a.decided_at)}.${a.reason ? ` ${a.reason}` : ''}`}
          {a.status === 'expired' && 'Nobody answered in time. The agent received a clear refusal.'}
        </p>
      )}
    </article>
  )
}
