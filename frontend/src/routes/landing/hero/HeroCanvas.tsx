import { useEffect, useMemo, useState } from 'react'
import { buildLayout } from './layout'
import { usePulses } from './usePulses'
import { reducedMotion } from '../../../lib/motion'
import { cn } from '../../../lib/cn'

interface Props {
  /** Intro finished; start traffic and light the cartridge. */
  active: boolean
  endpointUrl: string
  className?: string
}

const OUTCOME_COLOR = {
  allowed: 'var(--color-allowed)',
  held: 'var(--color-held)',
  denied: 'var(--color-denied)',
} as const

const STAMP_TEXT = { allowed: 'ALLOWED', held: 'HELD', denied: 'DENIED' } as const

/** Compact chips are 116 units wide; mono at 11 fits about 15 characters. */
function fit(name: string, compact: boolean) {
  if (!compact || name.length <= 15) return name
  return `${name.slice(0, 14)}…`
}

function useCompact() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = (e: MediaQueryListEvent) => setCompact(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return compact
}

function useVisible(el: Element | null) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [el])
  return visible
}

/**
 * The page's signature: many tools on the left, twelve of them lit, wires
 * converging into the cartridge, one wire out to a single endpoint. Live
 * pulses show calls being allowed, held, or denied.
 */
export function HeroCanvas({ active, endpointUrl, className }: Props) {
  const compact = useCompact()
  const layout = useMemo(() => buildLayout(compact), [compact])
  const [root, setRoot] = useState<SVGSVGElement | null>(null)
  const visible = useVisible(root)
  const { pulses, stamps } = usePulses(layout, active && visible && !reducedMotion)
  const { cartridge: c, endpoint: e } = layout
  const chamfer = 12

  const cartridgePath = `M ${c.x + chamfer} ${c.y} H ${c.x + c.w} V ${c.y + c.h - chamfer} L ${c.x + c.w - chamfer} ${c.y + c.h} H ${c.x} V ${c.y + chamfer} Z`
  const parked = pulses.filter((p) => p.phase === 'park')

  return (
    <svg
      ref={setRoot}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={cn('hero-canvas w-full h-auto block', active && 'is-active', className)}
      role="img"
      aria-label="Diagram: tools from six MCP servers flow into a curated quiver and out through a single endpoint, with calls being allowed, held or denied."
    >
      <defs>
        <filter id="glow-arc" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-pulse" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="wire-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-arc)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--color-arc)" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* servers */}
      {layout.servers.map((s) => (
        <g key={s.server.id} className="hero-server">
          <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="4" fill="var(--color-panel)" stroke="var(--color-hairline)" />
          <circle cx={s.x + 13} cy={s.y + s.h / 2} r="3" fill="var(--color-allowed)" opacity="0.9" />
          <text
            x={s.x + 24}
            y={s.y + s.h / 2 + 4}
            fill="var(--color-fg-2)"
            fontFamily="var(--font-mono)"
            fontSize={compact ? 12 : 12.5}
          >
            {s.server.name}
          </text>
        </g>
      ))}

      {/* tools */}
      {layout.tools.map((r, i) => (
        <g key={r.tool.id + i} className={cn('hero-tool', r.tool.lit && 'is-lit')} opacity={r.tool.lit ? 1 : compact ? 0.7 : 0.45}>
          {compact ? (
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx="3"
              fill={r.tool.lit ? 'rgba(124,108,255,0.12)' : 'var(--color-abyss)'}
              stroke={r.tool.lit ? 'var(--color-arc)' : 'var(--color-hairline)'}
            />
          ) : (
            <rect
              x={r.x - 8}
              y={r.y + 7}
              width="6"
              height="8"
              fill={r.tool.lit ? 'var(--color-arc)' : 'var(--color-fg-4)'}
              transform={`rotate(45 ${r.x - 5} ${r.y + 11})`}
            />
          )}
          <text
            x={compact ? r.x + 8 : r.x + 4}
            y={compact ? r.y + r.h / 2 + 4 : r.y + r.h / 2 + 4}
            fill={r.tool.lit ? 'var(--color-fg-1)' : 'var(--color-fg-4)'}
            fontFamily="var(--font-mono)"
            fontSize={compact ? 11 : 12}
          >
            {fit(r.tool.name, compact)}
          </text>
        </g>
      ))}

      {/* wires from lit tools */}
      <g className="hero-wires" fill="none">
        {layout.tools.map((r, i) =>
          r.tool.lit ? (
            <path
              key={r.tool.id}
              d={layout.wirePath(i)}
              className="wire"
              stroke="url(#wire-grad)"
              strokeWidth="1.25"
              pathLength="1"
              strokeDasharray="1"
            />
          ) : null,
        )}
        <path
          d={layout.outPath}
          className="wire wire-out"
          stroke="var(--color-ion)"
          strokeWidth="1.75"
          strokeOpacity="0.9"
          pathLength="1"
          strokeDasharray="1"
        />
      </g>

      {/* cartridge */}
      <g className="cartridge">
        <path d={cartridgePath} fill="var(--color-slate)" stroke="var(--color-arc)" strokeWidth="1.5" className="cartridge-body" />
        <path d={cartridgePath} fill="none" stroke="var(--color-arc)" strokeWidth="1.5" className="cartridge-halo" filter="url(#glow-arc)" />
        <line x1={c.x + 16} x2={c.x + c.w - 16} y1={c.y + 46} y2={c.y + 46} stroke="var(--color-hairline-strong)" />
        <text x={c.cx} y={c.y + 30} textAnchor="middle" fill="var(--color-fg-1)" fontFamily="var(--font-display)" fontWeight="600" fontSize="17">
          ops-agent
        </text>
        <text x={c.cx} y={c.y + 78} textAnchor="middle" fill="var(--color-arc-bright)" fontFamily="var(--font-display)" fontWeight="600" fontSize="34">
          {layout.litCount}
        </text>
        <text x={c.cx} y={c.y + 98} textAnchor="middle" fill="var(--color-fg-2)" fontFamily="var(--font-sans)" fontSize="12">
          tools exposed
        </text>
        <text x={c.cx} y={c.y + c.h - 40} textAnchor="middle" fill="var(--color-allowed)" fontFamily="var(--font-display)" fontWeight="600" fontSize="22">
          27
        </text>
        <text x={c.cx} y={c.y + c.h - 22} textAnchor="middle" fill="var(--color-fg-3)" fontFamily="var(--font-sans)" fontSize="11.5">
          overload score
        </text>
      </g>

      {/* endpoint */}
      <g className="hero-endpoint">
        <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="4" fill="var(--color-abyss)" stroke="var(--color-ion)" strokeOpacity="0.6" />
        <rect x={e.x} y={e.y + 10} width="2" height={e.h - 20} fill="var(--color-ion)" />
        <text x={e.x + 14} y={e.y + 22} fill="var(--color-fg-3)" fontFamily="var(--font-sans)" fontSize="11">
          one endpoint for the agent
        </text>
        <text x={e.x + 14} y={e.y + 44} fill="var(--color-ion-bright)" fontFamily="var(--font-mono)" fontSize={compact ? 11.5 : 12.5}>
          {endpointUrl}
        </text>
      </g>

      {/* parked approvals at the cartridge mouth */}
      {parked.map((p, k) => {
        const x = layout.parkAt.x + (compact ? (k - (parked.length - 1) / 2) * 26 : 0)
        const y = layout.parkAt.y + (compact ? 0 : (k - (parked.length - 1) / 2) * 26)
        return (
          <g key={`park-${p.id}`}>
            <circle cx={x} cy={y} r="4" fill="var(--color-held)" filter="url(#glow-pulse)" />
            <circle
              cx={x}
              cy={y}
              r="10"
              fill="none"
              stroke="var(--color-held)"
              strokeWidth="1.5"
              strokeDasharray="62.8"
              className="park-ring"
              transform={`rotate(-90 ${x} ${y})`}
            />
          </g>
        )
      })}

      {/* travelling pulses (SMIL: begins on insertion, no per-frame JS) */}
      {pulses.map((p) => {
        if (p.phase === 'in') {
          return (
            <circle key={`in-${p.id}`} r="4" fill="var(--color-arc-bright)" filter="url(#glow-pulse)">
              <animateMotion dur="1.3s" fill="freeze" path={layout.wirePath(p.toolIdx)} calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
            </circle>
          )
        }
        if (p.phase === 'out') {
          return (
            <circle key={`out-${p.id}`} r="4" fill="var(--color-ion-bright)" filter="url(#glow-pulse)">
              <animateMotion dur="0.9s" fill="freeze" path={layout.outPath} calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
            </circle>
          )
        }
        if (p.phase === 'flash') {
          const at = compact ? { x: c.cx, y: c.y } : { x: c.x, y: c.cy }
          return (
            <circle key={`flash-${p.id}`} cx={at.x} cy={at.y} r="5" fill="var(--color-denied)" className="pulse-flash" style={{ transformOrigin: `${at.x}px ${at.y}px` }} />
          )
        }
        return null
      })}

      {/* outcome stamps */}
      {stamps.map((s, k) => {
        const w = 74
        const x = layout.stampAt.x - w / 2
        const y = layout.stampAt.y - 11 - k * 26
        return (
          <g key={`stamp-${s.id}`} className="svg-stamp" style={{ transformOrigin: `${layout.stampAt.x}px ${layout.stampAt.y}px` }}>
            <path
              d={`M ${x + 5} ${y} H ${x + w} V ${y + 17} L ${x + w - 5} ${y + 22} H ${x} V ${y + 5} Z`}
              fill="var(--color-void)"
              stroke={OUTCOME_COLOR[s.outcome]}
            />
            <text x={x + w / 2} y={y + 15} textAnchor="middle" fill={OUTCOME_COLOR[s.outcome]} fontFamily="var(--font-display)" fontWeight="600" fontSize="10.5" letterSpacing="0.08em">
              {STAMP_TEXT[s.outcome]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
