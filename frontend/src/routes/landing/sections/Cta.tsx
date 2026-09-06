import { Github } from 'lucide-react'
import { Section } from '../Section'

const ONE_LINER = 'git clone https://github.com/aniruddhabagal/quiver && cd quiver && docker compose up'

export function Cta() {
  return (
    <Section id="get-started" rule title="One URL. Guardrails baked in." lede="Open source, MIT licensed, self-hosted with a single compose file. Bring your MCP servers.">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-center" data-reveal-stagger>
        <a href="https://github.com/aniruddhabagal/quiver" className="btn btn-primary glow-cta" target="_blank" rel="noreferrer">
          <Github size={16} />
          View on GitHub
        </a>
        <pre className="codeblock m-0 px-4 py-3 text-fg-2">
          <code>{ONE_LINER}</code>
        </pre>
      </div>
    </Section>
  )
}
