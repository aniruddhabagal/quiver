import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { Skeleton, StatusDot } from '../../components/ui/Bits'
import { Input } from '../../components/ui/Field'
import { QuiverCanvas } from '../../features/loadouts/canvas/QuiverCanvas'
import { usePulses } from '../../features/loadouts/canvas/usePulses'
import { ToolDrawer } from '../../features/loadouts/drawer/ToolDrawer'
import { PublishPanel } from '../../features/loadouts/publish/PublishPanel'
import { OverloadChip } from '../../features/loadouts/OverloadChip'
import { useLoadout, useServers } from '../../lib/hooks'
import { useCanvasStore } from '../../stores/canvas-store'
import { recomputeOverload } from '../../lib/overload'
import { API_URL } from '../../lib/api'
import { cn } from '../../lib/cn'

export default function LoadoutEditor() {
  const { id = '' } = useParams()
  const loadout = useLoadout(id)
  const servers = useServers()
  const { loadoutId, tools, dirty, selectedId, select, add, load } = useCanvasStore()
  const [q, setQ] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (loadout.data && (loadoutId !== loadout.data.id || !dirty)) load(loadout.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadout.data?.id, loadout.data?.current_version, loadout.data?.published])

  const { byEdge, held } = usePulses(id, tools)
  const base = API_URL || 'https://quiver.aniruddha.fyi'
  const url = `${base}/mcp/${loadout.data?.slug ?? ''}`

  const overload = useMemo(() => {
    if (!loadout.data || !servers.data) return loadout.data?.overload.score ?? 0
    return recomputeOverload({ ...loadout.data, tools }, (t) => servers.data!.find((s) => s.id === t.server_id)?.manifest.tools.find((u) => u.name === t.upstream_name)).score
  }, [loadout.data, servers.data, tools])

  const meta = useMemo(
    () => ({ name: loadout.data?.name ?? '', overload, dirty, url, published: loadout.data?.published ?? false, held }),
    [loadout.data?.name, loadout.data?.published, overload, dirty, url, held],
  )

  const selected = tools.find((t) => t.id === selectedId) ?? null
  const inLoadout = new Set(tools.map((t) => `${t.server_id}:${t.upstream_name}`))

  if (loadout.isLoading || servers.isLoading) return <Skeleton className="h-[70vh]" />
  if (!loadout.data) return <p className="t-body-sm text-fg-3">This loadout doesn't exist.</p>

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/app/loadouts" className="link t-body-sm inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Loadouts
          </Link>
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="t-display-md text-fg-1 truncate">{loadout.data.name}</h1>
            <OverloadChip score={overload} />
          </div>
          <p className="t-body-sm text-fg-3 mt-1 max-w-[60ch]">{loadout.data.description || 'No description. The agent receives it as the server instructions.'}</p>
        </div>
        <PublishPanel
          loadout={loadout.data}
          endpointUrl={url}
          onPublishing={() => {
            setPublishing(true)
            window.setTimeout(() => setPublishing(false), 1100)
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[17rem_1fr] flex-1 min-h-[560px]">
        <aside className="panel flex flex-col overflow-hidden max-h-[70vh]">
          <div className="p-3 border-b border-hairline">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a tool" className="pl-8 py-1.5 t-body-sm" aria-label="Find a tool" />
            </div>
          </div>
          <div className="overflow-auto flex-1">
            {(servers.data ?? []).map((s) => {
              const matches = s.manifest.tools.filter((u) => !q || u.name.includes(q.toLowerCase()) || (u.description ?? '').toLowerCase().includes(q.toLowerCase()))
              if (!matches.length) return null
              return (
                <div key={s.id} className="border-b border-hairline last:border-b-0">
                  <div className="flex items-center gap-2 px-3 py-2 t-caption text-fg-3 sticky top-0 bg-panel">
                    <StatusDot status={s.status} /> {s.name}
                    <span className="ml-auto text-fg-4">{matches.length}</span>
                  </div>
                  <ul className="m-0 p-0 list-none pb-1">
                    {matches.map((u) => {
                      const used = inLoadout.has(`${s.id}:${u.name}`)
                      return (
                        <li key={u.name}>
                          <button
                            type="button"
                            disabled={used}
                            onClick={() => add(s.id, u)}
                            className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-left t-mono-xs transition-colors', used ? 'text-fg-4' : 'text-fg-2 hover:text-fg-1 hover:bg-glass')}
                            title={u.description}
                          >
                            <span className="truncate flex-1">{u.name}</span>
                            {used ? <span className="text-arc-bright t-caption">in</span> : <Plus size={12} className="shrink-0 opacity-70" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
            {servers.data?.length === 0 && (
              <p className="p-4 t-body-sm text-fg-3">
                No servers connected.{' '}
                <Link to="/app/servers" className="link">
                  Connect one
                </Link>{' '}
                to pick tools.
              </p>
            )}
          </div>
        </aside>

        <div className="min-h-[520px]">
          {tools.length === 0 ? (
            <div className="qcanvas grid place-items-center text-center p-8">
              <div>
                <p className="t-display-sm text-fg-1">Empty quiver.</p>
                <p className="t-body-sm text-fg-3 mt-2 max-w-[36ch]">Pick tools from the servers on the left. Twelve is a good number; two hundred is the problem.</p>
              </div>
            </div>
          ) : (
            <QuiverCanvas tools={tools} servers={servers.data ?? []} meta={meta} pulses={byEdge} selectedId={selectedId} onSelect={select} publishing={publishing} />
          )}
        </div>
      </div>

      <ToolDrawer spec={selected} servers={servers.data ?? []} onClose={() => select(null)} />
    </div>
  )
}
