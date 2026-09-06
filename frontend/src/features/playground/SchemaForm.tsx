import type { JsonSchema } from '../../lib/types'
import { Field, Input, Textarea, NativeSelect } from '../../components/ui/Field'
import { Switch } from '../../components/ui/Bits'

interface Props {
  schema: JsonSchema
  value: Record<string, unknown>
  onChange: (v: Record<string, unknown>) => void
}

/** Renders the agent-facing schema as a form: what the agent would fill in. */
export function SchemaForm({ schema, value, onChange }: Props) {
  const props = schema.properties ?? {}
  const required = new Set(schema.required ?? [])
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })
  const keys = Object.keys(props)
  if (!keys.length) return <p className="t-body-sm text-fg-3">This tool takes no arguments.</p>
  return (
    <div className="flex flex-col gap-4">
      {keys.map((k) => {
        const p = props[k]
        const label = required.has(k) ? `${k} *` : k
        const id = `arg-${k}`
        if (p.enum) {
          return (
            <Field key={k} label={label} htmlFor={id} hint={p.description}>
              <NativeSelect id={id} value={String(value[k] ?? '')} onChange={(e) => set(k, e.target.value)}>
                <option value="">choose</option>
                {p.enum.map((o) => (
                  <option key={String(o)} value={String(o)}>
                    {String(o)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )
        }
        if (p.type === 'boolean') {
          return (
            <div key={k} className="flex items-center justify-between gap-4">
              <div>
                <div className="t-body-sm font-medium text-fg-2">{label}</div>
                {p.description && <div className="t-caption text-fg-3">{p.description}</div>}
              </div>
              <Switch id={id} checked={Boolean(value[k])} onCheckedChange={(v) => set(k, v)} />
            </div>
          )
        }
        if (p.type === 'integer' || p.type === 'number') {
          return (
            <Field key={k} label={label} htmlFor={id} hint={p.description}>
              <Input id={id} type="number" value={value[k] === undefined ? '' : String(value[k])} onChange={(e) => set(k, e.target.value === '' ? undefined : Number(e.target.value))} />
            </Field>
          )
        }
        if (p.type === 'object' || p.type === 'array') {
          return (
            <Field key={k} label={label} htmlFor={id} hint={p.description ?? 'JSON'}>
              <Textarea
                id={id}
                className="t-mono"
                value={typeof value[k] === 'string' ? (value[k] as string) : value[k] === undefined ? '' : JSON.stringify(value[k], null, 2)}
                onChange={(e) => {
                  try {
                    set(k, JSON.parse(e.target.value))
                  } catch {
                    set(k, e.target.value)
                  }
                }}
              />
            </Field>
          )
        }
        const long = /body|description|text|content|sql|script|jql/i.test(k)
        return (
          <Field key={k} label={label} htmlFor={id} hint={p.description}>
            {long ? <Textarea id={id} value={String(value[k] ?? '')} onChange={(e) => set(k, e.target.value)} /> : <Input id={id} value={String(value[k] ?? '')} onChange={(e) => set(k, e.target.value)} />}
          </Field>
        )
      })}
    </div>
  )
}
