import { cn } from '../../lib/cn'

interface Breakdown {
  label: string
  value: string
  weight: number
}

interface Props {
  score: number
  breakdown: Breakdown[]
  className?: string
}

function tone(score: number) {
  if (score < 35) return 'var(--color-allowed)'
  if (score < 70) return 'var(--color-held)'
  return 'var(--color-denied)'
}

/** How much a loadout weighs on the agent: 0 is lean, 100 is hopeless. */
export function OverloadMeter({ score, breakdown, className }: Props) {
  const r = 54
  const c = Math.PI * r // half circle
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = tone(score)

  return (
    <div className={cn('panel p-6 flex flex-col sm:flex-row gap-6 items-center', className)}>
      <div className="relative shrink-0 w-[160px] h-[92px]">
        <svg viewBox="0 0 140 80" className="w-full h-full" aria-hidden="true">
          <path
            d={`M 16 74 A ${r} ${r} 0 0 1 124 74`}
            fill="none"
            stroke="var(--color-raised)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={`M 16 74 A ${r} ${r} 0 0 1 124 74`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            className="overload-arc"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="font-display font-semibold text-[2rem] leading-none" style={{ color }}>
            {score}
          </span>
          <span className="t-caption text-fg-3 block">overload</span>
        </div>
      </div>
      <ul className="w-full flex flex-col gap-2 m-0 p-0 list-none">
        {breakdown.map((b) => (
          <li key={b.label} className="grid grid-cols-[1fr_auto] gap-x-4 items-baseline">
            <span className="t-body-sm text-fg-2">{b.label}</span>
            <span className="t-mono text-fg-1">{b.value}</span>
            <span className="col-span-2 h-px bg-raised mt-1.5 relative overflow-hidden">
              <span
                className="absolute inset-y-0 left-0"
                style={{ width: `${b.weight}%`, background: color, opacity: 0.8 }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
