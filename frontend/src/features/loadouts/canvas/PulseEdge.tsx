import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'

export interface Pulse {
  id: string
  tone: 'arc' | 'ion' | 'held' | 'denied' | 'allowed'
}

export interface PulseEdgeData extends Record<string, unknown> {
  tone: 'arc' | 'ion' | 'held' | 'denied' | 'off'
  pulses?: Pulse[]
}

const STROKE = {
  arc: 'rgba(124,108,255,0.55)',
  ion: 'rgba(46,230,214,0.75)',
  held: 'rgba(255,181,71,0.5)',
  denied: 'rgba(255,77,125,0.45)',
  off: 'rgba(150,140,255,0.15)',
}
const DOT = {
  arc: 'var(--color-arc-bright)',
  ion: 'var(--color-ion-bright)',
  held: 'var(--color-held)',
  denied: 'var(--color-denied)',
  allowed: 'var(--color-allowed)',
}

/** A wire that carries live calls as dots animated along its path in CSS. */
export const PulseEdge = memo(function PulseEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<Edge<PulseEdgeData>>) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const tone = data?.tone ?? 'arc'
  const pulses = data?.pulses ?? []
  return (
    <>
      <BaseEdge path={path} style={{ stroke: STROKE[tone], strokeWidth: tone === 'ion' ? 1.75 : 1.25, strokeDasharray: tone === 'off' ? '4 4' : undefined }} />
      {pulses.map((p) => (
        <circle key={p.id} r="4" fill={DOT[p.tone]} className="qpulse" style={{ offsetPath: `path('${path}')` }} />
      ))}
    </>
  )
})

export const QuietEdge = memo(function QuietEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return <BaseEdge path={path} style={{ stroke: 'rgba(150,140,255,0.22)', strokeWidth: 1 }} />
})

export const edgeTypes = { pulse: PulseEdge, quiet: QuietEdge }
