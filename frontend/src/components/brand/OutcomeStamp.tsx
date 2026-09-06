import { cn } from '../../lib/cn'

export type Outcome = 'allowed' | 'held' | 'denied'

const LABEL: Record<Outcome, string> = {
  allowed: 'ALLOWED',
  held: 'HELD',
  denied: 'DENIED',
}

interface Props {
  outcome: Outcome
  animate?: boolean
  className?: string
}

export function OutcomeStamp({ outcome, animate = false, className }: Props) {
  return (
    <span className={cn('stamp', `stamp--${outcome}`, animate && 'stamp--live', className)}>
      {LABEL[outcome]}
    </span>
  )
}
