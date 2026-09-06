import { useState } from 'react'
import { PageHeader, Skeleton, Segmented } from '../../components/ui/Bits'
import { CallsOverTime, OutcomesDonut, TopTools } from '../../features/analytics/Charts'
import { useLoadouts, useOutcomes, useTimeseries, useTopTools } from '../../lib/hooks'
import { OverloadChip } from '../../features/loadouts/OverloadChip'

export default function Analytics() {
  const [range, setRange] = useState<'24' | '48'>('24')
  const series = useTimeseries(Number(range), range === '24' ? 60 : 120)
  const top = useTopTools()
  const outcomes = useOutcomes()
  const loadouts = useLoadouts()

  return (
    <>
      <PageHeader title="Analytics" description="Volume by outcome, the tools that carry the load, and how heavy each loadout is." actions={<Segmented value={range} onChange={setRange} options={[{ value: '24', label: '24 h' }, { value: '48', label: '48 h' }]} />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h2 className="t-title mb-4">Calls by outcome</h2>
          {series.data ? <CallsOverTime data={series.data} /> : <Skeleton className="h-[240px]" />}
        </section>
        <section className="panel p-5">
          <h2 className="t-title mb-4">Outcomes, all time</h2>
          {outcomes.data ? <OutcomesDonut data={outcomes.data} /> : <Skeleton className="h-[160px]" />}
        </section>
        <section className="panel p-5 lg:col-span-2">
          <h2 className="t-title mb-4">Top tools</h2>
          {top.data ? <TopTools data={top.data} /> : <Skeleton className="h-[200px]" />}
        </section>
        <section className="panel p-5">
          <h2 className="t-title mb-4">Overload by loadout</h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-3">
            {(loadouts.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                <div>
                  <div className="font-medium text-fg-1">{l.name}</div>
                  <div className="t-caption text-fg-3">
                    {l.overload.breakdown.schema_tokens.toLocaleString()} schema tokens, {l.overload.breakdown.unused_tools} unused
                  </div>
                </div>
                <OverloadChip score={l.overload.score} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
