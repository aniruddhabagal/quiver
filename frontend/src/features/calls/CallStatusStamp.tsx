import { cn } from '../../lib/cn'
import type { CallStatus } from '../../lib/types'

const MAP: Record<CallStatus, { label: string; cls: string }> = {
  ok: { label: 'ALLOWED', cls: 'stamp--allowed' },
  held_approved: { label: 'APPROVED', cls: 'stamp--allowed' },
  held_denied: { label: 'DENIED', cls: 'stamp--denied' },
  denied: { label: 'DENIED', cls: 'stamp--denied' },
  rate_limited: { label: 'LIMITED', cls: 'stamp--denied' },
  expired: { label: 'EXPIRED', cls: 'stamp--held' },
  error: { label: 'ERROR', cls: 'stamp--held' },
}

export function CallStatusStamp({ status, className }: { status: CallStatus; className?: string }) {
  const m = MAP[status]
  return <span className={cn('stamp', m.cls, className)}>{m.label}</span>
}
