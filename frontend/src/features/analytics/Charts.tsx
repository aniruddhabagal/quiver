import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { OutcomeSlice, TimeseriesPoint, TopTool } from '../../lib/types'

const C = {
  ok: '#46F2A0',
  held: '#FFB547',
  denied: '#FF4D7D',
  error: '#FFD84D',
  arc: '#7C6CFF',
  grid: 'rgba(150,140,255,0.1)',
  axis: '#6B668F',
}

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="panel px-3 py-2 t-mono-xs shadow-xl">
      {label && <div className="text-fg-3 mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-fg-2">{p.name}</span>
          <span className="text-fg-1 ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function CallsOverTime({ data }: { data: TimeseriesPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: new Date(d.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={C.grid} />
        <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(rows.length / 8) - 1)} />
        <YAxis tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgba(124,108,255,0.08)' }} />
        <Bar dataKey="ok" name="allowed" stackId="a" fill={C.ok} />
        <Bar dataKey="held" name="held" stackId="a" fill={C.held} />
        <Bar dataKey="denied" name="denied" stackId="a" fill={C.denied} />
        <Bar dataKey="error" name="error" stackId="a" fill={C.error} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TopTools({ data }: { data: TopTool[] }) {
  const rows = data.map((d) => ({ ...d, name: `${d.alias}` }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#A9A4D1', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgba(124,108,255,0.08)' }} />
        <Bar dataKey="calls" name="calls" fill={C.arc} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const OUTCOME_COLOR: Record<string, string> = {
  ok: C.ok,
  held_approved: '#7FF5EA',
  held_denied: '#FF7FA3',
  denied: C.denied,
  rate_limited: '#C84D7A',
  expired: C.held,
  error: C.error,
}

export function OutcomesDonut({ data }: { data: OutcomeSlice[] }) {
  const total = data.reduce((n, d) => n + d.count, 0)
  return (
    <div className="flex items-center gap-6">
      <div className="w-[160px] h-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.status} fill={OUTCOME_COLOR[d.status] ?? C.arc} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-1.5 t-mono-xs flex-1">
        {data
          .slice()
          .sort((a, b) => b.count - a.count)
          .map((d) => (
            <li key={d.status} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: OUTCOME_COLOR[d.status] }} />
              <span className="text-fg-2">{d.status.replace('_', ' ')}</span>
              <span className="text-fg-1 ml-auto">{total ? Math.round((d.count / total) * 100) : 0}%</span>
            </li>
          ))}
      </ul>
    </div>
  )
}
