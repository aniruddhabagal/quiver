import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { PageHeader, StatusDot, Skeleton, EmptyState, Badge, Tip } from '../../components/ui/Bits'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, NativeSelect } from '../../components/ui/Field'
import { useCreateServer, useDeleteServer, useProbeServer, useServers } from '../../lib/hooks'
import { relTime, fmtMs } from '../../lib/format'
import type { Server } from '../../lib/types'

const schema = z.object({
  name: z.string().min(1, 'Give it a short name').regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes'),
  url: z.url('Needs a full URL'),
  transport: z.enum(['auto', 'streamable_http', 'sse']),
  auth_type: z.enum(['none', 'bearer', 'api_key_header', 'basic']),
  header_name: z.string().optional(),
  value: z.string().optional(),
})
type Form = z.infer<typeof schema>

function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateServer()
  const { register, handleSubmit, watch, reset, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { transport: 'auto', auth_type: 'none' },
  })
  const authType = watch('auth_type')
  const submit = handleSubmit(async (v) => {
    await create.mutateAsync({ name: v.name, url: v.url, transport: v.transport, auth: { type: v.auth_type, header_name: v.header_name, value: v.value } })
    reset()
    onOpenChange(false)
  })
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Connect a server"
      description="A remote MCP server over Streamable HTTP or SSE. Quiver fetches its tools and keeps the credential encrypted."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={create.isPending}>
            {create.isPending ? 'Connecting' : 'Connect'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" htmlFor="s-name" hint="Used as a prefix when you pick tools" error={formState.errors.name?.message}>
          <Input id="s-name" placeholder="github" {...register('name')} />
        </Field>
        <Field label="URL" htmlFor="s-url" error={formState.errors.url?.message}>
          <Input id="s-url" placeholder="https://mcp.example.com/mcp" {...register('url')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Transport" htmlFor="s-transport">
            <NativeSelect id="s-transport" {...register('transport')}>
              <option value="auto">Detect</option>
              <option value="streamable_http">Streamable HTTP</option>
              <option value="sse">SSE</option>
            </NativeSelect>
          </Field>
          <Field label="Auth" htmlFor="s-auth">
            <NativeSelect id="s-auth" {...register('auth_type')}>
              <option value="none">None</option>
              <option value="bearer">Bearer token</option>
              <option value="api_key_header">API key header</option>
              <option value="basic">HTTP basic</option>
            </NativeSelect>
          </Field>
        </div>
        {authType === 'api_key_header' && (
          <Field label="Header name" htmlFor="s-header">
            <Input id="s-header" placeholder="X-API-Key" {...register('header_name')} />
          </Field>
        )}
        {authType !== 'none' && (
          <Field label={authType === 'basic' ? 'user:password' : 'Secret'} htmlFor="s-secret" hint="Stored encrypted. Never shown again.">
            <Input id="s-secret" type="password" autoComplete="off" {...register('value')} />
          </Field>
        )}
      </form>
    </Modal>
  )
}

function ToolsDrawer({ server, onClose }: { server: Server | null; onClose: () => void }) {
  return (
    <Modal open={!!server} onOpenChange={(o) => !o && onClose()} title={server?.name ?? ''} description={server ? `${server.manifest.tools.length} tools, fetched ${relTime(server.manifest.fetched_at)}` : undefined} side>
      {server && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {server.manifest.tools.map((t) => (
            <li key={t.name} className="panel p-3.5">
              <div className="flex items-center justify-between gap-3">
                <code className="t-mono text-fg-1">{t.name}</code>
                <span className="t-caption text-fg-4">{Object.keys(t.inputSchema.properties ?? {}).length} args</span>
              </div>
              {t.description && <p className="t-body-sm text-fg-3 mt-1">{t.description}</p>}
            </li>
          ))}
          {server.manifest.tools.length === 0 && <li className="t-body-sm text-fg-3">{server.manifest.error ?? 'No tools yet.'}</li>}
        </ul>
      )}
    </Modal>
  )
}

export default function Servers() {
  const servers = useServers()
  const probe = useProbeServer()
  const del = useDeleteServer()
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<Server | null>(null)

  return (
    <>
      <PageHeader
        title="Servers"
        description="Every upstream MCP server Quiver can draw tools from."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Connect server
          </Button>
        }
      />
      {servers.isLoading ? (
        <Skeleton className="h-64" />
      ) : !servers.data?.length ? (
        <EmptyState title="No servers yet" body="Connect the MCP servers your agents already use. Quiver reads their tool lists and lets you curate from there." action={<Button variant="primary" onClick={() => setOpen(true)}>Connect a server</Button>} />
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="t-caption text-fg-3">
                <th className="font-normal px-5 py-3">Server</th>
                <th className="font-normal px-3 py-3 hidden md:table-cell">Transport</th>
                <th className="font-normal px-3 py-3">Tools</th>
                <th className="font-normal px-3 py-3 hidden sm:table-cell">Latency</th>
                <th className="font-normal px-3 py-3 hidden lg:table-cell">Probed</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {servers.data.map((s) => (
                <tr key={s.id} className="border-t border-hairline hover:bg-glass/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <StatusDot status={s.status} />
                      <div className="min-w-0">
                        <div className="font-medium text-fg-1">{s.name}</div>
                        <div className="t-mono-xs text-fg-4 truncate max-w-[26ch] sm:max-w-[40ch]">{s.url}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <Badge>{s.detected_transport === 'sse' ? 'sse' : 'streamable'}</Badge>
                    {s.auth.has_credentials && <Badge className="ml-1.5">auth</Badge>}
                  </td>
                  <td className="px-3 py-3">
                    <button type="button" className="link t-mono" onClick={() => setViewing(s)}>
                      {s.manifest.tools.length}
                    </button>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell t-mono text-fg-2">{fmtMs(s.last_probe.latency_ms)}</td>
                  <td className="px-3 py-3 hidden lg:table-cell t-body-sm text-fg-3">{relTime(s.last_probe.at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Tip label="Probe now">
                        <Button variant="subtle" size="icon" aria-label="Probe" onClick={() => probe.mutate(s.id)}>
                          <RefreshCw size={15} className={probe.isPending && probe.variables === s.id ? 'animate-spin' : ''} />
                        </Button>
                      </Tip>
                      <Tip label="Remove">
                        <Button
                          variant="subtle"
                          size="icon"
                          aria-label="Remove"
                          onClick={() => {
                            if (confirm(`Remove ${s.name}? Loadouts using its tools will lose them.`)) del.mutate(s.id)
                          }}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </Tip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConnectDialog open={open} onOpenChange={setOpen} />
      <ToolsDrawer server={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
