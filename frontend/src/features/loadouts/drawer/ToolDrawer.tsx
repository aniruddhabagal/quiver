import { useState } from 'react'
import { Tabs } from 'radix-ui'
import { Trash2, Plus, X } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Field, Input, Textarea } from '../../../components/ui/Field'
import { Button } from '../../../components/ui/Button'
import { Segmented, Switch, JsonBlock } from '../../../components/ui/Bits'
import { useCanvasStore } from '../../../stores/canvas-store'
import { agentFacingTool, estimateTokens } from '../../../lib/tool-view'
import type { PolicyMode, Server, ToolSpec } from '../../../lib/types'
import { cn } from '../../../lib/cn'

const ALIAS_RE = /^[A-Za-z0-9_-]{1,64}$/

interface Props {
  spec: ToolSpec | null
  servers: Server[]
  onClose: () => void
}

const TAB_CLS = 'px-3 py-1.5 t-body-sm font-medium rounded-[3px] text-fg-3 data-[state=active]:bg-raised data-[state=active]:text-fg-1'

export function ToolDrawer({ spec, servers, onClose }: Props) {
  const update = useCanvasStore((s) => s.update)
  const updatePolicy = useCanvasStore((s) => s.updatePolicy)
  const remove = useCanvasStore((s) => s.remove)
  const others = useCanvasStore((s) => s.tools)
  const upstream = spec ? servers.find((s) => s.id === spec.server_id)?.manifest.tools.find((u) => u.name === spec.upstream_name) : undefined
  const props = upstream?.inputSchema.properties ?? {}
  const required = new Set(upstream?.inputSchema.required ?? [])
  const view = spec ? agentFacingTool(spec, upstream) : null
  const [testText, setTestText] = useState('Authorization: Bearer sk-live-0123456789abcdefghij')

  if (!spec) return <Modal open={false} onOpenChange={() => onClose()} title="">{null}</Modal>

  const aliasTaken = others.some((t) => t.id !== spec.id && t.alias === spec.alias)
  const aliasError = !ALIAS_RE.test(spec.alias) ? 'Letters, digits, dash and underscore, up to 64' : aliasTaken ? 'Another tool already uses this alias' : undefined
  const description = spec.description_override ?? upstream?.description ?? ''

  const redacted = (() => {
    try {
      return spec.policy.redact.reduce((s, r) => (r.pattern ? s.replace(new RegExp(r.pattern, 'g'), r.replacement || '••••') : s), testText)
    } catch {
      return 'Invalid pattern'
    }
  })()

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={spec.alias} description={`${servers.find((s) => s.id === spec.server_id)?.name ?? '?'} / ${spec.upstream_name}`} side>
      <Tabs.Root defaultValue="identity" className="flex flex-col gap-5">
        <Tabs.List className="inline-flex gap-1 p-0.5 rounded-1 bg-abyss border border-hairline self-start">
          <Tabs.Trigger value="identity" className={TAB_CLS}>Identity</Tabs.Trigger>
          <Tabs.Trigger value="arguments" className={TAB_CLS}>Arguments</Tabs.Trigger>
          <Tabs.Trigger value="policy" className={TAB_CLS}>Policy</Tabs.Trigger>
          <Tabs.Trigger value="preview" className={TAB_CLS}>Preview</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="identity" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 panel p-3.5">
            <div>
              <div className="t-body-sm font-medium text-fg-1">Exposed to the agent</div>
              <div className="t-caption text-fg-3">Off keeps the config but hides the tool.</div>
            </div>
            <Switch checked={spec.enabled} onCheckedChange={(v) => update(spec.id, { enabled: v })} />
          </div>
          <Field label="Alias" htmlFor="alias" hint="The name the agent calls." error={aliasError}>
            <Input id="alias" value={spec.alias} onChange={(e) => update(spec.id, { alias: e.target.value })} className="t-mono" />
          </Field>
          <Field label="Description" htmlFor="desc" hint={`${estimateTokens(description)} tokens. ${spec.description_override === null ? 'Using the upstream description.' : 'Rewritten.'}`}>
            <Textarea id="desc" value={description} onChange={(e) => update(spec.id, { description_override: e.target.value })} rows={5} />
          </Field>
          {spec.description_override !== null && (
            <button type="button" className="link t-body-sm self-start" onClick={() => update(spec.id, { description_override: null })}>
              Restore upstream description
            </button>
          )}
          <div className="pt-4 border-t border-hairline">
            <Button variant="danger" size="sm" onClick={() => { remove(spec.id); onClose() }}>
              <Trash2 size={14} /> Remove from loadout
            </Button>
          </div>
        </Tabs.Content>

        <Tabs.Content value="arguments" className="flex flex-col gap-3">
          <p className="t-body-sm text-fg-3">A preset pins a value and removes the argument from what the agent sees. Hidden arguments are dropped if the agent sends them.</p>
          {Object.keys(props).length === 0 && <p className="t-body-sm text-fg-4">This tool takes no arguments.</p>}
          {Object.entries(props).map(([name, p]) => {
            const preset = spec.presets[name]
            const hidden = spec.hidden_args.includes(name)
            const hasPreset = preset !== undefined
            return (
              <div key={name} className={cn('panel p-3.5 flex flex-col gap-2.5', (hasPreset || hidden) && 'border-arc/40')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <code className="t-mono text-fg-1">{name}</code>
                    <span className="t-caption text-fg-4 ml-2">{p.type ?? 'any'}{required.has(name) ? ', required' : ''}</span>
                    {p.description && <div className="t-caption text-fg-3 mt-0.5">{p.description}</div>}
                  </div>
                  <label className="flex items-center gap-2 t-caption text-fg-3 shrink-0">
                    hidden
                    <Switch
                      checked={hidden}
                      disabled={hasPreset}
                      onCheckedChange={(v) => update(spec.id, { hidden_args: v ? [...spec.hidden_args, name] : spec.hidden_args.filter((h) => h !== name) })}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={hidden ? 'hidden arguments cannot have presets' : 'preset value, leave blank for none'}
                    disabled={hidden}
                    className="t-mono"
                    value={hasPreset ? (typeof preset === 'string' ? preset : JSON.stringify(preset)) : ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      const next = { ...spec.presets }
                      if (raw === '') delete next[name]
                      else {
                        let v: unknown = raw
                        if (p.type === 'boolean') v = raw === 'true'
                        else if (p.type === 'integer' || p.type === 'number') v = Number(raw)
                        else {
                          try {
                            v = p.type === 'object' || p.type === 'array' ? JSON.parse(raw) : raw
                          } catch {
                            v = raw
                          }
                        }
                        next[name] = v
                      }
                      update(spec.id, { presets: next })
                    }}
                  />
                  {hasPreset && (
                    <Button variant="subtle" size="icon" aria-label="Clear preset" onClick={() => { const next = { ...spec.presets }; delete next[name]; update(spec.id, { presets: next }) }}>
                      <X size={14} />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </Tabs.Content>

        <Tabs.Content value="policy" className="flex flex-col gap-5">
          <div>
            <div className="t-body-sm font-medium text-fg-2 mb-2">Mode</div>
            <Segmented<PolicyMode>
              value={spec.policy.mode}
              onChange={(mode) => updatePolicy(spec.id, { mode })}
              options={[{ value: 'allow', label: 'Allow' }, { value: 'approve', label: 'Approve' }, { value: 'deny', label: 'Deny' }]}
              tone={(v) => (v === 'allow' ? 'text-allowed' : v === 'approve' ? 'text-held' : 'text-denied')}
            />
            <p className="t-caption text-fg-3 mt-2">
              {spec.policy.mode === 'allow' && 'Calls pass straight through, logged and redacted.'}
              {spec.policy.mode === 'approve' && 'Every call waits for a human. The agent gets the result or a refusal.'}
              {spec.policy.mode === 'deny' && 'The tool stays visible but every call is refused with an explanation.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rate limit, per minute" htmlFor="rl" hint="Blank for none.">
              <Input id="rl" type="number" min={1} value={spec.policy.rate_limit_per_min ?? ''} onChange={(e) => updatePolicy(spec.id, { rate_limit_per_min: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Timeout, seconds" htmlFor="to" hint="Blank uses the loadout default.">
              <Input id="to" type="number" min={1} value={spec.policy.timeout_s ?? ''} onChange={(e) => updatePolicy(spec.id, { timeout_s: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="t-body-sm font-medium text-fg-2">Redaction</div>
              <Button variant="subtle" size="sm" onClick={() => updatePolicy(spec.id, { redact: [...spec.policy.redact, { pattern: '', replacement: '••••' }] })}>
                <Plus size={14} /> Rule
              </Button>
            </div>
            <p className="t-caption text-fg-3">Regular expressions applied to arguments and text results before anything is stored, shown or forwarded.</p>
            {spec.policy.redact.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2">
                <Input className="t-mono" placeholder="pattern" value={r.pattern} onChange={(e) => updatePolicy(spec.id, { redact: spec.policy.redact.map((x, j) => (j === i ? { ...x, pattern: e.target.value } : x)) })} />
                <Input className="t-mono" placeholder="replacement" value={r.replacement} onChange={(e) => updatePolicy(spec.id, { redact: spec.policy.redact.map((x, j) => (j === i ? { ...x, replacement: e.target.value } : x)) })} />
                <Button variant="subtle" size="icon" aria-label="Remove rule" onClick={() => updatePolicy(spec.id, { redact: spec.policy.redact.filter((_, j) => j !== i) })}>
                  <X size={14} />
                </Button>
              </div>
            ))}
            {spec.policy.redact.length > 0 && (
              <div className="panel p-3 flex flex-col gap-2">
                <Input className="t-mono" value={testText} onChange={(e) => setTestText(e.target.value)} aria-label="Test text" />
                <code className="t-mono text-held break-all">{redacted}</code>
              </div>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="preview" className="flex flex-col gap-3">
          <p className="t-body-sm text-fg-3">Exactly what tools/list returns for this tool.</p>
          {view && <JsonBlock value={view} />}
        </Tabs.Content>
      </Tabs.Root>
    </Modal>
  )
}
