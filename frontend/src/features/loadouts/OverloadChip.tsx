import { cn } from '../../lib/cn'

export function overloadTone(score: number) {
  return score < 35 ? 'allowed' : score < 70 ? 'held' : 'denied'
}

export function OverloadChip({ score, className }: { score: number; className?: string }) {
  const tone = overloadTone(score)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 t-caption font-medium px-2 py-0.5 rounded-1 border',
        tone === 'allowed' && 'text-allowed border-allowed/40',
        tone === 'held' && 'text-held border-held/40',
        tone === 'denied' && 'text-denied border-denied/40',
        className,
      )}
      title="Overload score, 0 lean to 100 hopeless"
    >
      <span className="font-display font-semibold text-[0.9rem] leading-none">{score}</span>
      overload
    </span>
  )
}
