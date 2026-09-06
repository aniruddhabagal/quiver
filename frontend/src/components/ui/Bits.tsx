import type { ReactNode } from 'react'
import { Switch as RSwitch, Tooltip as RTooltip } from 'radix-ui'
import { cn } from '../../lib/cn'

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'arc' | 'ion' | 'allowed' | 'held' | 'denied'; className?: string }) {
  const tones = {
    neutral: 'text-fg-2 border-hairline-strong',
    arc: 'text-arc-bright border-arc/50 bg-arc/10',
    ion: 'text-ion-bright border-ion/50 bg-ion/10',
    allowed: 'text-allowed border-allowed/50 bg-allowed/10',
    held: 'text-held border-held/50 bg-held/10',
    denied: 'text-denied border-denied/50 bg-denied/10',
  }
  return <span className={cn('inline-flex items-center gap-1 t-caption font-medium px-2 py-0.5 rounded-1 border', tones[tone], className)}>{children}</span>
}

export function StatusDot({ status, className }: { status: 'healthy' | 'degraded' | 'down' | 'unknown'; className?: string }) {
  const color = status === 'healthy' ? 'bg-allowed' : status === 'degraded' ? 'bg-held' : status === 'down' ? 'bg-denied' : 'bg-fg-4'
  return <span className={cn('inline-block w-2 h-2 rounded-full', color, status === 'healthy' && 'shadow-[0_0_8px_rgba(70,242,160,0.6)]', className)} aria-label={status} />
}

export function Switch({ checked, onCheckedChange, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; id?: string; disabled?: boolean }) {
  return (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative w-10 h-6 rounded-full bg-raised border border-hairline data-[state=checked]:bg-arc data-[state=checked]:border-arc transition-colors disabled:opacity-50"
    >
      <RSwitch.Thumb className="block w-4 h-4 rounded-full bg-fg-1 translate-x-1 data-[state=checked]:translate-x-[1.15rem] transition-transform" />
    </RSwitch.Root>
  )
}

export function Tip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content sideOffset={6} className="z-50 rounded-1 bg-raised border border-hairline-strong px-2.5 py-1.5 t-caption text-fg-1 shadow-lg">
            {label}
            <RTooltip.Arrow className="fill-raised" />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  )
}

export function Segmented<T extends string>({ value, onChange, options, tone }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; tone?: (v: T) => string }) {
  return (
    <div role="radiogroup" className="inline-flex p-0.5 rounded-1 bg-abyss border border-hairline">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn('px-3 py-1.5 t-body-sm font-medium rounded-[3px] transition-colors', active ? cn('bg-raised text-fg-1', tone?.(o.value)) : 'text-fg-3 hover:text-fg-1')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-1 bg-raised/70', className)} />
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel p-10 text-center">
      <p className="t-display-sm text-fg-1">{title}</p>
      {body && <p className="t-body-sm text-fg-3 mt-2 max-w-[40ch] mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="t-caption font-medium px-1.5 py-0.5 rounded-[4px] border border-hairline-strong text-fg-2">{children}</kbd>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h1 className="t-display-md text-fg-1">{title}</h1>
        {description && <p className="t-body-sm text-fg-3 mt-1 max-w-[60ch]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return <pre className={cn('codeblock m-0 p-3 text-fg-2 whitespace-pre-wrap break-words', className)}>{JSON.stringify(value, null, 2)}</pre>
}
