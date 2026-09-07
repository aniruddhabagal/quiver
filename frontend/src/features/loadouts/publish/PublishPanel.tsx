import { useState } from 'react'
import { History, Rocket, Save, Undo2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Bits'
import { Modal } from '../../../components/ui/Modal'
import { EndpointBlock } from '../../../components/brand/EndpointBlock'
import { EndpointPanel } from './EndpointPanel'
import { useCanvasStore } from '../../../stores/canvas-store'
import { usePublish, useRollback, useSaveTools, useVersions, useDiff } from '../../../lib/hooks'
import { relTime } from '../../../lib/format'
import type { Loadout } from '../../../lib/types'
import { toast } from 'sonner'

export function PublishPanel({ loadout, endpointUrl, onPublishing }: { loadout: Loadout; endpointUrl: string; onPublishing: () => void }) {
  const { tools, dirty, markSaved, discard } = useCanvasStore()
  const save = useSaveTools(loadout.id)
  const publish = usePublish(loadout.id)
  const [history, setHistory] = useState(false)

  const aliasesOk = new Set(tools.map((t) => t.alias)).size === tools.length && tools.every((t) => /^[A-Za-z0-9_-]{1,64}$/.test(t.alias))

  const onSave = async () => {
    if (!aliasesOk) {
      toast.error('Fix duplicate or invalid aliases first.')
      return
    }
    const lo = await save.mutateAsync(tools)
    markSaved(lo.tools)
    toast.success(`Saved as v${lo.current_version}`)
  }

  const onPublish = async () => {
    if (dirty) await onSave()
    onPublishing()
    await publish.mutateAsync(!loadout.published)
    toast.success(loadout.published ? 'Unpublished. The endpoint now refuses calls.' : 'Published. The endpoint is live.')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {loadout.published ? <Badge tone="ion">published v{loadout.current_version}</Badge> : <Badge>draft v{loadout.current_version}</Badge>}
      {dirty && (
        <Button variant="subtle" size="sm" onClick={discard}>
          <Undo2 size={14} /> Discard
        </Button>
      )}
      <EndpointPanel loadout={loadout} endpointUrl={endpointUrl} />
      <Button variant="ghost" size="sm" onClick={() => setHistory(true)}>
        <History size={14} /> Versions
      </Button>
      <Button variant={dirty ? 'primary' : 'ghost'} size="sm" onClick={() => void onSave()} disabled={!dirty || save.isPending}>
        <Save size={14} /> {save.isPending ? 'Saving' : 'Save version'}
      </Button>
      <Button variant={loadout.published ? 'ghost' : 'primary'} size="sm" onClick={() => void onPublish()} disabled={publish.isPending}>
        <Rocket size={14} /> {loadout.published ? 'Unpublish' : 'Publish'}
      </Button>
      <VersionHistory open={history} onClose={() => setHistory(false)} loadout={loadout} endpointUrl={endpointUrl} />
    </div>
  )
}

function VersionHistory({ open, onClose, loadout, endpointUrl }: { open: boolean; onClose: () => void; loadout: Loadout; endpointUrl: string }) {
  const versions = useVersions(loadout.id)
  const rollback = useRollback(loadout.id)
  const [pick, setPick] = useState<[number, number] | null>(null)
  const [from, to] = pick ?? [Math.max(0, loadout.current_version - 1), loadout.current_version]
  const diff = useDiff(loadout.id, from, to)
  const load = useCanvasStore((s) => s.load)

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Versions" description="Every save is a version. Pick two to compare, or roll back." wide>
      <div className="grid gap-5 md:grid-cols-[16rem_1fr]">
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5 max-h-[24rem] overflow-auto pr-1">
          {(versions.data ?? []).map((v) => (
            <li key={v.id} className={`panel p-3 ${v.version === to ? 'border-arc/60' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-fg-1">v{v.version}</span>
                <span className="t-caption text-fg-3">{relTime(v.created_at)}</span>
              </div>
              <div className="t-caption text-fg-3 mt-1">
                {v.summary.added.length > 0 && <span className="text-allowed">+{v.summary.added.length} </span>}
                {v.summary.changed.length > 0 && <span className="text-held">~{v.summary.changed.length} </span>}
                {v.summary.removed.length > 0 && <span className="text-denied">-{v.summary.removed.length}</span>}
                {!v.summary.added.length && !v.summary.changed.length && !v.summary.removed.length && 'no changes'}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="link t-caption" onClick={() => setPick([Math.max(0, v.version - 1), v.version])}>
                  diff
                </button>
                {v.version !== loadout.current_version && (
                  <button
                    type="button"
                    className="link t-caption"
                    onClick={async () => {
                      const lo = await rollback.mutateAsync(v.version)
                      load(lo)
                      toast.success(`Rolled back to v${v.version} as v${lo.current_version}`)
                    }}
                  >
                    roll back
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4">
          <div className="codeblock p-4">
            <div className="t-caption text-fg-3 mb-2">
              v{from} to v{to}
            </div>
            {diff.data ? (
              <ul className="m-0 p-0 list-none flex flex-col gap-1">
                {diff.data.added.map((t) => (
                  <li key={t.id} className="text-allowed">+ {t.alias}</li>
                ))}
                {diff.data.changed.map((c) => (
                  <li key={c.alias} className="text-held">
                    ~ {c.alias} <span className="text-fg-3">{c.fields.join(', ')}</span>
                  </li>
                ))}
                {diff.data.removed.map((t) => (
                  <li key={t.id} className="text-denied">- {t.alias}</li>
                ))}
                {!diff.data.added.length && !diff.data.changed.length && !diff.data.removed.length && <li className="text-fg-4">identical</li>}
              </ul>
            ) : (
              <span className="text-fg-4">loading</span>
            )}
          </div>
          <EndpointBlock url={endpointUrl} label="Published at" glow={loadout.published} />
        </div>
      </div>
    </Modal>
  )
}
