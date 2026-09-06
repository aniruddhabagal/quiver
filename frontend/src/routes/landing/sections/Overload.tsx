import { Section } from '../Section'
import { OverloadMeter } from '../../../components/brand/OverloadMeter'

const BREAKDOWN = [
  { label: 'Schema tokens per turn', value: '2,140', weight: 34 },
  { label: 'Tools unused in the last 7 days', value: '2 of 12', weight: 22 },
  { label: 'Near-duplicate names', value: '1 pair', weight: 12 },
  { label: 'Average description length', value: '84 chars', weight: 8 },
]

export function Overload() {
  return (
    <Section
      id="overload"
      tone="abyss"
      rule
      title="Know when your agent is overloaded."
      lede="Every loadout gets a score from 0 to 100 built from schema weight, unused tools, and names that collide. Under 35 is lean. Over 70 and the agent is guessing."
    >
      <div className="max-w-[44rem]" data-reveal>
        <OverloadMeter score={27} breakdown={BREAKDOWN} />
      </div>
    </Section>
  )
}
