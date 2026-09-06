import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { PageHeader, Badge, Skeleton } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, NativeSelect } from '../../components/ui/Field'
import { EndpointBlock } from '../../components/brand/EndpointBlock'
import { useCreateKey, useKeys, useLoadouts, useRevokeKey } from '../../lib/hooks'
import { relTime } from '../../lib/format'
import { API_URL } from '../../lib/api'

const schema = z.object({ name: z.string().min(1, 'Name it after the agent'), scope: z.string() })
type Form = z.infer<typeof schema>

export default function Keys() {
  const keys = useKeys()
  const loadouts = useLoadouts()
  const create = useCreateKey()
  const revoke = useRevokeKey()
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState<{ key: string; loadout?: string } | null>(null)
  const { register, handleSubmit, reset, formState } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { scope: 'account' } })

  const submit = handleSubmit(async (v) => {
    const r = await create.mutateAsync({ name: v.name, scope: v.scope === 'account' ? { type: 'account' } : { type: 'loadout', loadout_id: v.scope } })
    reset()
    setOpen(false)
    setReveal({ key: r.plaintext, loadout: loadouts.data?.find((l) => l.id === v.scope)?.slug })
  })

  const base = API_URL || 'https://quiver.aniruddha.fyi'

  return (
    <>
      <PageHeader
        title="API keys"
        description="Agents present a key as a bearer token. Scope a key to one loadout so it can never reach another."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Create key
          </Button>
        }
      />
      {keys.isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="t-caption text-fg-3">
                <th className="font-normal px-5 py-3">Key</th>
                <th className="font-normal px-3 py-3">Scope</th>
                <th className="font-normal px-3 py-3 hidden sm:table-cell">Last used</th>
                <th className="font-normal px-3 py-3 hidden md:table-cell">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(keys.data ?? []).map((k) => {
                const lo = loadouts.data?.find((l) => l.id === k.scope.loadout_id)
                return (
                  <tr key={k.id} className={`border-t border-hairline ${k.revoked_at ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-fg-1">{k.name}</div>
                      <code className="t-mono-xs text-fg-4">{k.prefix}••••••••</code>
                    </td>
                    <td className="px-3 py-3">{k.scope.type === 'account' ? <Badge>account</Badge> : <Badge tone="arc">{lo?.slug ?? 'loadout'}</Badge>}</td>
                    <td className="px-3 py-3 hidden sm:table-cell t-body-sm text-fg-3">{relTime(k.last_used_at)}</td>
                    <td className="px-3 py-3 hidden md:table-cell t-body-sm text-fg-3">{relTime(k.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      {k.revoked_at ? (
                        <span className="t-caption text-fg-4">revoked {relTime(k.revoked_at)}</span>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => confirm(`Revoke ${k.name}? Agents using it stop immediately.`) && revoke.mutate(k.id)}>
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Create a key"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={create.isPending}>
              Create
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Name" htmlFor="k-name" error={formState.errors.name?.message}>
            <Input id="k-name" placeholder="release-bot" {...register('name')} />
          </Field>
          <Field label="Scope" htmlFor="k-scope" hint="A loadout-scoped key only works against that endpoint.">
            <NativeSelect id="k-scope" {...register('scope')}>
              <option value="account">Whole account</option>
              {(loadouts.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </form>
      </Modal>

      <Modal open={!!reveal} onOpenChange={(o) => !o && setReveal(null)} title="Copy it now" description="This is the only time the key is shown.">
        {reveal && <EndpointBlock url={reveal.loadout ? `${base}/mcp/${reveal.loadout}` : `${base}/mcp/<loadout>`} apiKey={reveal.key} label="Endpoint and key" />}
      </Modal>
    </>
  )
}
