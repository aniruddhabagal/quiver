import { Section } from '../Section'
import { ApprovalCardMock } from '../mocks/ApprovalCardMock'

const POLICIES = [
  { chip: 'allow', tone: 'text-allowed border-allowed/50', copy: 'Passes straight through. Still logged, still redacted.' },
  { chip: 'approve', tone: 'text-held border-held/50', copy: 'The call waits. You get a card here and in Slack. Two minutes, then it expires.' },
  { chip: 'deny', tone: 'text-denied border-denied/50', copy: 'Returns a plain refusal so the agent stops trying and explains itself.' },
  { chip: '30 / min', tone: 'text-fg-1 border-hairline-strong', copy: 'Rate limits per tool. The thirty-first call is refused, not queued.' },
  { chip: 'sk-[A-Za-z0-9]{20,}', tone: 'text-fg-1 border-hairline-strong', copy: 'Redaction runs on arguments and results before anything is stored or shown.' },
  { chip: '8 s timeout', tone: 'text-fg-1 border-hairline-strong', copy: 'Slow upstreams fail fast instead of stalling the agent.' },
]

export function Guardrails() {
  return (
    <Section
      id="guardrails"
      tone="abyss"
      rule
      title="Dangerous calls wait for a human."
      lede="Policies live on the tool, not in the prompt. Mark a tool approve and every call to it pauses until someone with a pulse says go."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] items-start" data-reveal-stagger>
        <ApprovalCardMock />
        <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2">
          {POLICIES.map((p) => (
            <li key={p.chip} className="flex flex-col gap-2 py-3 border-t border-hairline">
              <code className={`t-mono self-start px-2 py-0.5 border rounded-1 ${p.tone}`}>{p.chip}</code>
              <span className="t-body-sm text-fg-2">{p.copy}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
