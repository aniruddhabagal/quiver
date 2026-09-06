import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Play } from 'lucide-react'
import { PageHeader, JsonBlock, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { NativeSelect } from '../../components/ui/Field'
import { SchemaForm } from '../../features/playground/SchemaForm'
import { CallStatusStamp } from '../../features/calls/CallStatusStamp'
import { useLoadouts, usePlaygroundCall, useServers } from '../../lib/hooks'
import { agentFacingTool } from '../../lib/tool-view'
import { fmtMs } from '../../lib/format'
import type { Call } from '../../lib/types'

export default function Playground() {
  const [params, setParams] = useSearchParams()
  const loadouts = useLoadouts()
  const servers = useServers()
  const loadoutId = params.get('loadout') ?? loadouts.data?.[0]?.id ?? ''
  const lo = loadouts.data?.find((l) => l.id === loadoutId)
  const enabled = useMemo(() => lo?.tools.filter((t) => t.enabled && t.policy.mode !== 'deny') ?? [], [lo])
  const [alias, setAlias] = useState('')
  const spec = enabled.find((t) => t.alias === alias) ?? enabled[0]
  const upstream = servers.data?.find((s) => s.id === spec?.server_id)?.manifest.tools.find((u) => u.name === spec?.upstream_name)
  const view = spec ? agentFacingTool(spec, upstream) : null
  // form state is keyed by the tool, so switching tools starts clean without an effect
  const [form, setForm] = useState<{ key: string; args: Record<string, unknown>; result: Call | null }>({ key: '', args: {}, result: null })
  const key = spec?.id ?? ''
  const args = form.key === key ? form.args : {}
  const result = form.key === key ? form.result : null
  const setArgs = (next: Record<string, unknown>) => setForm({ key, args: next, result: form.key === key ? form.result : null })
  const call = usePlaygroundCall(loadoutId)

  const run = async () => {
    if (!spec) return
    const r = await call.mutateAsync({ alias: spec.alias, arguments: args })
    setForm({ key, args, result: r })
  }

  return (
    <>
      <PageHeader title="Playground" description="Call a loadout's tools the way the agent would, through the same policy pipeline. Every run is logged." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] items-start">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect value={loadoutId} onChange={(e) => setParams({ loadout: e.target.value })} aria-label="Loadout">
              {(loadouts.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={spec?.alias ?? ''} onChange={(e) => setAlias(e.target.value)} aria-label="Tool">
              {enabled.map((t) => (
                <option key={t.id} value={t.alias}>
                  {t.alias}
                  {t.policy.mode === 'approve' ? ' (approve)' : ''}
                </option>
              ))}
            </NativeSelect>
          </div>
          {view ? (
            <div className="panel p-5 flex flex-col gap-5">
              <div>
                <div className="t-mono text-fg-1">{view.name}</div>
                <p className="t-body-sm text-fg-3 mt-1">{view.description || 'No description.'}</p>
              </div>
              <SchemaForm schema={view.inputSchema} value={args} onChange={setArgs} />
              <Button variant="primary" onClick={() => void run()} disabled={call.isPending}>
                <Play size={15} /> {call.isPending ? 'Running' : spec?.policy.mode === 'approve' ? 'Run, then wait for approval' : 'Run'}
              </Button>
              {spec && Object.keys(spec.presets).length > 0 && (
                <p className="t-caption text-fg-3">
                  Presets the agent never sees are added on the way out: {Object.keys(spec.presets).join(', ')}.
                </p>
              )}
            </div>
          ) : (
            <Skeleton className="h-40" />
          )}
        </div>
        <div className="panel p-5 min-h-[20rem]">
          {!result ? (
            <p className="t-body-sm text-fg-3">The response lands here, exactly as the agent would receive it.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <CallStatusStamp status={result.status} />
                <span className="t-mono text-fg-3">{fmtMs(result.duration_ms)}</span>
              </div>
              {result.error_message && <p className="t-body-sm text-denied">{result.error_message}</p>}
              <div>
                <div className="t-caption text-fg-3 mb-1.5">Arguments sent upstream</div>
                <JsonBlock value={result.args_redacted} />
              </div>
              <div>
                <div className="t-caption text-fg-3 mb-1.5">Result</div>
                {result.result_preview ? <pre className="codeblock m-0 p-3 text-fg-2 whitespace-pre-wrap">{result.result_preview}</pre> : <p className="t-body-sm text-fg-4">Empty.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
