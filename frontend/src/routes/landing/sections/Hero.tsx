import { Github } from 'lucide-react'
import { HeroCanvas } from '../hero/HeroCanvas'
import '../hero/hero.css'

const HEADLINE = 'Give your agent twelve tools, not two hundred.'
const ENDPOINT = 'https://quiver.aniruddha.fyi/mcp/ops-agent'

interface Props {
  active: boolean
}

export function Hero({ active }: Props) {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="hero-nebula pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[120vw] max-w-[1400px] h-[70vh] opacity-70" aria-hidden="true" />
      <div className="container relative">
        <h1 className="t-display-xl text-fg-1 max-w-[16ch]">
          {HEADLINE.split(' ').map((word, i) => (
            <span key={i} className="inline-block overflow-hidden align-bottom pr-[0.22em] last:pr-0">
              <span className="hero-word inline-block" data-hero>
                {word}
              </span>
            </span>
          ))}
        </h1>
        <p className="t-lede mt-7" data-hero>
          Quiver turns a sprawl of MCP servers into one curated, governed endpoint. Pick the tools,
          rewrite what the agent sees, set the rules, hand it a single URL.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3" data-hero>
          <a href="#how-it-works" className="btn btn-primary glow-cta">
            Try the live demo
          </a>
          <a
            href="https://github.com/aniruddhabagal/quiver"
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} />
            Star on GitHub
          </a>
        </div>
      </div>
      <div className="container relative mt-14 md:mt-20" data-hero>
        <HeroCanvas active={active} endpointUrl={ENDPOINT} />
      </div>
    </section>
  )
}
