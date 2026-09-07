import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { EndpointBlock } from '../../../components/brand/EndpointBlock'
import { useCreateKey, useKeys } from '../../../lib/hooks'
import type { Loadout } from '../../../lib/types'

/** Everything an agent needs: the URL, a scoped key, and the config to paste. */
export function EndpointPanel({ loadout, endpointUrl }: { loadout: Loadout; endpointUrl: string }) {
  const [open, setOpen] = useState(false)
  const [plaintext, setPlaintext] = useState<string | null>(null)
  const keys = useKeys()
  const create = useCreateKey()
  const scoped = (keys.data ?? []).filter((k) => k.scope.type === 'loadout' && k.scope.loadout_id === loadout.id && !k.revoked_at)

  const mint = async () => {
    const r = await create.mutateAsync({ name: `${loadout.slug}-key`, scope: { type: 'loadout', loadout_id: loadout.id } })
    setPlaintext(r.plaintext)
  }

  const snippet = JSON.stringify(
    {
      mcpServers: {
        [loadout.slug]: {
          type: 'http',
          url: endpointUrl,
          headers: { Authorization: `Bearer ${plaintext ?? 'qv_…your key…'}`, 'X-Agent-Name': 'my-agent' },
        },
      },
    },
    null,
    2,
  )

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Link2 size={14} /> Endpoint
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Hand this to the agent" description={loadout.published ? 'The endpoint is live.' : 'Publish the loadout before an agent can connect.'} wide>
        <div className="flex flex-col gap-5">
          <EndpointBlock url={endpointUrl} apiKey={plaintext ?? undefined} label="MCP endpoint, Streamable HTTP" glow={loadout.published} />
          <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="t-body-sm text-fg-2">
              {scoped.length ? `${scoped.length} key${scoped.length > 1 ? 's' : ''} scoped to this loadout.` : 'No key scoped to this loadout yet.'}
              {plaintext && <span className="text-held"> Copy the new key now, it is shown once.</span>}
            </div>
            <Button variant={scoped.length ? 'ghost' : 'primary'} size="sm" onClick={() => void mint()} disabled={create.isPending}>
              {create.isPending ? 'Creating' : 'Create a scoped key'}
            </Button>
          </div>
          <div>
            <div className="t-caption text-fg-3 mb-1.5">Claude Code, Cursor, or any client that takes a remote MCP server</div>
            <pre className="codeblock m-0 p-4 text-fg-2 whitespace-pre-wrap break-all">{snippet}</pre>
          </div>
        </div>
      </Modal>
    </>
  )
}
