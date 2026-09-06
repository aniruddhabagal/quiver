import { useEffect, useState } from 'react'
import { OutcomeStamp } from '../../../components/brand/OutcomeStamp'
import { reducedMotion } from '../../../lib/motion'

const ARGS = [
  ['owner', '"acme"'],
  ['repo', '"billing"'],
  ['branch', '"hotfix/refund-loop"'],
  ['token', '"ghp_••••••••••••"'],
] as const

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** The approval card, exactly as it appears in the app. Interactive for fun. */
export function ApprovalCardMock() {
  const [left, setLeft] = useState(299)
  const [decision, setDecision] = useState<'approved' | 'denied' | null>(null)

  useEffect(() => {
    if (reducedMotion || decision) return
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 299)), 1000)
    return () => window.clearInterval(id)
  }, [decision])

  useEffect(() => {
    if (!decision) return
    const id = window.setTimeout(() => {
      setDecision(null)
      setLeft(299)
    }, 3200)
    return () => window.clearTimeout(id)
  }, [decision])

  const pct = left / 300
  const r = 14
  const c = 2 * Math.PI * r

  return (
    <div className="panel p-5 relative">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <OutcomeStamp outcome={decision === 'approved' ? 'allowed' : decision === 'denied' ? 'denied' : 'held'} animate={!!decision} />
            <span className="t-caption text-fg-3">from release-bot, 12 s ago</span>
          </div>
          <div className="mt-3 font-display font-semibold text-[1.375rem] leading-none text-fg-1">delete_branch</div>
          <div className="t-body-sm text-fg-3 mt-1">github, via ops-agent</div>
        </div>
        <div className="relative w-10 h-10 shrink-0" aria-label={`Expires in ${fmt(left)}`}>
          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
            <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-raised)" strokeWidth="2.5" />
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              stroke={left < 60 ? 'var(--color-denied)' : 'var(--color-held)'}
              strokeWidth="2.5"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center t-mono-xs text-fg-2">{fmt(left)}</span>
        </div>
      </div>

      <dl className="mt-4 codeblock p-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 m-0">
        {ARGS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-3">{k}</dt>
            <dd className={k === 'token' ? 'text-held m-0' : 'text-fg-1 m-0'}>
              {v}
              {k === 'token' && <span className="text-fg-4 ml-2">redacted</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setDecision('approved')} disabled={!!decision}>
          Approve
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDecision('denied')} disabled={!!decision}>
          Deny
        </button>
        <button type="button" className="link t-body-sm ml-1" disabled={!!decision}>
          Add a note
        </button>
      </div>
      <p className="t-caption text-fg-4 mt-4">
        {decision
          ? decision === 'approved'
            ? 'Forwarded to github. The agent gets its result now.'
            : 'The agent receives a clear refusal and moves on.'
          : 'Also posted to #ops-approvals. Expires in five minutes if nobody answers.'}
      </p>
    </div>
  )
}
