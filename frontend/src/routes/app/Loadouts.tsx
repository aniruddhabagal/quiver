import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { PageHeader, Badge, Skeleton, EmptyState } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { useCreateLoadout, useLoadouts } from '../../lib/hooks'
import { relTime } from '../../lib/format'
import { OverloadChip } from '../../features/loadouts/OverloadChip'

const schema = z.object({ name: z.string().min(2, 'Name it'), description: z.string().optional() })
type Form = z.infer<typeof schema>

export default function Loadouts() {
  const loadouts = useLoadouts()
  const create = useCreateLoadout()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) })

  const submit = handleSubmit(async (v) => {
    const lo = await create.mutateAsync(v)
    setOpen(false)
    nav(`/app/loadouts/${lo.id}`)
  })

  return (
    <>
      <PageHeader
        title="Loadouts"
        description="Each loadout is one virtual MCP server: a curated set of tools with its own endpoint, key and rules."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New loadout
          </Button>
        }
      />
      {loadouts.isLoading ? (
        <Skeleton className="h-48" />
      ) : !loadouts.data?.length ? (
        <EmptyState title="No loadouts yet" body="Start one, pick tools from your servers, publish it as an endpoint." action={<Button variant="primary" onClick={() => setOpen(true)}>New loadout</Button>} />
      ) : (
        <ul className="m-0 p-0 list-none grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loadouts.data.map((l) => {
            const enabled = l.tools.filter((t) => t.enabled)
            const approve = enabled.filter((t) => t.policy.mode === 'approve').length
            const deny = enabled.filter((t) => t.policy.mode === 'deny').length
            return (
              <li key={l.id}>
                <Link to={`/app/loadouts/${l.id}`} className="panel block p-5 no-underline hover:border-arc/50 transition-colors h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-[1.25rem] leading-none text-fg-1 truncate">{l.name}</div>
                      <div className="t-mono-xs text-fg-4 mt-1.5">/mcp/{l.slug}</div>
                    </div>
                    {l.published ? <Badge tone="ion">published</Badge> : <Badge>draft</Badge>}
                  </div>
                  <p className="t-body-sm text-fg-3 mt-3 line-clamp-2 min-h-[2.6em]">{l.description || 'No description yet.'}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="arc">{enabled.length} tools</Badge>
                    {approve > 0 && <Badge tone="held">{approve} need approval</Badge>}
                    {deny > 0 && <Badge tone="denied">{deny} denied</Badge>}
                    <OverloadChip score={l.overload.score} className="ml-auto" />
                  </div>
                  <div className="t-caption text-fg-4 mt-4">
                    v{l.current_version}, updated {relTime(l.updated_at)}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New loadout"
        description="Name it after the agent that will hold it."
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
          <Field label="Name" htmlFor="l-name" error={formState.errors.name?.message}>
            <Input id="l-name" placeholder="release-agent" {...register('name')} />
          </Field>
          <Field label="Description" htmlFor="l-desc" hint="Sent to the agent as the server's instructions.">
            <Textarea id="l-desc" placeholder="What this agent is for, and what it must never do." {...register('description')} />
          </Field>
        </form>
      </Modal>
    </>
  )
}
