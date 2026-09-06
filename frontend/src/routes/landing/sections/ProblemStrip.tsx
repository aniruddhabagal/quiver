import { Section } from '../Section'

/** One wide bar, before and after. Not a stats grid. */
export function ProblemStrip() {
  return (
    <Section
      id="problem"
      tone="abyss"
      rule
      title="Tool sprawl is the new prompt bloat."
      lede="Every MCP server you connect hands the agent its entire catalogue. Schemas eat context, near-duplicate names cause wrong picks, and the tools that matter drown. Curation is the fix, and nobody has a place to do it."
    >
      <div className="grid gap-4 md:grid-cols-[3fr_2fr] items-stretch" data-reveal-stagger>
        <div className="panel p-6 md:p-8 relative overflow-hidden">
          <div className="t-caption text-fg-3 mb-3">Raw, every server connected</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-baseline">
            <Figure value="200" label="tools in context" tone="denied" />
            <Figure value="41k" label="schema tokens per turn" tone="denied" />
            <Figure value="3" label="the agent actually needs" tone="fg" />
          </div>
          <Bar segments={[{ w: 92, color: 'var(--color-fg-4)' }, { w: 8, color: 'var(--color-arc)' }]} />
          <p className="t-body-sm text-fg-3 mt-3">The three useful tools are the thin violet sliver.</p>
        </div>
        <div className="panel p-6 md:p-8 border-arc/40">
          <div className="t-caption text-fg-3 mb-3">Through a Quiver loadout</div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-baseline">
            <Figure value="12" label="tools exposed" tone="arc" />
            <Figure value="2.1k" label="schema tokens" tone="arc" />
          </div>
          <Bar segments={[{ w: 100, color: 'var(--color-arc)' }]} />
          <p className="t-body-sm text-fg-3 mt-3">Every one named, described and governed on purpose.</p>
        </div>
      </div>
      <p className="t-caption text-fg-4 mt-4">Figures from an example loadout across six servers.</p>
    </Section>
  )
}

function Figure({ value, label, tone }: { value: string; label: string; tone: 'denied' | 'arc' | 'fg' }) {
  const color = tone === 'denied' ? 'text-denied' : tone === 'arc' ? 'text-arc-bright' : 'text-fg-1'
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-display font-semibold text-[2rem] leading-none ${color}`}>{value}</span>
      <span className="t-body-sm text-fg-2">{label}</span>
    </div>
  )
}

function Bar({ segments }: { segments: { w: number; color: string }[] }) {
  return (
    <div className="mt-5 h-2 w-full flex gap-px rounded-[2px] overflow-hidden" aria-hidden="true">
      {segments.map((s, i) => (
        <span key={i} style={{ width: `${s.w}%`, background: s.color }} />
      ))}
    </div>
  )
}
