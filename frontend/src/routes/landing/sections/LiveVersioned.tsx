import { Section } from '../Section'
import { LiveFeedMock } from '../mocks/LiveFeedMock'
import { VersionDiffMock } from '../mocks/VersionDiffMock'

export function LiveVersioned() {
  return (
    <Section
      id="live"
      rule
      title="Every call streamed. Every change diffed."
      lede="Calls arrive over a WebSocket as they happen, stamped with their outcome. Each save of a loadout is a version you can diff, and roll back to, when an agent starts behaving oddly."
    >
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] items-start" data-reveal-stagger>
        <LiveFeedMock />
        <VersionDiffMock />
      </div>
    </Section>
  )
}
