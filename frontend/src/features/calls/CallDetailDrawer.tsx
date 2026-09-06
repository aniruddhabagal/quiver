import { Modal } from '../../components/ui/Modal'
import { JsonBlock } from '../../components/ui/Bits'
import { CallStatusStamp } from './CallStatusStamp'
import { fmtMs, fmtTime } from '../../lib/format'
import type { Call } from '../../lib/types'
import { Link } from 'react-router'

export function CallDetailDrawer({ call, onClose }: { call: Call | null; onClose: () => void }) {
  return (
    <Modal open={!!call} onOpenChange={(o) => !o && onClose()} title={call?.alias ?? ''} description={call ? `${call.server_name} / ${call.upstream_name}` : undefined} side>
      {call && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <CallStatusStamp status={call.status} />
            <span className="t-body-sm text-fg-3">
              {fmtTime(call.started_at)} by {call.agent} via{' '}
              <Link to={`/app/loadouts/${call.loadout_id}`} className="link">
                {call.loadout_slug}
              </Link>
            </span>
            {call.duration_ms !== null && <span className="t-mono text-fg-2 ml-auto">{fmtMs(call.duration_ms)}</span>}
          </div>
          {call.error_message && <p className="t-body-sm text-denied">{call.error_message}</p>}
          <section>
            <h3 className="t-caption text-fg-3 mb-1.5">Arguments as sent upstream, redacted</h3>
            <JsonBlock value={call.args_redacted} />
          </section>
          <section>
            <h3 className="t-caption text-fg-3 mb-1.5">Result preview{call.result_size ? `, ${call.result_size.toLocaleString()} bytes` : ''}</h3>
            {call.result_preview ? <pre className="codeblock m-0 p-3 text-fg-2 whitespace-pre-wrap break-words">{call.result_preview}</pre> : <p className="t-body-sm text-fg-4">No result.</p>}
          </section>
          <section>
            <h3 className="t-caption text-fg-3 mb-1.5">Policy trace</h3>
            <ol className="m-0 p-0 list-none flex flex-col gap-1">
              {call.policy_trace.map((line, i) => (
                <li key={i} className="t-mono text-fg-2 flex gap-3">
                  <span className="text-fg-4 select-none">{i + 1}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>
          {call.approval_id && (
            <Link to={`/app/approvals/${call.approval_id}`} className="link t-body-sm">
              Open the approval record
            </Link>
          )}
        </div>
      )}
    </Modal>
  )
}
